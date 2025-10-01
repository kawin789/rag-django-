# RAG Chat Assistant

A Retrieval-Augmented Generation (RAG) chat application built with Django that allows you to upload documents and ask questions about them using AI.

## Features

- 📤 Upload PDF, DOCX, and TXT documents
- 💬 Chat with your documents using AI
- 🔍 Vector-based semantic search using FAISS
- 🤖 Multiple AI providers (Google Gemini & Groq)
- 🎤 Voice input support
- 🔊 Text-to-speech for answers
- 📱 Responsive design

## Setup

https://github.com/user-attachments/assets/60131e5c-77ff-4858-8bf6-d741f911a956



### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure API Keys

Edit the `.env` file and add your API keys:

```
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
```

Get your API keys from:
- Gemini: https://makersuite.google.com/app/apikey
- Groq: https://console.groq.com/keys

### 3. Run Migrations

```bash
python manage.py migrate
```

### 4. Start the Server

```bash
python manage.py runserver
```

Or without auto-reload (if you encounter resource issues):

```bash
python manage.py runserver --noreload
```

### 5. Access the Application

Open your browser and go to: http://127.0.0.1:8000/

## Usage

1. **Upload Documents**: Click "Choose File" and select a PDF, DOCX, or TXT file, then click "Upload Document"
2. **Select Documents**: Choose one or more documents from the dropdown list (hold Ctrl/Cmd for multiple)
3. **Choose AI Provider**: Select between Google Gemini or Groq
4. **Ask Questions**: Type your question in the chat box and click "Send"
5. **Voice Features**: Use the microphone button for voice input or speaker button to hear answers

## Technologies Used

- **Backend**: Django 4.2
- **AI Models**: Google Gemini, Groq (Llama)
- **Vector Search**: FAISS
- **Embeddings**: Sentence Transformers

Uploading 2025-10-02 00-39-23.mp4…


- **Document Processing**: PyPDF, python-docx
- **Frontend**: Vanilla JavaScript, CSS3

## Notes

- The ALTS warnings in the console are normal and can be ignored (they're from Google's gRPC library)
- Documents are stored in the `media/` directory
- The database is SQLite (db.sqlite3)
- Vector embeddings are stored in the database for fast retrieval

