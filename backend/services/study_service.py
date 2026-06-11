from typing import List
from pydantic import BaseModel, Field
from rag.vectorstore import VectorStore
from llm.gemini import generate_json

class FlashcardItem(BaseModel):
    front: str = Field(description="The question or key term on the front of the flashcard (e.g. 'What is the attention mechanism scaling factor?')")
    back: str = Field(description="The definition, answer, or explanation on the back of the flashcard")

class FlashcardDeck(BaseModel):
    deck_title: str = Field(description="A descriptive title for this flashcard deck")
    cards: List[FlashcardItem] = Field(description="List of flashcards in the deck")

class QuizQuestion(BaseModel):
    question: str = Field(description="The multiple choice question text based on the documents")
    options: List[str] = Field(description="Exactly 4 options to choose from")
    correct_index: int = Field(description="0-based index of the correct option (0, 1, 2, or 3)")
    explanation: str = Field(description="Detailed explanation of why the answer is correct")

class Quiz(BaseModel):
    quiz_title: str = Field(description="A descriptive title for this quiz")
    questions: List[QuizQuestion] = Field(description="List of multiple choice questions")

def generate_flashcards(sources: List[str], count: int = 8, vector_store: VectorStore = None) -> FlashcardDeck:
    if not vector_store:
        vector_store = VectorStore()

    if not sources:
        return FlashcardDeck(deck_title="Empty Deck", cards=[])

    # Retrieve chunks
    text_data = []
    for source in sources:
        chunks = vector_store.get_document_chunks(source)
        if chunks:
            text_data.extend(chunks[:10]) # Use first few chunks

    combined_text = "\n\n".join(text_data)[:30000]

    prompt = (
        f"You are a study tutor. Based on the following research documents content, generate a deck of exactly {count} "
        "high-quality flashcards to help a student study the core concepts, definitions, formulas, and findings. "
        "Return the output in the requested JSON structure.\n\n"
        f"Documents Content:\n{combined_text}"
    )

    try:
        json_res = generate_json(prompt, FlashcardDeck)
        return FlashcardDeck.model_validate_json(json_res)
    except Exception as e:
        print(f"Error generating flashcards: {e}")
        # Return empty deck on failure
        return FlashcardDeck(deck_title=f"Study Deck ({len(sources)} sources)", cards=[
            FlashcardItem(front="Error", back=f"Failed to generate study deck: {str(e)}")
        ])

def generate_quiz(sources: List[str], count: int = 5, vector_store: VectorStore = None) -> Quiz:
    if not vector_store:
        vector_store = VectorStore()

    if not sources:
        return Quiz(quiz_title="Empty Quiz", questions=[])

    # Retrieve chunks
    text_data = []
    for source in sources:
        chunks = vector_store.get_document_chunks(source)
        if chunks:
            text_data.extend(chunks[:10])

    combined_text = "\n\n".join(text_data)[:30000]

    prompt = (
        f"You are a test preparation expert. Based on the following research documents, generate a quiz of exactly {count} "
        "multiple-choice questions testing the reader's comprehension. "
        "Each question must have exactly 4 plausible options, with 1 correct option and a detailed explanation. "
        "Return the output in the requested JSON structure.\n\n"
        f"Documents Content:\n{combined_text}"
    )

    try:
        json_res = generate_json(prompt, Quiz)
        return Quiz.model_validate_json(json_res)
    except Exception as e:
        print(f"Error generating quiz: {e}")
        return Quiz(quiz_title="Error Quiz", questions=[
            QuizQuestion(
                question=f"Error generating quiz: {str(e)}",
                options=["A", "B", "C", "D"],
                correct_index=0,
                explanation="An error occurred during API execution."
            )
        ])
