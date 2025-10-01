import os
from typing import Optional

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or ""
GROQ_API_KEY = os.getenv("GROQ_API_KEY") or ""


def _call_gemini(prompt: str, model_name: Optional[str] = None) -> str:
	try:
		import google.generativeai as genai
		env_key = GEMINI_API_KEY
		if not env_key:
			return "Gemini API key not configured."
		genai.configure(api_key=env_key)
		model = genai.GenerativeModel(model_name or "models/gemini-2.0-flash-exp")
		resp = model.generate_content(prompt)
		return getattr(resp, "text", "") or ""
	except Exception as e:
		return f"Gemini error: {e}"


def _call_groq(prompt: str, model_name: Optional[str] = None) -> str:
	# Save original proxy settings
	proxy_vars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 
	              'ALL_PROXY', 'all_proxy', 'NO_PROXY', 'no_proxy']
	original_proxies = {}
	
	# Remove all proxy environment variables
	for var in proxy_vars:
		if var in os.environ:
			original_proxies[var] = os.environ[var]
			del os.environ[var]
	
	try:
		from groq import Groq
		
		api_key = GROQ_API_KEY
		if not api_key:
			return "Groq API key not configured."
		
		# Initialize Groq client
		client = Groq(api_key=api_key)
		
		chosen = model_name or "llama-3.3-70b-versatile"
		
		chat = client.chat.completions.create(
			model=chosen,
			messages=[{"role": "user", "content": prompt}],
			temperature=0.3,
		)
		
		if chat.choices and len(chat.choices) > 0:
			return chat.choices[0].message.content or "No response generated."
		else:
			return "No response choices returned from Groq."
			
	except Exception as e:
		import traceback
		error_details = traceback.format_exc()
		print(f"Groq error details:\n{error_details}")
		return f"Groq error: {str(e)}"
	
	finally:
		# Restore original proxy settings
		for var, value in original_proxies.items():
			os.environ[var] = value


def generate_answer(query: str, context: str, provider: str, model_name: Optional[str]) -> str:
	instruction = (
		"You are a helpful RAG assistant. Use the provided context to answer the user."
		" If the answer is not in the context, say you are not certain."
	)
	prompt = f"{instruction}\n\nContext:\n{context}\n\nUser:\n{query}"
	provider = (provider or "gemini").lower()
	if provider == "groq":
		return _call_groq(prompt, model_name)
	return _call_gemini(prompt, model_name)