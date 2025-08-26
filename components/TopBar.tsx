'use client';
import { useEffect, useState } from 'react';
export default function TopBar({ onMenu }:{ onMenu:()=>void }){
  const [show,setShow]=useState(false);
  const [me,setMe]=useState<any>(null);
  const [cr,setCr]=useState<any>(null);
  useEffect(()=>{ fetch('/api/me').then(r=>r.json()).then(setMe).catch(()=>{}); fetch('/api/credits').then(r=>r.json()).then(setCr).catch(()=>{}); },[]);
  const initials=(me?.name||me?.email||'U').slice(0,1).toUpperCase();
  return (
    <header className="px-4 md:px-6 py-3 border-b border-white/10 sticky top-0 bg-neutral-950/80 backdrop-blur z-30">
      <div className="max-w-5xl mx-auto flex items-center gap-3">
        <button onClick={onMenu} className="px-2 py-2 rounded-lg border border-white/10 hover:border-white/20">☰</button>
        <div className="font-semibold">scyen <span className="text-[#F4AFCB]">chat</span></div>
        <div className="ml-auto flex items-center gap-2">
          <button className="px-2 py-2 rounded-lg border border-white/10" title="Notifications">🔔</button>
          <div className="relative">
            <button onClick={()=>setShow(v=>!v)} className="px-2 py-2 rounded-lg border border-white/10" title="Credits">✨</button>
            {show && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-white/10 bg-neutral-900/95 p-3 shadow-xl">
                <div className="text-sm text-neutral-300">Credits</div>
                <div className="mt-1 text-2xl font-semibold">{cr?.credits ?? '—'}</div>
                <div className="text-xs text-neutral-500">Plan: {cr?.plan ?? '—'}</div>
                <div className="mt-2 text-xs text-neutral-400">Daily reset at 00:00 IST</div>
              </div>
            )}
          </div>
          <button className="w-9 h-9 rounded-full bg-gradient-to-br from-[#824C8B] to-[#D78AC5] grid place-items-center text-white text-sm">{initials}</button>
          <button className="px-2 py-2 rounded-lg border border-white/10">⋮</button>
        </div>
      </div>
    </header>
  );
}
