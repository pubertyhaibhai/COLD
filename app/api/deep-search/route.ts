import { NextRequest, NextResponse } from 'next/server';
import { HumanizedAIAgent } from '@/lib/humanizedAiAgent';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query');
  const chatId = searchParams.get('chatId');
  
  if (!query) {
    return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
  }
  
  const geminiKey = process.env.GEMINI_KEY_1 || process.env.GEMINI_KEY_2;
  const searchKey = process.env.GOOGLE_SEARCH_API_KEY;

  if (!geminiKey) {
    return NextResponse.json({ 
      error: 'Demo mode - Deep search requires API configuration' 
    }, { status: 400 });
  }

  if (!searchKey) {
    return NextResponse.json({ 
      error: 'Search functionality not available - missing search API key' 
    }, { status: 400 });
  }

  // Set up Server-Sent Events
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      const agent = new HumanizedAIAgent(geminiKey, searchKey, {
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

      // Start the deep search
      agent.performDeepSearch(query)
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

