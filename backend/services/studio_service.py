import os
import time
from typing import List, Dict, Any
from pydantic import BaseModel, Field
from gtts import gTTS
from rag.vectorstore import VectorStore
from llm.gemini import generate_json
from backend.config import settings

class DialogueTurn(BaseModel):
    speaker: str = Field(description="Name of the host: 'Host A' or 'Host B'")
    text: str = Field(description="The sentence or two spoken by this host. Keep it engaging and natural.")

class PodcastScript(BaseModel):
    title: str = Field(description="A catchy title for this podcast episode")
    dialogue: List[DialogueTurn] = Field(description="A sequential list of conversation turns between Host A and Host B")

class SlideItem(BaseModel):
    title: str = Field(description="Slide header title")
    bullets: List[str] = Field(description="List of 3 key bullet points summarizing concepts")
    visual_suggestion: str = Field(description="Description of what diagram, chart, or visual layout to display on this slide")

class SlideshowDeck(BaseModel):
    presentation_title: str
    slides: List[SlideItem]

def generate_podcast_script(sources: List[str], vector_store: VectorStore = None) -> PodcastScript:
    if not vector_store:
        vector_store = VectorStore()

    text_data = []
    for source in sources:
        chunks = vector_store.get_document_chunks(source)
        if chunks:
            text_data.extend(chunks[:8])

    combined_text = "\n\n".join(text_data)[:35000]

    prompt = (
        "You are a professional podcast scriptwriter. Create an engaging, conversational, and informative "
        "dialogue script for a podcast episode where two expert hosts (Host A and Host B) break down and discuss the "
        "attached research documents. Host A should lead the conversation, ask questions, and set the stage. "
        "Host B should explain details, methodology, findings, and offer depth. Make the interaction dynamic, "
        "natural, and easy to follow. Generate a script of about 10-15 total dialogue turns. "
        "Return the output in the requested JSON structure.\n\n"
        f"Documents Content:\n{combined_text}"
    )

    try:
        json_res = generate_json(prompt, PodcastScript)
        return PodcastScript.model_validate_json(json_res)
    except Exception as e:
        print(f"Error generating script: {e}")
        return PodcastScript(
            title="Overview Episode",
            dialogue=[
                DialogueTurn(speaker="Host A", text="Welcome back. Today we are looking at some papers."),
                DialogueTurn(speaker="Host B", text="Yes, we have some interesting findings to discuss, but we ran into an error generating the script.")
            ]
        )

def generate_podcast_audio(sources: List[str], vector_store: VectorStore = None) -> Dict[str, Any]:
    """
    Generates a podcast script, synthesizes it into a single MP3 file by binary joining gTTS chunks,
    and returns the script and file path.
    """
    script = generate_podcast_script(sources, vector_store)
    
    timestamp = int(time.time())
    output_filename = f"podcast_overview_{timestamp}.mp3"
    output_filepath = os.path.join(settings.REPORTS_DIR, output_filename)
    
    temp_files = []
    try:
        # Create temp files for each turn
        for idx, turn in enumerate(script.dialogue):
            text = turn.text
            # Use different accents to differentiate speakers:
            # Host A: US Accent (tld='com')
            # Host B: UK Accent (tld='co.uk')
            tld = "com" if turn.speaker == "Host A" else "co.uk"
            
            tts = gTTS(text=text, lang="en", tld=tld, slow=False)
            temp_filename = f"temp_turn_{timestamp}_{idx}.mp3"
            temp_path = os.path.join(settings.UPLOAD_DIR, temp_filename)
            tts.save(temp_path)
            temp_files.append(temp_path)
            # Small throttle to prevent API rate limiting
            time.sleep(0.5)

        # Concatenate MP3 binary contents
        with open(output_filepath, "wb") as outfile:
            for temp_path in temp_files:
                if os.path.exists(temp_path):
                    with open(temp_path, "rb") as infile:
                        outfile.write(infile.read())
                        
    except Exception as e:
        print(f"Failed to generate podcast audio: {e}")
        output_filepath = ""
    finally:
        # Clean up temp files
        for temp_path in temp_files:
            try:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
            except Exception:
                pass

    return {
        "title": script.title,
        "script": script.model_dump(),
        "filename": output_filename,
        "filepath": output_filepath
    }

def generate_slideshow_deck(sources: List[str], vector_store: VectorStore = None) -> SlideshowDeck:
    """
    Generates structured slide contents representing a presentation deck summarizing the papers.
    """
    if not vector_store:
        vector_store = VectorStore()

    text_data = []
    for source in sources:
        chunks = vector_store.get_document_chunks(source)
        if chunks:
            text_data.extend(chunks[:8])

    combined_text = "\n\n".join(text_data)[:35000]

    prompt = (
        "You are an expert presenter. Analyze the attached documents and prepare a structured slideshow presentation. "
        "Create a slide deck of 5-7 slides summarizing: Introduction, Methodology/Architecture, Core Findings, "
        "Limitations, and Future Directions. Each slide should have a title, exactly 3 key bullet points, "
        "and a visual layout/suggestion. Return the output in the requested JSON structure.\n\n"
        f"Documents Content:\n{combined_text}"
    )

    try:
        json_res = generate_json(prompt, SlideshowDeck)
        return SlideshowDeck.model_validate_json(json_res)
    except Exception as e:
        print(f"Error generating slides: {e}")
        return SlideshowDeck(
            presentation_title="Research Summary",
            slides=[
                SlideItem(
                    title="Introduction",
                    bullets=["Failed to generate slides.", "Check system logs.", "Verify OpenRouter API connection."],
                    visual_suggestion="Centered warning box with text."
                )
            ]
        )

# Infographic Pydantic Schemas
class StatItem(BaseModel):
    value: str = Field(description="A numerical statistic or core quantitative value (e.g. '92.3%', '8x', '65M')")
    label: str = Field(description="A short label describing the statistic (e.g. 'Accuracy', 'Training Speedup', 'Parameters')")
    emoji: str = Field(description="A single relevant emoji that visually represents this stat (e.g. '📊', '⚡', '🧠')")

class TakeawayItem(BaseModel):
    title: str = Field(description="A short 2-3 word bold title for the takeaway")
    detail: str = Field(description="A brief description of this takeaway point")
    emoji: str = Field(description="A single relevant emoji representing this takeaway (e.g. '💡', '🔬', '📈')")

class TimelineMilestone(BaseModel):
    milestone: str = Field(description="A chronological label or date/phase (e.g. 'Phase 1: Pre-training', '2017: Introduction')")
    description: str = Field(description="Key event or advancement associated with this milestone")
    emoji: str = Field(description="A single emoji representing this milestone phase (e.g. '🚀', '🔭', '⚙️')")

class BentoTile(BaseModel):
    title: str = Field(description="Tile header title")
    content: str = Field(description="Core text inside the tile")
    importance: str = Field(description="Importance classification defining size in bento grid: 'large', 'medium', or 'small'")
    emoji: str = Field(description="A single relevant emoji for this tile concept (e.g. '🧩', '📐', '🔋')")

class MindMapNode(BaseModel):
    concept: str = Field(description="A central concept or node name")
    relations: List[str] = Field(description="List of directly connected sub-concepts, attributes, or nodes")

class InfographicReport(BaseModel):
    title: str = Field(description="A catchy title for the infographic")
    subtitle: str = Field(description="A descriptive subtitle summarizing the context")
    topic_domain: str = Field(description="The primary research domain in 2-3 words (e.g. 'Machine Learning', 'Quantum Physics', 'Cybersecurity', 'Astrophysics', 'Additive Manufacturing')")
    topic_emoji: str = Field(description="A single large banner emoji that best represents the topic domain (e.g. '🤖' for ML, '⚛️' for physics, '🔐' for security, '🌌' for astrophysics, '🏭' for manufacturing)")
    key_stats: List[StatItem] = Field(description="Exactly 3 key statistics/metrics")
    takeaways: List[TakeawayItem] = Field(description="Exactly 4 core takeaways/lessons")
    timeline: List[TimelineMilestone] = Field(description="A list of 3-4 sequential milestones")
    bento_tiles: List[BentoTile] = Field(description="List of 4-5 bento grid tiles")
    mind_map_nodes: List[MindMapNode] = Field(description="List of 4-5 mind map core concept connections")

def generate_infographic_data(sources: List[str], vector_store: VectorStore = None) -> InfographicReport:
    """
    Generates structured information designed to be rendered as an infographic in multiple styles.
    """
    if not vector_store:
        vector_store = VectorStore()

    text_data = []
    for source in sources:
        chunks = vector_store.get_document_chunks(source)
        if chunks:
            text_data.extend(chunks[:8])

    combined_text = "\n\n".join(text_data)[:35000]

    prompt = (
        "You are an infographic designer and data visualization expert. Analyze the attached documents and "
        "compile structured summary parameters, timeline milestones, numerical stats, and bento grid details. "
        "IMPORTANT: For every item that has an 'emoji' field, you MUST include a single, relevant, visually expressive emoji "
        "that best represents that concept, statistic, or topic. For topic_emoji, pick one large expressive emoji banner. "
        "For topic_domain, identify the research area (e.g. Astrophysics, Machine Learning, Cybersecurity, Additive Manufacturing). "
        "Return the output in the requested JSON structure.\n\n"
        f"Documents Content:\n{combined_text}"
    )

    try:
        json_res = generate_json(prompt, InfographicReport)
        return InfographicReport.model_validate_json(json_res)
    except Exception as e:
        print(f"Error generating infographic data: {e}")
        return InfographicReport(
            title="Overview Infographic",
            subtitle="An error occurred, displaying default templates",
            key_stats=[
                StatItem(value="N/A", label="N/A"),
                StatItem(value="N/A", label="N/A"),
                StatItem(value="N/A", label="N/A")
            ],
            takeaways=[
                TakeawayItem(title="Error", detail=f"Failed to generate: {str(e)}")
            ],
            timeline=[
                TimelineMilestone(milestone="Start", description="Check settings.")
            ],
            bento_tiles=[
                BentoTile(title="Info", content="Failed to fetch metrics.", importance="large")
            ],
            mind_map_nodes=[
                MindMapNode(concept="System", relations=["Error"])
            ]
        )

def generate_infographic_png(report: Any, style: str) -> str:
    """
    Generates a high-quality visual infographic image (PNG) using Pillow,
    drawing stats boxes, takeaways, and timeline milestones.
    """
    from PIL import Image, ImageDraw, ImageFont
    
    # 1. Define theme colors
    bg_color = (255, 255, 255)
    text_color = (30, 41, 59)
    accent_color = (13, 148, 136) # teal
    card_bg = (248, 250, 252)
    
    if "Cyberpunk" in style:
        bg_color = (3, 0, 30)
        text_color = (255, 255, 255)
        accent_color = (236, 0, 140) # neon pink
        card_bg = (20, 10, 40)
    elif "Bento" in style or "Timeline" in style or "Mind Map" in style:
        bg_color = (15, 23, 42)
        text_color = (226, 232, 240)
        accent_color = (56, 189, 248) # sky blue
        card_bg = (30, 41, 59)
    elif "Anime" in style:
        bg_color = (253, 242, 248)
        text_color = (0, 0, 0)
        accent_color = (236, 72, 153) # pink
        card_bg = (255, 255, 255)
    elif "Sketch" in style:
        bg_color = (255, 251, 235)
        text_color = (69, 26, 3)
        accent_color = (217, 119, 6) # amber
        card_bg = (255, 253, 245)
    elif "Minimalist" in style:
        bg_color = (0, 0, 0)
        text_color = (255, 255, 255)
        accent_color = (239, 68, 68) # red
        card_bg = (20, 20, 20)
    elif "Terminal" in style:
        bg_color = (5, 5, 5)
        text_color = (34, 197, 94) # phosphor green
        accent_color = (74, 222, 128)
        card_bg = (10, 10, 10)

    # 2. Setup Image Canvas
    width, height = 800, 1100
    img = Image.new("RGB", (width, height), bg_color)
    draw = ImageDraw.Draw(img)
    
    # 3. Load font
    font_path = "C:\\Windows\\Fonts\\arial.ttf"
    try:
        font_title = ImageFont.truetype(font_path, 28)
        font_subtitle = ImageFont.truetype(font_path, 16)
        font_header = ImageFont.truetype(font_path, 18)
        font_bold = ImageFont.truetype(font_path, 15)
        font_regular = ImageFont.truetype(font_path, 14)
    except Exception:
        font_title = ImageFont.load_default()
        font_subtitle = ImageFont.load_default()
        font_header = ImageFont.load_default()
        font_bold = ImageFont.load_default()
        font_regular = ImageFont.load_default()

    # 4. Draw Header
    draw.rectangle([0, 0, width, 100], fill=accent_color)
    draw.text((40, 25), report.title[:45], fill=(255, 255, 255), font=font_title)
    draw.text((40, 65), report.subtitle[:70], fill=(255, 255, 255), font=font_subtitle)
    
    # 5. Draw Stats Section
    y_offset = 130
    draw.text((40, y_offset), "KEY METRICS", fill=accent_color, font=font_header)
    y_offset += 30
    
    box_width = 220
    box_height = 80
    gap = 20
    for idx, stat in enumerate(report.key_stats[:3]):
        x = 40 + idx * (box_width + gap)
        draw.rectangle([x, y_offset, x + box_width, y_offset + box_height], fill=card_bg, outline=accent_color, width=1)
        draw.text((x + 15, y_offset + 15), stat.value[:10], fill=accent_color, font=font_title)
        draw.text((x + 15, y_offset + 50), stat.label[:25], fill=text_color, font=font_regular)
        
    y_offset += box_height + 40
    
    # 6. Draw Takeaways Section
    draw.text((40, y_offset), "CORE TAKEAWAYS", fill=accent_color, font=font_header)
    y_offset += 30
    
    for takeaway in report.takeaways[:4]:
        draw.rectangle([40, y_offset + 5, 48, y_offset + 13], fill=accent_color)
        draw.text((60, y_offset), takeaway.title[:35], fill=text_color, font=font_bold)
        y_offset += 22
        detail_text = takeaway.detail[:100]
        draw.text((60, y_offset), detail_text, fill=text_color, font=font_regular)
        y_offset += 35
        
    y_offset += 15
    
    # 7. Draw Timeline Section
    draw.text((40, y_offset), "CHRONOLOGICAL PROGRESS / PATHWAY", fill=accent_color, font=font_header)
    y_offset += 30
    
    # Draw timeline line
    draw.line([45, y_offset + 10, 45, y_offset + 150], fill=accent_color, width=2)
    
    for milestone in report.timeline[:3]:
        draw.ellipse([38, y_offset + 5, 52, y_offset + 19], fill=accent_color, outline=bg_color, width=2)
        draw.text((70, y_offset), milestone.milestone[:35], fill=accent_color, font=font_bold)
        y_offset += 20
        draw.text((70, y_offset), milestone.description[:95], fill=text_color, font=font_regular)
        y_offset += 35
        
    # Save PNG
    timestamp = int(time.time())
    output_filename = f"infographic_{timestamp}.png"
    output_filepath = os.path.join(settings.REPORTS_DIR, output_filename)
    img.save(output_filepath)
    return output_filename


