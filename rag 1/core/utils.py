import os
from typing import List
from pypdf import PdfReader
from docx import Document as DocxDocument


def extract_text_from_file(path: str) -> str:
	text = ""
	extension = os.path.splitext(path)[1].lower()
	if extension in [".pdf"]:
		try:
			reader = PdfReader(path)
			collected = []
			for page in reader.pages:
				collected.append(page.extract_text() or "")
			text = "\n".join(collected)
		except Exception:
			text = ""
	elif extension in [".docx"]:
		try:
			doc = DocxDocument(path)
			text = "\n".join(p.text or "" for p in doc.paragraphs)
		except Exception:
			text = ""
	elif extension in [".txt"]:
		try:
			with open(path, "r", encoding="utf-8", errors="ignore") as f:
				text = f.read()
		except Exception:
			text = ""
	else:
		# unsupported types: attempt naive read as text
		try:
			with open(path, "r", encoding="utf-8", errors="ignore") as f:
				text = f.read()
		except Exception:
			text = ""
	return text


def chunk_text(text: str, max_chars: int = 1000, overlap: int = 150) -> List[str]:
	# Normalize newlines
	text = text.replace("\r", "")

	# Guard against invalid params
	if max_chars <= 0:
		return [text.strip()] if text.strip() else []

	# Ensure overlap is within [0, max_chars-1]
	overlap = max(0, min(overlap, max_chars - 1))
	step = max(1, max_chars - overlap)

	chunks: List[str] = []
	length = len(text)
	start = 0
	while start < length:
		end = min(start + max_chars, length)
		chunk = text[start:end]
		if chunk:
			chunks.append(chunk)
		# If we've reached the end, stop to avoid an infinite loop when end == length
		if end >= length:
			break
		# Move the window forward by the step size, guaranteeing progress
		start += step

	return [c.strip() for c in chunks if c.strip()]
