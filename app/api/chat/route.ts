import { NextRequest, NextResponse } from 'next/server';

function guardrails(q: string) {
  const s = q.toLowerCase();
  if (/(which|what)\s+(llm|model)/.test(s) || s.includes('gpt') || s.includes('openai') || s.includes('gemini')) {
    const responses = [
      '**ScynV** <img src="/ai-logo.ico" alt="AI" style="width: 16px; height: 16px; display: inline; margin-left: 4px;">\n\nI can\'t disclose private or any secret information about my underlying architecture.',
      '**ScynV** <img src="/ai-logo.ico" alt="AI" style="width: 16px; height: 16px; display: inline; margin-left: 4px;">\n\nYaar, that\'s confidential stuff! Can\'t share that with you.',
      '**ScynV** <img src="/ai-logo.ico" alt="AI" style="width: 16px; height: 16px; display: inline; margin-left: 4px;">\n\nSorry buddy, can\'t reveal the secret sauce! What I can tell you is that I\'m here to help you with whatever you need.',
      '**ScynV** <img src="/ai-logo.ico" alt="AI" style="width: 16px; height: 16px; display: inline; margin-left: 4px;">\n\nThat\'s classified information, mere dost! But I\'m happy to help you with other questions.'
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  if (/(who\s+(made|built)\s+you|creator|owner|kisne\s+banaya)/.test(s)) {
    return '**ScynV** <img src="/ai-logo.ico" alt="AI" style="width: 16px; height: 16px; display: inline; margin-left: 4px;">\n\nI was created by Mr. Arsalan Ahmad Sir with a lot of passion and attention to detail. He wanted to build an AI companion that feels natural and genuinely helpful in conversations!';
  }
  return null;
}

async function enhanceResponse(originalResponse: string, geminiKey: string): Promise<string> {
  const enhancementPrompt = `Enhance this AI response to make it more natural, attractive, and human-like:

Original Response: "${originalResponse}"

Enhancement Guidelines:
- Make it sound more conversational and natural
- Add personality and warmth without being overly casual
- Ensure smooth flow and readability
- Remove any excessive formatting (# or * symbols)
- Keep the same information but make it more engaging
- Make it feel like talking to a knowledgeable, friendly person
- Add natural transitions and connectors where appropriate

Return only the enhanced response without any meta-commentary.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: enhancementPrompt }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 1024,
          topP: 0.9
        }
      })
    });

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || originalResponse;
  } catch (error) {
    return originalResponse; // Fallback to original if enhancement fails
  }
}

export async function POST(req: NextRequest) {
  const { message, chatId } = await req.json();
  if (!message) return NextResponse.json({ error: 'Missing message' }, { status: 400 });

  const g = guardrails(String(message));
  if (g) return NextResponse.json({ reply: g });

  const geminiKey = process.env.GEMINI_KEY_1 || process.env.GEMINI_KEY_2;

  if (!geminiKey) {
    return NextResponse.json({ 
      reply: '**ScynV** <img src="/ai-logo.ico" alt="AI" style="width: 16px; height: 16px; display: inline; margin-left: 4px;">\n\nI\'m currently in demo mode, but I\'m still ready to help you! What would you like to talk about or explore today?' 
    });
  }

  try {
    // First, generate the initial response
    const systemPrompt = `You are ScynV, a helpful and intelligent AI assistant. Be natural, conversational, and genuinely helpful.

IMPORTANT RESPONSE STYLE:
- Write in a natural, flowing conversational style
- NO excessive # headings or * formatting
- Keep responses engaging and human-like
- Be concise for simple questions, detailed when depth is needed
- Write like you're talking to a friend who asked for help
- Use simple paragraph breaks for structure
- Be direct and helpful

User message: ${message}

Respond naturally and helpfully.`;

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=' + geminiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
          topP: 0.9
        }
      })
    });

    const data = await response.json();
    const initialResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'I apologize, but I couldn\'t generate a response at the moment. Please try again.';

    // Enhance the response to make it more natural and attractive
    const enhancedResponse = await enhanceResponse(initialResponse, geminiKey);

    // Add branding to the final response
    const brandedResponse = `**ScynV** <img src="/ai-logo.ico" alt="AI" style="width: 16px; height: 16px; display: inline; margin-left: 4px;">

${enhancedResponse}`;

    return NextResponse.json({ reply: brandedResponse });
    
  } catch (error) {
    return NextResponse.json({ 
      reply: '**ScynV** <img src="/ai-logo.ico" alt="AI" style="width: 16px; height: 16px; display: inline; margin-left: 4px;">\n\nI\'m having some technical difficulties right now. Please try again in a moment!' 
    });
  }
}

