
import { NextRequest, NextResponse } from 'next/server';
import { AIAgent } from '@/lib/aiAgent';

function guardrails(q: string) {
  const s = q.toLowerCase();
  if (/(which|what)\s+(llm|model)/.test(s)) return 'I can\'t disclose.';
  if (/(who\s+(made|built)\s+you|creator|kisne\s+banaya)/.test(s)) return 'Sir Arslan Ahmad.';
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
    return NextResponse.json({ reply: '(demo) I would research, plan, and execute. Tell me your goal!' });
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
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=' + geminiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: message }] }] })
    });
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '(no reply)';
    return NextResponse.json({ reply: text });
  } catch {
    return NextResponse.json({ reply: '(error) model unreachable' });
  }
}
