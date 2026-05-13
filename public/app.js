let history = [];
let storyNumber = 1;
let allStories = [];

const questionText = document.getElementById('question-text');
const tagContainer = document.getElementById('tag-container');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const analyzeBtn = document.getElementById('analyze-btn');
const recordBtn = document.getElementById('record-btn');

let mediaRecorder;
let audioChunks = [];
let isRecording = false;

async function startInterview() {
    const response = await fetch('/interview/start', { method: 'POST' });
    const data = await response.json();
    questionText.innerText = data.question;
    storyNumber = data.storyNumber;
}

async function sendResponse() {
    const transcript = userInput.value;
    if (!transcript) return;

    userInput.value = '';
    userInput.disabled = true;
    sendBtn.disabled = true;
    questionText.innerText = 'Analyzing your behavior...';

    const response = await fetch('/interview/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, history, storyNumber })
    });

    const data = await response.json();

    // Update history
    history.push({ role: 'user', content: transcript });
    history.push({ role: 'assistant', content: data.question });

    // Update UI
    questionText.innerText = data.question;
    
    // Update Tags
    if (data.detected_tags) {
        data.detected_tags.forEach(tag => {
            if (!Array.from(tagContainer.children).some(t => t.innerText === tag)) {
                const tagEl = document.createElement('div');
                tagEl.className = 'tag';
                tagEl.innerText = tag;
                tagContainer.appendChild(tagEl);
            }
        });
    }

    userInput.disabled = false;
    sendBtn.disabled = false;
    userInput.focus();

    // Show analyze button after some interaction (e.g. 3 messages)
    if (history.length >= 6) {
        analyzeBtn.style.display = 'block';
    }
}

async function analyzePatterns() {
    analyzeBtn.disabled = true;
    questionText.innerText = 'Synthesizing the mirror...';
    
    const response = await fetch('/interview/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allStories, conversationHistory: history })
    });

    const data = await response.json();

    questionText.innerHTML = `
        <div class="mirror-result">
            <h2 style="color: var(--accent-color); margin-bottom: 1rem;">${data.pattern_name}</h2>
            <p>${data.reflection.replace(/\n/g, '<br>')}</p>
        </div>
    `;
    
    userInput.style.display = 'none';
    sendBtn.style.display = 'none';
    analyzeBtn.style.display = 'none';
}

sendBtn.addEventListener('click', sendResponse);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendResponse();
});
analyzeBtn.addEventListener('click', analyzePatterns);

async function toggleRecording() {
    if (!isRecording) {
        // Live Preview using Web Speech API
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        let recognition;
        if (SpeechRecognition) {
            recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.onresult = (event) => {
                let interimTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        // We'll let Whisper handle the final, but show interim for "live" feel
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                if (interimTranscript) {
                    userInput.value = interimTranscript;
                }
            };
            recognition.start();
        }

        // High-quality recording for Whisper
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            if (recognition) recognition.stop();
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const formData = new FormData();
            formData.append('audio', audioBlob);

            questionText.innerText = 'Transcribing your voice...';
            const response = await fetch('/interview/whisper', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            userInput.value = data.text;
            sendResponse(); // Automatically send after transcription
        };

        mediaRecorder.start();
        isRecording = true;
        recordBtn.innerText = '⏹';
        recordBtn.style.background = '#333';
    } else {
        mediaRecorder.stop();
        isRecording = false;
        recordBtn.innerText = '🎤';
        recordBtn.style.background = '#ff4b4b';
    }
}

recordBtn.addEventListener('click', toggleRecording);

startInterview();
