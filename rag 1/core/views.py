from django.http import JsonResponse, HttpRequest, HttpResponse
from django.shortcuts import render
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.core.files.storage import default_storage
from django.conf import settings
from .models import Document, Chunk
import os
import io
import json
import numpy as np
from typing import List, Tuple

from .utils import extract_text_from_file, chunk_text
from .vector import embed_texts, build_faiss_index, search_similar
from .llm import generate_answer


def index(request: HttpRequest) -> HttpResponse:
	return render(request, "index.html")


@csrf_exempt
@require_http_methods(["POST"])
def upload_document(request: HttpRequest) -> JsonResponse:
	uploaded_file = request.FILES.get("file")
	if not uploaded_file:
		return JsonResponse({"error": "No file provided"}, status=400)

	name = uploaded_file.name
	
	try:
		# Create document record
		doc = Document.objects.create(name=name, file=uploaded_file)
		
		# Extract text, chunk, embed, and store
		file_path = doc.file.path
		print(f"Processing file: {file_path}")
		
		text = extract_text_from_file(file_path)
		if not text.strip():
			doc.delete()  # Clean up if extraction fails
			return JsonResponse({"error": "Could not extract text from file. File may be empty or corrupted."}, status=400)
		
		print(f"Extracted {len(text)} characters from document")
		
		# Chunk the text
		chunks = chunk_text(text, max_chars=1000, overlap=150)
		print(f"Created {len(chunks)} chunks")
		
		if not chunks:
			doc.delete()
			return JsonResponse({"error": "No text chunks created from document"}, status=400)
		
		# Generate embeddings
		print(f"Generating embeddings for {len(chunks)} chunks...")
		embeddings = embed_texts(chunks)
		print(f"Generated embeddings with shape: {embeddings.shape}")
		
		# Store chunks with embeddings in database
		for idx, (content, emb) in enumerate(zip(chunks, embeddings)):
			emb_bytes = np.asarray(emb, dtype=np.float32).tobytes()
			Chunk.objects.create(
				document=doc, 
				content=content, 
				embedding=emb_bytes, 
				index_id=str(doc.id), 
				order=idx
			)
		
		print(f"Successfully stored {len(chunks)} chunks in vector database")
		return JsonResponse({
			"id": doc.id, 
			"name": doc.name, 
			"chunks": len(chunks),
			"message": f"Successfully processed document with {len(chunks)} chunks"
		})
		
	except Exception as e:
		print(f"Error processing document: {str(e)}")
		import traceback
		traceback.print_exc()
		return JsonResponse({"error": f"Error processing document: {str(e)}"}, status=500)


@require_http_methods(["GET"])
def list_documents(request: HttpRequest) -> JsonResponse:
	docs = list(Document.objects.order_by("-created_at").values("id", "name", "file", "created_at"))
	return JsonResponse({"documents": docs})


@csrf_exempt
@require_http_methods(["DELETE"])
def delete_document(request: HttpRequest, doc_id: int) -> JsonResponse:
	try:
		doc = Document.objects.get(id=doc_id)
	except Document.DoesNotExist:
		return JsonResponse({"error": "Not found"}, status=404)

	# delete file
	file_path = doc.file.path
	if os.path.exists(file_path):
		os.remove(file_path)

	# cascades to chunks
	doc.delete()
	return JsonResponse({"ok": True})


@csrf_exempt
@require_http_methods(["POST"])
def chat(request: HttpRequest) -> JsonResponse:
	try:
		payload = json.loads(request.body.decode("utf-8"))
	except Exception as e:
		return JsonResponse({"error": f"Invalid JSON: {str(e)}"}, status=400)

	query = payload.get("message", "").strip()
	model_provider = payload.get("provider", "gemini")  # gemini or groq
	model_name = payload.get("model", None)
	selected_doc_ids = payload.get("document_ids", [])  # list of ids; empty means all
	k = int(payload.get("k", 5))

	if not query:
		return JsonResponse({"error": "Empty message"}, status=400)

	try:
		print(f"\n=== Chat Request ===")
		print(f"Query: {query}")
		print(f"Provider: {model_provider}")
		print(f"Selected docs: {selected_doc_ids}")
		
		# Gather chunks from database
		qs = Chunk.objects.all()
		if selected_doc_ids:
			qs = qs.filter(document_id__in=selected_doc_ids)
		
		chunk_count = qs.count()
		print(f"Found {chunk_count} chunks in database")
		
		if chunk_count == 0:
			return JsonResponse({
				"answer": "No documents have been uploaded yet. Please upload a document first to ask questions about it.",
				"sources": []
			})

		contents: List[str] = []
		embeddings: List[np.ndarray] = []
		sources: List[Tuple[int, int]] = []  # (document_id, order)
		
		for ch in qs.iterator():
			contents.append(ch.content)
			embeddings.append(np.frombuffer(ch.embedding, dtype=np.float32))
			sources.append((ch.document_id, ch.order))
		
		print(f"Loaded {len(contents)} chunks from database")
		
		# Build FAISS index and search
		print(f"Building FAISS index...")
		embeddings_array = np.vstack(embeddings)
		index = build_faiss_index(embeddings_array)
		
		print(f"Generating query embedding...")
		query_emb = embed_texts([query])[0].astype(np.float32)
		
		print(f"Searching for top {k} similar chunks...")
		idxs, dists = search_similar(index, query_emb, top_k=min(k, len(contents)))
		
		retrieved = [
			{
				"text": contents[i], 
				"document_id": int(sources[i][0]), 
				"order": int(sources[i][1]), 
				"score": float(dists[j])
			}
			for j, i in enumerate(idxs)
		]
		
		context = "\n\n".join([r["text"] for r in retrieved])
		print(f"Retrieved {len(retrieved)} relevant chunks")
		print(f"Context length: {len(context)} characters")
		
		# Generate answer using LLM
		print(f"Generating answer using {model_provider}...")
		answer = generate_answer(query=query, context=context, provider=model_provider, model_name=model_name)
		print(f"Answer generated: {answer[:100]}...")
		
		return JsonResponse({
			"answer": answer, 
			"sources": retrieved,
			"chunks_searched": len(contents),
			"chunks_used": len(retrieved)
		})
		
	except Exception as e:
		print(f"Error in chat: {str(e)}")
		import traceback
		traceback.print_exc()
		return JsonResponse({
			"error": f"Error processing chat: {str(e)}",
			"answer": f"Sorry, I encountered an error: {str(e)}"
		}, status=500)
