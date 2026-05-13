import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default openai;

export const generateResponse = async (messages, systemPrompt) => {
  const response = await openai.chat.completions.create({
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
