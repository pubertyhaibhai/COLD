
'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function Drawer({ open, onClose }:{ open:boolean, onClose:()=>void }){
  const [items,setItems]=useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(()=>{ 
    if(open) {
      setLoading(true);
      
      // Get saved chats from localStorage
      const savedChats = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('chat_')) {
          try {
            const chatData = JSON.parse(localStorage.getItem(key) || '{}');
            const chatId = key.replace('chat_', '');
            savedChats.push({
              id: chatId,
              title: chatData.title || `Chat ${chatId}`,
              updated_at: chatData.lastUpdated || new Date().toISOString()
            });
          } catch (e) {
            // Skip invalid chat data
          }
        }
      }
      
      // Sort by last updated
      savedChats.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      
      fetch('/api/chats')
        .then(r=>r.json())
        .then(d=> {
          // Combine API chats with saved chats, prioritizing saved ones
          const apiChats = d?.items || [];
          const allChats = [...savedChats];
          
          // Add API chats that aren't already in saved chats
          apiChats.forEach((apiChat: any) => {
            if (!savedChats.find(saved => saved.id === apiChat.id)) {
              allChats.push(apiChat);
            }
          });
          
          setItems(allChats);
          setLoading(false);
        })
        .catch(()=> {
          setItems(savedChats.length > 0 ? savedChats : [{id:'1',title:'Welcome chat'}]);
          setLoading(false);
        });
    }
  },[open]);

  const handleNewTask = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New task' })
      });
      const data = await res.json();
      onClose();
      router.push(`/chat/${data.id || 'new'}`);
    } catch (error) {
      console.error('Failed to create new chat:', error);
      onClose();
      router.push('/chat');
    }
    setLoading(false);
  };

  const handleChatClick = (chatId: string) => {
    onClose();
    if (pathname !== `/chat/${chatId}`) {
      router.push(`/chat/${chatId}`);
    }
  };

  return (<>
    {open && <div className="fixed inset-0 bg-black/40 z-20" onClick={onClose}/>}
    {open && (
      <aside className="fixed left-0 top-0 h-full w-[82%] max-w-xs bg-neutral-950 border-r border-white/10 p-4 z-30">
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold">Chats</div>
          <button onClick={onClose} className="px-2 py-1 rounded-lg border border-white/10 hover:border-white/20">✕</button>
        </div>
        
        <button 
          onClick={handleNewTask}
          disabled={loading}
          className="w-full mb-3 px-3 py-2 rounded-lg bg-neutral-900 border border-white/10 text-sm hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '...' : '+ New task'}
        </button>
        
        <div className="space-y-1 max-h-[calc(100vh-140px)] overflow-y-auto">
          {loading ? (
            <div className="px-3 py-2 text-sm text-neutral-400">Loading...</div>
          ) : (
            items.map((c:any)=> (
              <button
                key={c.id}
                onClick={() => handleChatClick(c.id)}
                className={`w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-sm border transition-colors ${
                  pathname === `/chat/${c.id}` 
                    ? 'border-[#D78AC5]/30 bg-[#D78AC5]/5' 
                    : 'border-white/0 hover:border-white/10'
                }`}
              >
                <div className="truncate">{c.title}</div>
                {c.updated_at && (
                  <div className="text-xs text-neutral-500 mt-1">
                    {new Date(c.updated_at).toLocaleDateString()}
                  </div>
                )}
              </button>
            ))
          )}
          {!loading && items.length === 0 && (
            <div className="px-3 py-2 text-sm text-neutral-400">No chats yet</div>
          )}
        </div>
      </aside>
    )}
  </>);
}
