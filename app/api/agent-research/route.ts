
import { NextRequest, NextResponse } from 'next/server';
import { AIAgent } from '@/lib/aiAgent';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const message = searchParams.get('message');
  const chatId = searchParams.get('chatId');
  
  if (!message) {
    return NextResponse.json({ error: 'Missing message parameter' }, { status: 400 });
  }
  
  const geminiKey = process.env.GEMINI_KEY_1 || process.env.GEMINI_KEY_2;
  const searchKey = process.env.GOOGLE_SEARCH_API_KEY;

  if (!geminiKey || !searchKey) {
    return NextResponse.json({ error: 'Missing API keys' }, { status: 400 });
  }

  // Set up Server-Sent Events
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      const agent = new AIAgent(geminiKey, searchKey, {
        onPhaseStart: (phaseId: string, description: string) => {
          const data = JSON.stringify({ type: 'phase_start', phaseId, description });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        },
        onPhaseUpdate: (phaseId: string, progress: number, data?: any) => {
          const updateData = JSON.stringify({ type: 'phase_update', phaseId, progress, data });
          controller.enqueue(encoder.encode(`data: ${updateData}\n\n`));
        },
        onPhaseComplete: (phaseId: string, result: any) => {
          const data = JSON.stringify({ type: 'phase_complete', phaseId, result });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        },
        onError: (error: string) => {
          const data = JSON.stringify({ type: 'error', error });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          controller.close();
        }
      });

      // Start the research
      agent.performResearch(message)
        .then((result) => {
          const data = JSON.stringify({ type: 'complete', result });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          controller.close();
        })
        .catch((error) => {
          const data = JSON.stringify({ type: 'error', error: error.message });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          controller.close();
        });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
