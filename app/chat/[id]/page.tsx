'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import TopBar from '@/components/TopBar';
import Drawer from '@/components/Drawer';
import MessageList, { Msg } from '@/components/MessageList';
import Composer from '@/components/Composer';
import ProgressBar from '@/components/ProgressBar';
import { useTaskProgress } from '@/contexts/TaskProgressContext';

function norm(s: string) { 
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim(); 
}

export default function ChatPage() {
  const params = useParams();
  const chatId = params.id as string;
  const [drawer, setDrawer] = useState(false);
  const [items, setItems] = useState<Msg[]>([{ 
    role: 'assistant', 
    content: '**ScynV** <img src="/ai-logo.ico" alt="AI" style="width: 16px; height: 16px; display: inline; margin-left: 4px;">\n\nHey there! I\'m ScynV, your intelligent AI companion. I can help you with research, analyze files, answer questions, and much more. What would you like to explore today?' 
  }]);
  const [working, setWorking] = useState(false);
  const [files, setFiles] = useState<{ name: string }[]>([]);
  const [chatTitle, setChatTitle] = useState('New Chat');
  const [progressExpanded, setProgressExpanded] = useState(true);
  const [deepSearchActive, setDeepSearchActive] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { currentTask, startTask, updatePhase, completePhase, completeTask, clearTask } = useTaskProgress();

  useEffect(() => { 
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); 
  }, [items.length, working]);

  // Save chat history when items change
  useEffect(() => {
    if (chatId && chatId !== 'new' && items.length > 0) {
      const chatData = {
        messages: items,
        title: chatTitle,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(`chat_${chatId}`, JSON.stringify(chatData));
    }
  }, [items, chatTitle, chatId]);

  // Load chat history when chatId changes
  useEffect(() => {
    if (chatId && chatId !== 'new') {
      const savedChat = localStorage.getItem(`chat_${chatId}`);
      if (savedChat) {
        try {
          const chatData = JSON.parse(savedChat);
          setItems(chatData.messages || [{ 
            role: 'assistant', 
            content: '**ScynV** <img src="/ai-logo.ico" alt="AI" style="width: 16px; height: 16px; display: inline; margin-left: 4px;">\n\nHey there! I\'m ScynV, your intelligent AI companion. I can help you with research, analyze files, answer questions, and much more. What would you like to explore today?' 
          }]);
          setChatTitle(chatData.title || `Chat ${chatId}`);
        } catch (e) {
          setChatTitle(`Chat ${chatId}`);
          setItems([{ 
            role: 'assistant', 
            content: '**ScynV** <img src="/ai-logo.ico" alt="AI" style="width: 16px; height: 16px; display: inline; margin-left: 4px;">\n\nHey there! I\'m ScynV, your intelligent AI companion. I can help you with research, analyze files, answer questions, and much more. What would you like to explore today?' 
          }]);
        }
      } else {
        setChatTitle(`Chat ${chatId}`);
        setItems([{ 
          role: 'assistant', 
          content: '**ScynV** <img src="/ai-logo.ico" alt="AI" style="width: 16px; height: 16px; display: inline; margin-left: 4px;">\n\nHey there! I\'m ScynV, your intelligent AI companion. I can help you with research, analyze files, answer questions, and much more. What would you like to explore today?' 
        }]);
      }
    } else {
      setChatTitle('New Chat');
      setItems([{ 
        role: 'assistant', 
        content: '**ScynV** <img src="/ai-logo.ico" alt="AI" style="width: 16px; height: 16px; display: inline; margin-left: 4px;">\n\nHey there! I\'m ScynV, your intelligent AI companion. I can help you with research, analyze files, answer questions, and much more. What would you like to explore today?' 
      }]);
    }
  }, [chatId]);

  async function handleSend(text: string) {
    setItems(m => [...m, { 
      role: 'user', 
      content: text + (files.length ? `\n\n[Attached: ${files.map(f => f.name).join(', ')}]` : '') 
    }]);
    setFiles([]);

    // Update title if this is the first user message and we're in a new chat
    if (chatId && chatId !== 'new' && chatTitle === `Chat ${chatId}`) {
      const newTitle = text.length > 30 ? text.substring(0, 30) + '...' : text;
      setChatTitle(newTitle);
    }

    const q = norm(text);
    if (q.includes('which llm') || q.includes('what llm') || q.includes('what model') || q.includes('model use')) {
      setItems(m => [...m, { 
        role: 'assistant', 
        content: '**ScynV** <img src="/ai-logo.ico" alt="AI" style="width: 16px; height: 16px; display: inline; margin-left: 4px;">\n\nI can\'t disclose private or any secret information about my underlying architecture. What I can tell you is that I\'m designed to be helpful, harmless, and honest in all our conversations!' 
      }]); 
      return;
    }
    if (q.includes('who made you') || q.includes('who built you') || q.includes('creator') || q.includes('kisne banaya') || q.includes('banaya kisne')) {
      setItems(m => [...m, { 
        role: 'assistant', 
        content: '**ScynV** <img src="/ai-logo.ico" alt="AI" style="width: 16px; height: 16px; display: inline; margin-left: 4px;">\n\nI was created by Mr. Arsalan Ahmad Sir with a lot of care and attention to detail. He wanted to build an AI companion that feels natural and helpful in conversations!' 
      }]); 
      return;
    }

    setWorking(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, chatId })
      });
      const data = await res.json();

      if (data.reply) {
        setItems(m => [...m, { role: 'assistant', content: data.reply }]);
        setWorking(false);
      } else {
        setItems(m => [...m, { role: 'assistant', content: '**ScynV** <img src="/ai-logo.ico" alt="AI" style="width: 16px; height: 16px; display: inline; margin-left: 4px;">\n\nI apologize, but I couldn\'t process your request at the moment. Please try again!' }]);
        setWorking(false);
      }
    } catch {
      setItems(m => [...m, { role: 'assistant', content: '**ScynV** <img src="/ai-logo.ico" alt="AI" style="width: 16px; height: 16px; display: inline; margin-left: 4px;">\n\nI\'m having trouble connecting right now. Please check your connection and try again!' }]);
      setWorking(false);
    }
  }

  async function handleDeepSearch(query: string) {
    setItems(m => [...m, { role: 'user', content: `🔍 Deep Search: ${query}` }]);

    // Update title if this is the first user message and we're in a new chat
    if (chatId && chatId !== 'new' && chatTitle === `Chat ${chatId}`) {
      const newTitle = query.length > 30 ? query.substring(0, 30) + '...' : query;
      setChatTitle(newTitle);
    }

    setWorking(true);

    try {
      // Start deep search task
      const taskPhases = [
        { id: 'query_enhancement', name: 'Query Enhancement', description: 'Optimizing search strategy', estimatedDuration: 3 },
        { id: 'deep_search', name: 'Deep Search', description: 'Searching multiple sources', estimatedDuration: 8 },
        { id: 'synthesis', name: 'Information Synthesis', description: 'Analyzing and connecting data', estimatedDuration: 6 },
        { id: 'humanization', name: 'Response Creation', description: 'Crafting natural response', estimatedDuration: 4 }
      ];

      startTask(chatId, taskPhases);
      setProgressExpanded(true);

      // Start Server-Sent Events connection for real-time updates
      const eventSource = new EventSource(`/api/deep-search?${new URLSearchParams({
        query: query,
        chatId: chatId
      })}`);

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'phase_start':
            // Phase already exists, just mark as active
            break;
          case 'phase_update':
            updatePhase(data.phaseId, { qualityScore: data.progress });
            break;
          case 'phase_complete':
            completePhase(data.phaseId, 85 + Math.random() * 15); // Random quality score 85-100
            break;
          case 'complete':
            completeTask();
            setItems(m => [...m, { role: 'assistant', content: data.result }]);
            setWorking(false);
            eventSource.close();
            // Clear task after 3 seconds
            setTimeout(() => clearTask(), 3000);
            break;
          case 'error':
            setItems(m => [...m, { 
              role: 'assistant', 
              content: `**ScynV** <img src="/ai-logo.ico" alt="AI" style="width: 16px; height: 16px; display: inline; margin-left: 4px;">\n\nI encountered an issue with the deep search: ${data.error}. Let me try a regular response instead.` 
            }]);
            setWorking(false);
            eventSource.close();
            clearTask();
            break;
        }
      };

      eventSource.onerror = () => {
        setItems(m => [...m, { 
          role: 'assistant', 
          content: '**ScynV** <img src="/ai-logo.ico" alt="AI" style="width: 16px; height: 16px; display: inline; margin-left: 4px;">\n\nThe deep search connection was interrupted. Let me provide a regular response instead.' 
        }]);
        setWorking(false);
        eventSource.close();
        clearTask();
      };

    } catch (error) {
      setItems(m => [...m, { 
        role: 'assistant', 
        content: '**ScynV** <img src="/ai-logo.ico" alt="AI" style="width: 16px; height: 16px; display: inline; margin-left: 4px;">\n\nI\'m having trouble with the deep search right now. Please try again or use regular chat!' 
      }]);
      setWorking(false);
      clearTask();
    }
  }

  async function handleYouTubeDownload(url: string, format: 'mp4' | 'mp3') {
    // Add user message
    setItems(m => [...m, { 
      role: 'user', 
      content: `📺 Download YouTube ${format.toUpperCase()}: ${url}` 
    }]);

    // Add AI response indicating download start
    setItems(m => [...m, { 
      role: 'assistant', 
      content: `**ScynV** <img src="/ai-logo.ico" alt="AI" style="width: 16px; height: 16px; display: inline; margin-left: 4px;">

I'll help you download that YouTube video as ${format.toUpperCase()}. Starting the download process now...` 
    }]);

    setWorking(true);

    try {
      // Start download task
      const taskPhases = [
        { id: 'validation', name: 'URL Validation', description: 'Validating YouTube URL', estimatedDuration: 2 },
        { id: 'extraction', name: 'Video Extraction', description: 'Extracting video information', estimatedDuration: 5 },
        { id: 'download', name: 'Downloading', description: 'Downloading video/audio', estimatedDuration: 15 },
        { id: 'processing', name: 'Processing', description: 'Converting and finalizing', estimatedDuration: 8 }
      ];

      startTask(chatId, taskPhases);
      setProgressExpanded(true);

      // Start Server-Sent Events connection for real-time updates
      const response = await fetch('/api/download-youtube', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, format, chatId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Download failed');
      }

      // Set up Server-Sent Events for progress
      const eventSource = new EventSource(`/api/download-youtube`);

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'started':
            updatePhase('validation', { qualityScore: 100 });
            completePhase('validation', 100);
            break;
          case 'progress':
            updatePhase('download', { qualityScore: data.percentage });
            if (data.percentage >= 100) {
              completePhase('download', 95);
            }
            break;
          case 'processing':
            completePhase('download', 95);
            updatePhase('processing', { qualityScore: 50 });
            break;
          case 'complete':
            completePhase('processing', 100);
            completeTask();
            
            // Add completion message with download link
            setItems(m => [...m, { 
              role: 'assistant', 
              content: `**ScynV** <img src="/ai-logo.ico" alt="AI" style="width: 16px; height: 16px; display: inline; margin-left: 4px;">

Great! Your ${format.toUpperCase()} download is ready. Here are the details:

📁 **File:** ${data.filename}
📊 **Size:** ${data.size}
⏰ **Available for:** 3 minutes

<a href="${data.downloadUrl}" download="${data.filename}" style="display: inline-block; background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 8px 16px; border-radius: 8px; text-decoration: none; font-weight: 500; margin-top: 8px;">📥 Download to Device</a>

The file will be automatically deleted from our servers in 3 minutes for your privacy and security.` 
            }]);
            
            setWorking(false);
            eventSource.close();
            // Clear task after 3 seconds
            setTimeout(() => clearTask(), 3000);
            break;
          case 'error':
            setItems(m => [...m, { 
              role: 'assistant', 
              content: `**ScynV** <img src="/ai-logo.ico" alt="AI" style="width: 16px; height: 16px; display: inline; margin-left: 4px;">

I encountered an issue while downloading the video: ${data.error}

This could be due to:
- The video being private or restricted
- Copyright protection
- Network connectivity issues
- Server limitations

Please try again with a different video or check if the URL is accessible.` 
            }]);
            setWorking(false);
            eventSource.close();
            clearTask();
            break;
        }
      };

      eventSource.onerror = () => {
        setItems(m => [...m, { 
          role: 'assistant', 
          content: '**ScynV** <img src="/ai-logo.ico" alt="AI" style="width: 16px; height: 16px; display: inline; margin-left: 4px;">\n\nThe download connection was interrupted. Please try again.' 
        }]);
        setWorking(false);
        eventSource.close();
        clearTask();
      };

    } catch (error) {
      setItems(m => [...m, { 
        role: 'assistant', 
        content: `**ScynV** <img src="/ai-logo.ico" alt="AI" style="width: 16px; height: 16px; display: inline; margin-left: 4px;">

I'm having trouble starting the YouTube download: ${error instanceof Error ? error.message : 'Unknown error'}

Please make sure:
- The URL is a valid YouTube link
- You haven't exceeded the download limit (5 per hour)
- The video is publicly accessible

Try again in a moment!` 
      }]);
      setWorking(false);
      clearTask();
    }
  }

  function onFiles(list: FileList) { 
    setFiles(Array.from(list).map(f => ({ name: f.name }))); 
  }

  const shouldShowProgress = currentTask && (working || currentTask.isActive);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      <TopBar onMenu={() => setDrawer(true)} />
      <Drawer open={drawer} onClose={() => setDrawer(false)} />

      <main ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-3 md:px-6 py-3 md:py-6">
          <div className="mb-3 md:mb-6 text-center">
            <h1 className="text-base md:text-lg font-semibold text-neutral-300">{chatTitle}</h1>
          </div>

          <div className="space-y-2 md:space-y-3">
            {items.map((m, i) => (
              <div key={i} className="relative">
                <div className={`px-3 md:px-4 py-2 md:py-3 rounded-xl md:rounded-2xl border text-xs md:text-sm leading-relaxed ${m.role === 'user' ?
                  'bg-neutral-900/60 border-white/10 ml-auto max-w-[85%] md:max-w-[78%]' :
                  'bg-gradient-to-br from-[#161018] to-[#1E1420] border-[#6B1B5C]/30 mr-auto max-w-[85%] md:max-w-[78%]'}`}>
                  <div className={`text-[9px] md:text-[10px] uppercase tracking-wide mb-1 text-neutral-400 ${m.role === 'user' ? 'text-right' : ''}`}>
                    {m.role === 'user' ? 'You' : 'ScynV'}
                  </div>
                  <div 
                    className="whitespace-pre-wrap text-neutral-200" 
                    dangerouslySetInnerHTML={{ __html: m.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                  />
                </div>
              </div>
            ))}
          </div>

          {working && (
            <div className="mt-2 md:mt-3 text-xs md:text-sm text-neutral-300 inline-flex items-center gap-2">
              <span className="dot" /><span className="dot" /><span className="dot" /><span>Thinking…</span>
            </div>
          )}
        </div>
      </main>

      <div className="border-t border-white/10 p-3 md:p-4">
        <div className="max-w-3xl mx-auto space-y-2 md:space-y-3">
          {/* Progress bar above composer */}
          {shouldShowProgress && (
            <ProgressBar 
              isExpanded={progressExpanded} 
              onToggle={() => setProgressExpanded(!progressExpanded)} 
            />
          )}
          <Composer 
            onSend={handleSend} 
            onFiles={onFiles}
            onDeepSearch={handleDeepSearch}
            onYouTubeDownload={handleYouTubeDownload}
            deepSearchActive={deepSearchActive}
            onDeepSearchToggle={setDeepSearchActive}
          />
        </div>
      </div>
    </div>
  );
}

