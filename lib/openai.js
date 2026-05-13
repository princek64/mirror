import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

let openai;

const getOpenAI = () => {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('OPENAI_API_KEY is missing. AI features will be unavailable.');
      return null;
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
};

export default getOpenAI;

export const generateResponse = async (messages, systemPrompt) => {
  const client = getOpenAI();
  if (!client) throw new Error('OpenAI client not initialized');
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });
  return response.choices[0].message.content;
};

export const transcribeAudio = async (buffer) => {
  const client = getOpenAI();
  if (!client) throw new Error('OpenAI client not initialized');
  const file = await OpenAI.toFile(buffer, 'audio.webm');
  const transcription = await client.audio.transcriptions.create({
    file: file,
    model: 'whisper-1',
  });
  return transcription.text;
};
