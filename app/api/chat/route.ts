
import { NextRequest, NextResponse } from 'next/server';
import { AIAgent } from '@/lib/aiAgent';

function guardrails(q: string) {
  const s = q.toLowerCase();
  if (/(which|what)\s+(llm|model)/.test(s) || s.includes('gpt') || s.includes('openai') || s.includes('gemini')) {
    const responses = [
      'I can\'t disclose private or any secret information.',
      'Yaar, that\'s confidential stuff! Can\'t share that.',
      'Sorry buddy, can\'t reveal the secret sauce! 🤐',
      'That\'s classified information, mere dost!'
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  if (/(who\s+(made|built)\s+you|creator|owner|kisne\s+banaya)/.test(s)) return 'Cheering owner made by Mr. Arsalan Ahmad Sir.';
  return null;
}

function shouldUseAgent(message: string): boolean {
  const triggers = [
    'research', 'find', 'list', 'search', 'popular', 'best', 'top',
    'compare', 'analyze', 'investigate', 'explore', 'discover'
  ];
  const lowercaseMessage = message.toLowerCase();
  return triggers.some(trigger => lowercaseMessage.includes(trigger));
}

export async function POST(req: NextRequest) {
  const { message, chatId } = await req.json();
  if (!message) return NextResponse.json({ error: 'Missing message' }, { status: 400 });

  const g = guardrails(String(message));
  if (g) return NextResponse.json({ reply: g });

  const geminiKey = process.env.GEMINI_KEY_1 || process.env.GEMINI_KEY_2;
  const searchKey = process.env.GOOGLE_SEARCH_API_KEY;

  if (!geminiKey) {
    return NextResponse.json({ reply: 'Demo mode mein hun! But still ready to help. Batao kya karna hai! 🚀' });
  }

  // Check if this should use the AI agent for research
  if (shouldUseAgent(message) && searchKey) {
    return NextResponse.json({ 
      reply: 'Starting autonomous research...', 
      useAgent: true,
      message: message,
      chatId: chatId
    });
  }

  // Standard Gemini response for non-research queries
  try {
    const systemPrompt = `You are ScynV, a helpful AI assistant. Be natural and conversational.

IMPORTANT RULES:
- DO NOT use # headings or excessive * formatting
- Keep responses SHORT and CONCISE for simple questions
- Only give LONG detailed answers when the question specifically requires depth
- Write like you're talking naturally to a friend
- Use simple paragraph breaks instead of markdown formatting
- Be direct and to the point

User: ${message}`;

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=' + geminiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 512
        }
      })
    });
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '(no reply)';
    return NextResponse.json({ reply: text });
  } catch {
    return NextResponse.json({ reply: '(error) model unreachable' });
  }
}
