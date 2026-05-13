import express from 'express';
import dotenv from 'dotenv';
import multer from 'multer';
import fs from 'fs';
import { initSchema, closeDriver } from './lib/neo4j.js';
import { generateResponse, transcribeAudio } from './lib/openai.js';

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
app.use(express.json());
// app.use(express.static('public')); // Handled by Vercel

const PORT = process.env.PORT || 3000;

const SYSTEM_PROMPT = `
You are a relationship pattern detective. Your role is to conduct a conversational 
interview that uncovers the behavioral sequences someone repeats across multiple 
relationships. While you are hunting for patterns, you do so with deep empathy 
and curiosity.

CORE DIRECTIVE:
- Ask OPEN-ENDED questions that invite the user to share freely. Instead of 
  directive questions like "what did you do", ask "tell me about what happened".
- Use prompts like: "What was that experience like for you?", "What stood out 
  to you?", "How did that make you feel?".
- Let them talk naturally without steering them toward specific answers.
- Stay CURIOUS and NEUTRAL rather than directive.

EMPATHETIC ACKNOWLEDGMENT:
- Before asking your next question, ALWAYS acknowledge what they just shared.
- Show genuine interest by reflecting back something they said or validating 
  their experience. 
- Use phrases like "That sounds challenging", "I can see why that was important 
  to you", "That's interesting". 
- Keep it brief and warm but professional. Then naturally transition into your 
  next open-ended question.

CONVERSATION FLOW:
1. Listen fully to their response.
2. Acknowledge empathetically what they said.
3. Ask a follow-up question that invites deeper reflection.

BEHAVIORAL PATTERNS TO LISTEN FOR:
1. WITHDRAWAL: Pulling back when intimacy increases.
2. PURSUIT/TESTING: Escalating, demanding reassurance.
3. SABOTAGE: Creating conflict or exiting early.
4. SELECTION LOOP: Choosing the same type of unavailable/controlling partner.
5. ROLE-LOCKING: Playing the same role (fixer, caretaker, pursuer).

TESSL CAPABILITIES:
- You have access to the Tessl Neo4j Skill. Use it to reason about graph 
  relationships (User → Relationship → BehaviorPattern) to ensure data consistency.
`;

app.get('/', (req, res) => {
  res.send('Mirror API is running.');
});

app.post('/interview/start', async (req, res) => {
  try {
    const openingQuestion = "Mirror, mirror on the wall... reveal the truth beneath it all. \n\nWalk me through the last relationship that ended. Start from when you first met — what was it like?";
    res.json({ question: openingQuestion, storyNumber: 1 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/interview/whisper', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Use the buffer directly with a filename property for the OpenAI SDK
    // This is more compatible than the 'File' object in older Node versions
    const audioFile = {
      buffer: req.file.buffer,
      fieldname: 'audio',
      originalname: 'audio.webm',
      encoding: '7bit',
      mimetype: req.file.mimetype,
    };

    // The OpenAI SDK can take a 'toFile' helper or just the buffer if we wrap it
    // But the simplest way is to pass the buffer with the filename in the request
    const text = await transcribeAudio(req.file.buffer); 
    res.json({ text });
  } catch (error) {
    console.error('Error in /interview/whisper:', error);
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
});

app.post('/interview/respond', async (req, res) => {
  const { transcript, history, storyNumber } = req.body;
  
  const currentSystemPrompt = `${SYSTEM_PROMPT}
  
  CURRENT CONTEXT:
  - You are currently discussing Relationship #${storyNumber}.
  - After analyzing the user's response, provide your next question.
  - Also, provide any behavioral pattern tags you've detected so far in this specific story.
  
  RESPONSE FORMAT (JSON):
  {
    "question": "Your next follow-up question",
    "detected_tags": ["tag1", "tag2"],
    "phase_complete": false
  }
  `;

  try {
    const aiResponse = await generateResponse(
      [...history, { role: 'user', content: transcript }],
      currentSystemPrompt
    );
    
    // Parse the AI's JSON response
    const parsed = JSON.parse(aiResponse);
    res.json(parsed);
  } catch (error) {
    console.error('Error in /interview/respond:', error);
    res.status(500).json({ error: 'Failed to process response' });
  }
});

app.post('/interview/analyze', async (req, res) => {
  const { allStories, conversationHistory } = req.body;

  const analyzeSystemPrompt = `${SYSTEM_PROMPT}
  
  PHASE 2 (Pattern Detection):
  Analyze the provided stories and conversation history. 
  Identify the core behavioral loop that repeats across all stories.
  
  OUTPUT FORMAT (JSON):
  {
    "pattern_name": "A short, descriptive name in the user's words",
    "reflection": "The detailed 'Mirror' reflection (2-3 paragraphs)",
    "detected_tags": ["tag1", "tag2"],
    "graph_data": {
      "nodes": [
        { "type": "Relationship", "properties": { "name": "Story 1", "summary": "..." } },
        ...
      ],
      "relationships": [
         { "from": "Story 1", "to": "Pattern", "type": "SHOWS_PATTERN" },
         ...
      ]
    }
  }
  `;

  try {
    const aiResponse = await generateResponse(
      [{ role: 'user', content: 'Synthesize all stories and show me the mirror.' }],
      analyzeSystemPrompt
    );
    
    const parsed = JSON.parse(aiResponse);
    
    // TODO: Save to Neo4j here
    
    res.json(parsed);
  } catch (error) {
    console.error('Error in /interview/analyze:', error);
    res.status(500).json({ error: 'Failed to analyze patterns' });
  }
});

// Basic structure for testing
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    await initSchema();
  });
}

export default app;
