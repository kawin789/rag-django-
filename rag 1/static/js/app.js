const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message');
const sendBtn = document.getElementById('send-btn');
const micBtn = document.getElementById('mic-btn');
const speakBtn = document.getElementById('speak-btn');
const uploadForm = document.getElementById('upload-form');
const fileInput = document.getElementById('file');
const docSelect = document.getElementById('doc-select');
const refreshDocsBtn = document.getElementById('refresh-docs');
const deleteDocBtn = document.getElementById('delete-doc');
const providerSelect = document.getElementById('provider');

// Speech synthesis variables
let isSpeaking = false;
let speechSynthesis = window.speechSynthesis;
let currentUtterance = null;

function append(role, text) {
	const div = document.createElement('div');
	div.className = role;
	div.textContent = `${role === 'user' ? 'You' : 'Bot'}: ${text}`;
	chatBox.appendChild(div);
	chatBox.scrollTop = chatBox.scrollHeight;
}

async function refreshDocs() {
	const res = await fetch('/documents/');
	const data = await res.json();
	docSelect.innerHTML = '';
	
	if (!data.documents || data.documents.length === 0) {
		const noDocsDiv = document.createElement('div');
		noDocsDiv.className = 'no-docs';
		noDocsDiv.textContent = 'No documents uploaded yet...';
		docSelect.appendChild(noDocsDiv);
		return;
	}
	
	(data.documents || []).forEach(d => {
		const label = document.createElement('label');
		const checkbox = document.createElement('input');
		checkbox.type = 'checkbox';
		checkbox.value = d.id;
		
		// Get file extension
		const fileName = d.name;
		const ext = fileName.split('.').pop().toUpperCase();
		const icon = ext === 'PDF' ? '📄' : ext === 'DOCX' ? '📝' : '📃';
		
		label.appendChild(checkbox);
		label.appendChild(document.createTextNode(`${icon} ${fileName}`));
		docSelect.appendChild(label);
	});
}

uploadForm.addEventListener('submit', async (e) => {
	e.preventDefault();
	if (!fileInput.files[0]) {
		alert('Please select a file to upload');
		return;
	}
	
	const submitBtn = uploadForm.querySelector('button[type="submit"]');
	const originalText = submitBtn.textContent;
	
	// Create progress indicator
	let progressDiv = document.querySelector('.upload-progress');
	if (!progressDiv) {
		progressDiv = document.createElement('div');
		progressDiv.className = 'upload-progress';
		progressDiv.innerHTML = `
			<div class="progress-bar">
				<div class="progress-fill" id="progress-fill"></div>
			</div>
			<div class="progress-text" id="progress-text">Starting upload...</div>
		`;
		uploadForm.parentElement.appendChild(progressDiv);
	}
	
	submitBtn.disabled = true;
	const progressFill = document.getElementById('progress-fill');
	const progressText = document.getElementById('progress-text');
	
	try {
		// Step 1: Upload file
		progressFill.style.width = '10%';
		progressText.textContent = '📤 Uploading file...';
		
		const fd = new FormData();
		fd.append('file', fileInput.files[0]);
		
		progressFill.style.width = '30%';
		progressText.textContent = '📄 Processing document...';
		
		const res = await fetch('/upload/', { method: 'POST', body: fd });		
		// Check if response is JSON
		const contentType = res.headers.get('content-type');
		if (!contentType || !contentType.includes('application/json')) {
			const text = await res.text();
			console.error('Server returned non-JSON response:', text);
			progressDiv.remove();
			alert('Server error: Please check the console and restart the server');
			submitBtn.disabled = false;
			return;
		}
		
		const data = await res.json();
		
		if (data.error) {
			progressDiv.remove();
			alert('Error: ' + data.error);
			submitBtn.disabled = false;
			return;
		}
		
		// Step 2: Text extraction complete
		progressFill.style.width = '50%';
		progressText.textContent = '✂️ Creating text chunks...';
		await new Promise(resolve => setTimeout(resolve, 300));
		
		// Step 3: Chunking complete
		progressFill.style.width = '70%';
		progressText.textContent = '🧠 Generating embeddings...';
		await new Promise(resolve => setTimeout(resolve, 300));
		
		// Step 4: Embeddings complete
		progressFill.style.width = '90%';
		progressText.textContent = '💾 Storing in vector database...';
		await new Promise(resolve => setTimeout(resolve, 300));
		
		// Step 5: Complete
		progressFill.style.width = '100%';
		progressText.textContent = `✅ Success! Created ${data.chunks || 0} chunks`;
		
		// Refresh document list
		await refreshDocs();
		
		// Auto-select the newly uploaded document
		const newDocId = data.id;
		await new Promise(resolve => setTimeout(resolve, 200));
		
		// Find and check the checkbox for the new document
		const newCheckbox = docSelect.querySelector(`input[value="${newDocId}"]`);
		if (newCheckbox) {
			newCheckbox.checked = true;
			// Highlight the parent label
			const label = newCheckbox.parentElement;
			label.style.backgroundColor = '#f0f2ff';
			label.style.border = '2px solid #667eea';
			setTimeout(() => {
				label.style.backgroundColor = '';
				label.style.border = '';
			}, 2000);
		}
		
		// Show success message in chat
		const welcomeMsg = chatBox.querySelector('.welcome-message');
		if (welcomeMsg) welcomeMsg.remove();
		
		const successDiv = document.createElement('div');
		successDiv.className = 'bot system-message';
		successDiv.innerHTML = `
			<strong>✅ Document Ready!</strong><br>
			📄 <strong>${data.name}</strong> has been processed<br>
			📊 Created <strong>${data.chunks} chunks</strong> in vector database<br>
			💬 You can now ask questions about this document!
		`;
		chatBox.appendChild(successDiv);
		chatBox.scrollTop = chatBox.scrollHeight;
		
		// Clear file input
		fileInput.value = '';
		
		// Remove progress after delay
		setTimeout(() => {
			progressDiv.remove();
			submitBtn.disabled = false;
		}, 2000);
		
	} catch (error) {
		progressDiv.remove();
		alert('Upload failed: ' + error.message);
		submitBtn.disabled = false;
	}
});

refreshDocsBtn.addEventListener('click', refreshDocs);

deleteDocBtn.addEventListener('click', async () => {
	const selected = Array.from(docSelect.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
	if (selected.length === 0) {
		alert('Please select documents to delete');
		return;
	}
	
	if (!confirm(`Delete ${selected.length} document(s)?`)) {
		return;
	}
	
	for (const id of selected) {
		await fetch(`/documents/${id}/delete/`, { method: 'DELETE' });
	}
	await refreshDocs();
	
	// Show message in chat
	const deleteMsg = document.createElement('div');
	deleteMsg.className = 'bot system-message';

// Add enter key support for message input
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendBtn.click();
    }
});

// Initialize speak button
speakBtn.addEventListener('click', () => {
    // Force stop any ongoing speech first
    window.speechSynthesis.cancel();
    
    // Toggle speaking state
    if (isSpeaking) {
        // Reset everything to non-speaking state
        isSpeaking = false;
        speakBtn.textContent = '🔊';
        speakBtn.title = 'Read Answer';
        speakBtn.classList.remove('speaking');
        currentUtterance = null;
        return;
    }

    // Get the last bot message
    const messages = chatBox.querySelectorAll('.bot');
    const lastMessage = messages[messages.length - 1];
    
    if (!lastMessage) {
        alert('No message to read');
        return;
    }
    
    // Extract text content (remove "Bot: " prefix)
    const text = lastMessage.textContent.replace(/^Bot:\s*/, '');
    
    // Create and configure utterance
    currentUtterance = new SpeechSynthesisUtterance(text);
    currentUtterance.rate = 1;
    currentUtterance.pitch = 1;
    
    // Update button state to speaking
    isSpeaking = true;
    speakBtn.textContent = '🔇';
    speakBtn.title = 'Click to Stop Speaking';
    speakBtn.classList.add('speaking');
    
    // Handle speech end (either natural end or interrupted)
    currentUtterance.onend = () => {
        isSpeaking = false;
        speakBtn.textContent = '🔊';
        speakBtn.title = 'Read Answer';
        speakBtn.classList.remove('speaking');
        currentUtterance = null;
    };
    
    // Handle any errors
    currentUtterance.onerror = () => {
        isSpeaking = false;
        speakBtn.textContent = '🔊';
        speakBtn.title = 'Read Answer';
        speakBtn.classList.remove('speaking');
        currentUtterance = null;
        alert('Error occurred while speaking');
    };
    
    // Start speaking
    speechSynthesis.speak(currentUtterance);
});
	deleteMsg.textContent = `🗑️ Deleted ${selected.length} document(s)`;
	chatBox.appendChild(deleteMsg);
	chatBox.scrollTop = chatBox.scrollHeight;
});

sendBtn.addEventListener('click', async () => {
	const msg = messageInput.value.trim();
	if (!msg) return;
	
	// Check if any documents are selected
	const selected = Array.from(docSelect.querySelectorAll('input[type="checkbox"]:checked')).map(cb => parseInt(cb.value));
	const hasDocuments = docSelect.querySelector('input[type="checkbox"]') !== null;
	
	if (selected.length === 0 && hasDocuments) {
		const useAll = confirm('No documents selected. Do you want to search all documents?');
		if (!useAll) {
			alert('Please select at least one document using the checkboxes');
			return;
		}
	}
	
	// Clear welcome message if it exists
	const welcomeMsg = chatBox.querySelector('.welcome-message');
	if (welcomeMsg) welcomeMsg.remove();
	
	append('user', msg);
	messageInput.value = '';
	
	const provider = providerSelect.value;
	
	// Show loading indicator
	const loadingDiv = document.createElement('div');
	loadingDiv.className = 'bot loading-message';
	loadingDiv.innerHTML = `
		<div class="loading-spinner"></div>
		<span>Searching documents and generating answer...</span>
	`;
	chatBox.appendChild(loadingDiv);
	chatBox.scrollTop = chatBox.scrollHeight;
	
	const body = { message: msg, provider, model: null, document_ids: selected, k: 5 };
	
	try {
		const res = await fetch('/chat/', { 
			method: 'POST', 
			headers: { 'Content-Type': 'application/json' }, 
			body: JSON.stringify(body) 
		});
		const data = await res.json();

		// Enable input and button after response
		messageInput.disabled = false;
		sendBtn.disabled = false;
		
		// Remove loading indicator
		loadingDiv.remove();
		
		append('bot', data.answer || JSON.stringify(data));
		window._lastAnswer = data.answer || '';
	} catch (error) {
		loadingDiv.remove();
		append('bot', 'Error: Could not get response. Please try again.');
	}
});

// Allow Enter key to send message
messageInput.addEventListener('keypress', (e) => {
	if (e.key === 'Enter') {
		sendBtn.click();
	}
});

// Speech Recognition
let recognition;
if ('webkitSpeechRecognition' in window) {
	recognition = new webkitSpeechRecognition();
	recognition.lang = 'en-US';
	recognition.continuous = false;
	recognition.interimResults = false;
	recognition.onresult = (event) => {
		const transcript = event.results[0][0].transcript;
		messageInput.value = transcript;
	};
}

micBtn.addEventListener('click', () => {
	if (!recognition) { alert('Speech recognition not supported'); return; }
	recognition.start();
});

// Text-to-Speech with toggle functionality
speakBtn.addEventListener('click', () => {
    if (isSpeaking) {
        // If speaking, stop it
        speechSynthesis.cancel();
        isSpeaking = false;
        speakBtn.textContent = '🔊';
        speakBtn.title = 'Read Answer';
        speakBtn.classList.remove('speaking');
        return;
    }

    // Start speaking
    const text = window._lastAnswer || messageInput.value.trim();
    if (!text) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => {
        isSpeaking = false;
        speakBtn.textContent = '🔊';
        speakBtn.title = 'Read Answer';
        speakBtn.classList.remove('speaking');
    };

    isSpeaking = true;
    speakBtn.textContent = '🔇';
    speakBtn.title = 'Stop Speaking';
    speakBtn.classList.add('speaking');
    speechSynthesis.speak(utterance);
});

window.addEventListener('load', refreshDocs);
