import React from 'react';
export type Msg = { role: 'user'|'assistant', content: string };
export default function MessageList({ items }:{ items: Msg[] }){
  return (
    <div className="space-y-3">
      {items.map((m,i)=>(
        <div key={i} className={`px-4 py-3 rounded-2xl border text-sm leading-relaxed ${m.role==='user' ?
          'bg-neutral-900/60 border-white/10 ml-auto max-w-[78%]' :
          'bg-gradient-to-br from-[#161018] to-[#1E1420] border-[#6B1B5C]/30 mr-auto max-w-[78%]'}`}>
          <div className={`text-[10px] uppercase tracking-wide mb-1 text-neutral-400 ${m.role==='user'?'text-right':''}`}>{m.role==='user'?'You':'Scyen'}</div>
          <div className="whitespace-pre-wrap text-neutral-200">{m.content}</div>
        </div>
      ))}
    </div>
  );
}
