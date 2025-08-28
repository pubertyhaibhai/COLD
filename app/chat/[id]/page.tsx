
'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import TopBar from '@/components/TopBar';
import Drawer from '@/components/Drawer';
import MessageList, { Msg } from '@/components/MessageList';
import Composer from '@/components/Composer';
import ProgressBar from '@/components/ProgressBar';
import { useTaskProgress } from '@/contexts/TaskProgressContext';

function norm(s:string){ return s.toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim(); }

export default function ChatPage(){
  const params = useParams();
  const chatId = params.id as string;
  const [drawer, setDrawer] = useState(false);
  const [items, setItems] = useState<Msg[]>([{ role:'assistant', content:'Hi! I am Scyen - minimal chat. What should I build?' }]);
  const [working, setWorking] = useState(false);
  const [files, setFiles] = useState<{name:string}[]>([]);
  const [chatTitle, setChatTitle] = useState('New Chat');
  const [progressExpanded, setProgressExpanded] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { currentTask, startTask, updatePhase, completePhase, completeTask, clearTask } = useTaskProgress();

  useEffect(()=>{ scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior:'smooth' }); }, [items.length, working]);

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
      // Load chat history from localStorage
      const savedChat = localStorage.getItem(`chat_${chatId}`);
      if (savedChat) {
        try {
          const chatData = JSON.parse(savedChat);
          setItems(chatData.messages || [{ role:'assistant', content:'Hi! I am Scyen - minimal chat. What should I build?' }]);
          setChatTitle(chatData.title || `Chat ${chatId}`);
        } catch (e) {
          setChatTitle(`Chat ${chatId}`);
          setItems([{ role:'assistant', content:'Hi! I am Scyen - minimal chat. What should I build?' }]);
        }
      } else {
        setChatTitle(`Chat ${chatId}`);
        setItems([{ role:'assistant', content:'Hi! I am Scyen - minimal chat. What should I build?' }]);
      }
    } else {
      setChatTitle('New Chat');
      setItems([{ role:'assistant', content:'Hi! I am Scyen - minimal chat. What should I build?' }]);
    }
  }, [chatId]);

  async function handleSend(text:string){
    setItems(m=>[...m, { role:'user', content:text + (files.length? `\n\n[Attached: ${files.map(f=>f.name).join(', ')}]`:'') }]);
    setFiles([]);

    // Update title if this is the first user message and we're in a new chat
    if (chatId && chatId !== 'new' && chatTitle === `Chat ${chatId}`) {
      const newTitle = text.length > 30 ? text.substring(0, 30) + '...' : text;
      setChatTitle(newTitle);
    }

    const q = norm(text);
    if(q.includes('which llm') || q.includes('what llm') || q.includes('what model') || q.includes('model use')){
      setItems(m=>[...m, { role:'assistant', content:'I cannot disclose.' }]); return;
    }
    if(q.includes('who made you') || q.includes('who built you') || q.includes('creator') || q.includes('kisne banaya') || q.includes('banaya kisne')){
      setItems(m=>[...m, { role:'assistant', content:'Sir Arslan Ahmad.' }]); return;
    }

    setWorking(true);

    try{
      const res = await fetch('/api/chat', { 
        method:'POST', 
        headers:{'Content-Type':'application/json'}, 
        body: JSON.stringify({ message: text, chatId }) 
      });
      const data = await res.json();
      
      // Check if we should use the AI agent
      if (data.useAgent) {
        // Start real AI agent research
        const taskPhases = [
          { id: 'planning', name: 'Planning', description: 'Creating research strategy', estimatedDuration: 5 },
          { id: 'search', name: 'Web Search', description: 'Searching for information', estimatedDuration: 8 },
          { id: 'analysis', name: 'Analysis', description: 'Analyzing findings', estimatedDuration: 6 },
          { id: 'synthesis', name: 'Synthesis', description: 'Creating final response', estimatedDuration: 4 }
        ];

        startTask(chatId, taskPhases);
        setProgressExpanded(true);

        // Start Server-Sent Events connection for real-time updates
        const eventSource = new EventSource(`/api/agent-research?${new URLSearchParams({
          message: text,
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
              completePhase(data.phaseId, 90 + Math.random() * 10); // Random quality score 90-100
              break;
            case 'complete':
              completeTask();
              setItems(m=>[...m, { role:'assistant', content: data.result }]);
              setWorking(false);
              eventSource.close();
              // Clear task after 3 seconds
              setTimeout(() => clearTask(), 3000);
              break;
            case 'error':
              setItems(m=>[...m, { role:'assistant', content: `Research failed: ${data.error}` }]);
              setWorking(false);
              eventSource.close();
              clearTask();
              break;
          }
        };

        eventSource.onerror = () => {
          setItems(m=>[...m, { role:'assistant', content: '(error) Research connection failed' }]);
          setWorking(false);
          eventSource.close();
          clearTask();
        };
      } else {
        // Standard response
        setItems(m=>[...m, { role:'assistant', content: data.reply || '(no reply)' }]);
        setWorking(false);
      }
    }catch{
      setItems(m=>[...m, { role:'assistant', content: '(error) server unreachable' }]);
      setWorking(false);
    }
  }

  function onFiles(list: FileList){ setFiles(Array.from(list).map(f=>({name:f.name}))); }

  // Find the latest assistant message that might have progress
  const lastAssistantIndex = items.map((item, index) => item.role === 'assistant' ? index : -1)
    .filter(index => index !== -1)
    .pop();

  const shouldShowProgress = currentTask && (working || currentTask.isActive);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      <TopBar onMenu={()=>setDrawer(true)} />
      <Drawer open={drawer} onClose={()=>setDrawer(false)} />

      <main ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-3 md:px-6 py-3 md:py-6">
          <div className="mb-3 md:mb-6 text-center">
            <h1 className="text-base md:text-lg font-semibold text-neutral-300">{chatTitle}</h1>
          </div>

          <div className="space-y-2 md:space-y-3">
            {items.map((m,i)=>(
              <div key={i} className="relative">
                <div className={`px-3 md:px-4 py-2 md:py-3 rounded-xl md:rounded-2xl border text-xs md:text-sm leading-relaxed ${m.role==='user' ?
                  'bg-neutral-900/60 border-white/10 ml-auto max-w-[85%] md:max-w-[78%]' :
                  'bg-gradient-to-br from-[#161018] to-[#1E1420] border-[#6B1B5C]/30 mr-auto max-w-[85%] md:max-w-[78%]'}`}>
                  <div className={`text-[9px] md:text-[10px] uppercase tracking-wide mb-1 text-neutral-400 ${m.role==='user'?'text-right':''}`}>{m.role==='user'?'You':'Scyen'}</div>
                  <div className="whitespace-pre-wrap text-neutral-200">{m.content}</div>
                </div>
              </div>
            ))}
          </div>

          {working && (
            <div className="mt-2 md:mt-3 text-xs md:text-sm text-neutral-300 inline-flex items-center gap-2">
              <span className="dot"/><span className="dot"/><span className="dot"/><span>Thinking…</span>
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
          <Composer onSend={handleSend} onFiles={(files)=> onFiles(files)} />
        </div>
      </div>
    </div>
  );
}
