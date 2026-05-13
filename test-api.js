import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function runTest() {
  console.log('🚀 Starting Mirror API Evals...');

  try {
    // 1. Test /interview/start
    console.log('\n--- Testing /interview/start ---');
    const startRes = await fetch(`${BASE_URL}/interview/start`, { method: 'POST' });
    const startData = await startRes.json();
    console.log('Response:', startData);
    if (!startData.question) throw new Error('Failed to get opening question');

    // 2. Test /interview/respond (Simulate first response)
    console.log('\n--- Testing /interview/respond (Story 1) ---');
    const respondRes = await fetch(`${BASE_URL}/interview/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript: "We met at a coffee shop. It was great but I felt I had to fix all his problems.",
        history: [{ role: 'assistant', content: startData.question }],
        storyNumber: 1
      })
    });
    const respondData = await respondRes.json();
    console.log('Response:', respondData);
    if (!respondData.question) throw new Error('Failed to get follow-up question');

    // 3. Test /interview/analyze (Simulate final synthesis)
    console.log('\n--- Testing /interview/analyze ---');
    const analyzeRes = await fetch(`${BASE_URL}/interview/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        allStories: ["Story 1 content...", "Story 2 content..."],
        conversationHistory: []
      })
    });
    const analyzeData = await analyzeRes.json();
    console.log('Response:', analyzeData);
    if (!analyzeData.reflection) throw new Error('Failed to get mirror reflection');

    console.log('\n✅ All API tests passed locally!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('Make sure the server is running with "node api/index.js"');
  }
}

runTest();
