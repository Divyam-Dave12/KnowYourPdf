import os
import re
import hashlib
import logging
from typing import List
from dotenv import load_dotenv

# LangChain imports
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.documents import Document
from langchain_core.output_parsers import StrOutputParser

# ------------------------------------------------------------------
# ENV & LOGGING
# ------------------------------------------------------------------

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)
logger = logging.getLogger(__name__)

VECTOR_STORE_DIR = "vector_store"
os.makedirs(VECTOR_STORE_DIR, exist_ok=True)

# ------------------------------------------------------------------
# POST-PROCESSING CLEANER
# ------------------------------------------------------------------

def clean_llm_output(text: str) -> str:
    text = re.sub(r'#{1,6}\s*', '', text)
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
    text = re.sub(r'\*(.*?)\*', r'\1', text)
    text = re.sub(r'^\s*[\*\-•]\s+', '- ', text, flags=re.MULTILINE)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

# ------------------------------------------------------------------
# SENTIMENT / MOOD LOGIC
# ------------------------------------------------------------------

def detect_user_mood(text: str) -> str:
    text = text.lower()

    if any(p in text for p in ["confused", "not clear", "don't understand"]):
        return "confused"
    if any(p in text for p in ["stuck", "frustrated", "urgent"]):
        return "stressed"
    if any(p in text for p in ["why", "how", "explain"]):
        return "curious"
    if any(p in text for p in ["thanks", "great", "awesome"]):
        return "positive"

    return "neutral"


def map_mood_to_response(mood: str) -> dict:
    mapping = {
        "confused": {
            "tone": "supportive, patient, and simple",
            "style": "step-by-step bullet points"
        },
        "stressed": {
            "tone": "calm, reassuring, and concise",
            "style": "short bullet points"
        },
        "curious": {
            "tone": "academic and explanatory",
            "style": "well-structured paragraphs"
        },
        "positive": {
            "tone": "friendly and engaging",
            "style": "paragraphs"
        },
        "neutral": {
            "tone": "professional and clear",
            "style": "paragraphs"
        }
    }
    return mapping.get(mood, mapping["neutral"])

# ------------------------------------------------------------------
# RAG SERVICE
# ------------------------------------------------------------------

class RAGService:

    def __init__(self):
        logger.info("⚙️ Initializing RAG Service")

        self.groq_api_key = os.getenv("GROQ_API_KEY")
        if not self.groq_api_key:
            raise ValueError("❌ GROQ_API_KEY missing")

        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            model_kwargs={"device": "cpu"}
        )

        self.llm = ChatGroq(
            model_name="llama-3.3-70b-versatile",
            temperature=0,
            max_tokens=2048,
            api_key=self.groq_api_key
        )

        self.vector_store = None
        self.retriever = None
        self.answer_cache = {}

        logger.info("✅ RAG Service Ready")

    # --------------------------------------------------------------
    # PDF INGESTION
    # --------------------------------------------------------------

    def process_pdf(self, file_path: str):
        try:
            logger.info(f"📄 Processing PDF: {file_path}")

            pdf_hash = self._hash_file(file_path)
            index_path = os.path.join(VECTOR_STORE_DIR, pdf_hash)

            if os.path.exists(index_path):
                logger.info("🗂️ Loading existing vector store")
                self.vector_store = FAISS.load_local(
                    index_path,
                    self.embeddings,
                    allow_dangerous_deserialization=True
                )
            else:
                loader = PyPDFLoader(file_path)
                pages = loader.load()

                splitter = RecursiveCharacterTextSplitter(
                    chunk_size=800,
                    chunk_overlap=150
                )

                docs = []
                for page in pages:
                    chunks = splitter.split_text(page.page_content)
                    for chunk in chunks:
                        docs.append(
                            Document(
                                page_content=chunk,
                                metadata={
                                    "page": page.metadata.get("page", "N/A"),
                                    "source": os.path.basename(file_path)
                                }
                            )
                        )

                self.vector_store = FAISS.from_documents(docs, self.embeddings)
                self.vector_store.save_local(index_path)

            self._build_retriever()
            return {"status": "success"}

        except Exception:
            logger.exception("❌ PDF processing failed")
            raise

    # --------------------------------------------------------------
    # RETRIEVER
    # --------------------------------------------------------------

    def _build_retriever(self):
        self.retriever = self.vector_store.as_retriever(
            search_type="mmr",
            search_kwargs={"k": 6, "fetch_k": 12}
        )

    # --------------------------------------------------------------
    # QUERY
    # --------------------------------------------------------------

    def ask_question(self, question: str) -> str:
        if not self.retriever:
            return "Please upload and process a PDF first."

        normalized_question = self._normalize_query(question)

        if normalized_question in self.answer_cache:
            return self.answer_cache[normalized_question]

        try:
            docs = self.retriever.invoke(normalized_question)
            docs = self._rerank_docs(normalized_question, docs)
            context = self._format_docs(docs)

            mood = detect_user_mood(question)
            config = map_mood_to_response(mood)

            raw_response = self._generate_answer(
                context=context,
                question=normalized_question,
                mood=mood,
                tone=config["tone"],
                style=config["style"]
            )

            clean_response = clean_llm_output(raw_response)
            self.answer_cache[normalized_question] = clean_response
            return clean_response

        except Exception:
            logger.exception("❌ Query failed")
            return "An error occurred while processing your question."

    # --------------------------------------------------------------
    # LLM
    # --------------------------------------------------------------

    def _generate_answer(self, context, question, mood, tone, style) -> str:
        prompt = ChatPromptTemplate.from_template(
            """
You are a document-aware AI assistant.

RULES:
- Use ONLY the provided context
- If answer is missing, say:
  "The document does not contain this information."

User Mood: {mood}
Response Tone: {tone}
Response Style: {style}

FORMATTING GUIDELINES (IMPORTANT):
- Do NOT write the entire answer in a single paragraph
- Break the answer into multiple short paragraphs
- Each paragraph should explain only ONE idea
- Leave a blank line between paragraphs for readability
- If the style requires bullet points, use clear bullet points
- If the style requires paragraphs, use 2–5 short paragraphs

Context:
{context}

Question:
{question}
"""
        )

        chain = prompt | self.llm | StrOutputParser()
        return chain.invoke({
            "context": context,
            "question": question,
            "mood": mood,
            "tone": tone,
            "style": style
        })

    # --------------------------------------------------------------
    # UTILITIES
    # --------------------------------------------------------------

    def _format_docs(self, docs: List[Document]) -> str:
        return "\n\n".join(
            f"[Page {d.metadata.get('page')}]\n{d.page_content}"
            for d in docs
        )

    def _rerank_docs(self, query: str, docs: List[Document]) -> List[Document]:
        query_emb = self.embeddings.embed_query(query)
        scored = []

        for doc in docs:
            emb = self.embeddings.embed_documents([doc.page_content])[0]
            score = self._cosine_similarity(query_emb, emb)
            scored.append((score, doc))

        scored.sort(reverse=True, key=lambda x: x[0])
        return [doc for _, doc in scored[:3]]

    def _normalize_query(self, query: str) -> str:
        return query.strip().lower()

    def _hash_file(self, file_path: str) -> str:
        hasher = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hasher.update(chunk)
        return hasher.hexdigest()

    def _cosine_similarity(self, a, b) -> float:
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = sum(x * x for x in a) ** 0.5
        norm_b = sum(y * y for y in b) ** 0.5
        return dot / (norm_a * norm_b)
