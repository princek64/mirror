import { generateResponse } from './lib/openai.js';

const messages = [
  { role: 'user', content: 'Say hello in a way that sounds like a relationship pattern detective.' }
];

const systemPrompt = "You are a relationship pattern detective. Focus on behavior and patterns.";

try {
  console.log('Testing OpenAI connection...');
  const response = await generateResponse(messages, systemPrompt);
  console.log('OpenAI Response:', response);
} catch (error) {
  console.error('OpenAI Error:', error);
}
