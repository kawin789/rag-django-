from typing import List, Tuple
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer


_model = None


def _get_model() -> SentenceTransformer:
	global _model
	if _model is None:
		_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
	return _model


def embed_texts(texts: List[str]) -> np.ndarray:
	model = _get_model()
	embs = model.encode(texts, batch_size=32, convert_to_numpy=True, normalize_embeddings=True)
	return embs.astype(np.float32)


def build_faiss_index(embeddings: np.ndarray) -> faiss.IndexFlatIP:
	dim = embeddings.shape[1]
	index = faiss.IndexFlatIP(dim)
	index.add(embeddings)
	return index


def search_similar(index: faiss.IndexFlatIP, query_emb: np.ndarray, top_k: int = 5) -> Tuple[List[int], List[float]]:
	D, I = index.search(query_emb.reshape(1, -1), top_k)
	idxs = I[0].tolist()
	dists = D[0].tolist()
	return idxs, dists
