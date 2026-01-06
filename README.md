# KnowYourPdf 📄🤖

**KnowYourPdf** is a full-stack RAG (Retrieval-Augmented Generation) application that turns static PDF documents into interactive conversational partners. Users can upload documents and ask natural language questions to retrieve accurate, context-aware answers.

## 🚀 Key Features
* **Interactive Chat Interface:** Seamless React-based UI for uploading and chatting.
* **RAG Architecture:** Utilizes LangChain to retrieve context from vector embeddings before querying the LLM.
* **Vector Search:** Efficient document indexing using vector stores.
* **FastAPI Backend:** High-performance asynchronous API handling.
* **Containerized:** Fully Dockerized for easy deployment.

## 🛠️ Tech Stack
* **Frontend:** React.js, Tailwind CSS
* **Backend:** Python, FastAPI
* **AI/ML:** LangChain, OpenAI API / HuggingFace, FAISS (Vector Store)
* **DevOps:** Docker, Git

## ⚙️ Installation & Setup

### Prerequisites
* Node.js & npm
* Python 3.9+
* Docker (Optional)

### 1. Clone the Repository
```bash
git clone [https://github.com/yourusername/KnowYourPdf.git](https://github.com/yourusername/KnowYourPdf.git)
cd KnowYourPdf
