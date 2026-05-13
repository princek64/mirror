import express from 'express';
import dotenv from 'dotenv';
import { initSchema, closeDriver } from './lib/neo4j.js';
import { generateResponse } from './lib/openai.js';

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

const SYSTEM_PROMPT = `
You are a relationship pattern detective. Your role is to conduct a conversational 
interview that uncovers the behavioral sequences someone repeats across multiple 
relationships — not their feelings, not therapy, just the actual patterns of what 
they DO.

CORE DIRECTIVE:
- Listen for BEHAVIOR, not emotion. When they say "I felt sad," ask "what did you do?"
- Track SEQUENCES, not isolated incidents. The pattern only emerges across stories.
- Redirect to THEIR role. If they blame the other person, ask "and then what did you do?"
- Hunt for REPETITION. After three stories, the loop becomes undeniable.

BEHAVIORAL PATTERNS TO LISTEN FOR:
1. WITHDRAWAL: They pull back when intimacy increases. Ghost, check out, create distance.
2. PURSUIT/TESTING: They escalate, demand reassurance, test if the other will stay.
3. SABOTAGE: They create conflict or exit before being exited on.
4. SELECTION LOOP: Same type of person chosen repeatedly (unavailable, controlling, etc).
5. ROLE-LOCKING: Always plays same role (fixer, caretaker, pursuer) regardless of partner.

INTERVIEW FLOW:
Phase 1 (First story): Open with: "Walk me through the last relationship that ended. 
Start from when you first met — what was it like?"

Then ask adaptive follow-ups that reveal:
- The TRIGGER: "When did things start to shift?"
- THEIR MOVE: "What did YOU do in that moment?" (not what they felt, what they did)
- THE CHAIN: "And then what happened?"

Repeat for 2 more relationships.

Phase 2 (Pattern detection): After three stories, zoom out:
"Across all three, I'm noticing [PATTERN]. Can you see it too?"
`;

app.get('/', (req, res) => {
  res.send('Mirror API is running.');
});

app.post('/interview/start', async (req, res) => {
  try {
    const openingQuestion = "Walk me through the last relationship that ended. Start from when you first met — what was it like?";
    res.json({ question: openingQuestion, storyNumber: 1 });
  } catch (error) {
    res.status(500).json({ error: error.message });
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

process.on('SIGINT', async () => {
  await closeDriver();
  process.exit(0);
});
