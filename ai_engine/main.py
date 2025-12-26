import os
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from rag_service import RAGService

# Initialize App
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rag_service = None

@app.on_event("startup")
async def startup_event():
    global rag_service
    try:
        rag_service = RAGService()
        print("✅ Python AI Service Ready")
    except Exception as e:
        print(f"❌ Error initializing RAG: {e}")

# --- NEW MODELS ---
class QuestionRequest(BaseModel):
    question: str

# This matches the data Node.js sends
class ProcessRequest(BaseModel):
    filename: str
    filePath: str 

@app.get("/")
def read_root():
    return {"status": "AI Server is Running 🚀"}

# --- UPDATED ENDPOINT ---
@app.post("/process-pdf")
def process_pdf_endpoint(request: ProcessRequest):
    """
    Now accepts a file PATH from Node.js instead of a raw file.
    """
    global rag_service
    
    print(f"📥 Received request to process: {request.filePath}")

    if not os.path.exists(request.filePath):
        raise HTTPException(status_code=400, detail="File does not exist at path")

    try:
        # Pass the path directly to the RAG service
        result = rag_service.process_pdf(request.filePath)
        return {
            "status": "success", 
            "filename": request.filename, 
            "doc_count": result.get("chunks_processed")
        }
    except Exception as e:
        print(f"❌ Processing Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ask")
def ask_endpoint(request: QuestionRequest):
    global rag_service
    try:
        answer = rag_service.ask_question(request.question)
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)