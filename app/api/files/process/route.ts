import { NextRequest, NextResponse } from 'next/server';
import { HumanizedAIAgent } from '@/lib/humanizedAiAgent';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const message = formData.get('message') as string;
    const files = formData.getAll('files') as File[];
    const chatId = formData.get('chatId') as string;

    if (!message && files.length === 0) {
      return NextResponse.json({ error: 'Missing message or files' }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_KEY_1 || process.env.GEMINI_KEY_2;
    const searchKey = process.env.GOOGLE_SEARCH_API_KEY;

    if (!geminiKey) {
      return NextResponse.json({ 
        reply: '**ScynV** <img src="/ai-logo.ico" alt="AI" style="width: 16px; height: 16px; display: inline; margin-left: 4px;">\n\nI\'m currently in demo mode, but I can still help you with basic tasks! What would you like to do?' 
      });
    }

    // Set up Server-Sent Events for real-time progress
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      start(controller) {
        const agent = new HumanizedAIAgent(geminiKey, searchKey || '', {
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

        // Convert File objects to FileList-like structure
        const fileList = {
          length: files.length,
          item: (index: number) => files[index] || null,
          [Symbol.iterator]: function* () {
            for (let i = 0; i < files.length; i++) {
              yield files[i];
            }
          }
        } as FileList;

        // Process the message with files
        agent.processMessage(message || 'Please analyze these files', fileList)
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

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'File processing failed'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'File processing endpoint ready' });
}

