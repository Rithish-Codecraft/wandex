"""
OpenRouter LLM client.
All text generation, JSON generation, and embeddings go through OpenRouter.
No Gemini SDK or Google AI imports anywhere in this file.
"""
import json
import urllib.request
import urllib.error
from typing import List, Type
from pydantic import BaseModel
from backend.config import settings

OPENROUTER_BASE = "https://openrouter.ai/api/v1"

def _get_headers() -> dict:
    return {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "ResearchGPT"
    }

def _post(url: str, data: dict) -> dict:
    """POST JSON to OpenRouter and return the parsed response dict."""
    if not settings.OPENROUTER_API_KEY:
        raise ValueError(
            "OPENROUTER_API_KEY is not set. Please add it to your .env file."
        )
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers=_get_headers(),
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"OpenRouter HTTP {e.code} {e.reason}: {body}")

def _chat_with_fallback(messages: list, model: str = None, response_format: dict = None) -> str:
    """
    Sends a chat completion request, automatically trying fallback models
    (from settings.LLM_FALLBACK_MODELS) if the primary returns 429 or 404.
    Returns the assistant message content string.
    """
    primary = model or settings.LLM_MODEL
    fallbacks = [m.strip() for m in settings.LLM_FALLBACK_MODELS.split(",") if m.strip()]
    models_to_try = [primary] + [f for f in fallbacks if f != primary]

    last_error = None
    for m in models_to_try:
        try:
            payload = {"model": m, "messages": messages}
            if response_format:
                payload["response_format"] = response_format
            res = _post(f"{OPENROUTER_BASE}/chat/completions", payload)
            content = res["choices"][0]["message"]["content"]
            if m != primary:
                print(f"[OpenRouter] Used fallback model: {m}")
            return content
        except RuntimeError as e:
            err_str = str(e)
            # Only retry on rate-limit (429) or not-found (404) errors
            if "429" in err_str or "404" in err_str:
                print(f"[OpenRouter] Model {m} unavailable ({err_str[:80]}), trying next...")
                last_error = e
                continue
            raise  # Hard errors (401 auth, 400 bad request) — don't retry

    raise RuntimeError(
        f"All OpenRouter models exhausted. Last error: {last_error}"
    )

# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def generate_text(prompt: str, model_name: str = None) -> str:
    """Generates a plain-text response from OpenRouter."""
    return _chat_with_fallback(
        messages=[{"role": "user", "content": prompt}],
        model=model_name or settings.LLM_MODEL
    )

def generate_json(prompt: str, response_schema: Type[BaseModel], model_name: str = None) -> str:
    """
    Generates a structured JSON response conforming to the given Pydantic schema.
    Returns a raw JSON string ready to be passed to model_validate_json().
    """
    schema_desc = json.dumps(response_schema.model_json_schema(), indent=2)
    augmented_prompt = (
        f"{prompt}\n\n"
        "You MUST return a valid JSON object conforming exactly to this JSON schema. "
        "Return ONLY the JSON object — no markdown fences, no explanations, no extra text:\n"
        f"{schema_desc}\n"
    )
    return _chat_with_fallback(
        messages=[{"role": "user", "content": augmented_prompt}],
        model=model_name or settings.COMPARE_LLM_MODEL,
        response_format={"type": "json_object"}
    )

def get_embeddings(texts: List[str]) -> List[List[float]]:
    """Generates vector embeddings for a list of texts via OpenRouter."""
    if not texts:
        return []
    data = {"model": settings.EMBEDDING_MODEL, "input": texts}
    res = _post(f"{OPENROUTER_BASE}/embeddings", data)
    sorted_data = sorted(res["data"], key=lambda x: x["index"])
    return [item["embedding"] for item in sorted_data]

def get_embedding(text: str) -> List[float]:
    """Generates a single vector embedding via OpenRouter."""
    result = get_embeddings([text])
    return result[0] if result else []
