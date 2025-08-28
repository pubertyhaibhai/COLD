'use client';
import { motion } from 'framer-motion';

function CTA({ href, children }:{ href:string, children:React.ReactNode }){
  return (<a href={href} className="btn btn-shine">{children}</a>);
}

export default function Landing(){
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="sticky top-0 z-30 bg-neutral-950/70 backdrop-blur border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <div className="font-semibold">ScynV <span className="text-[#F4AFCB]">AI</span></div>
          <nav className="ml-auto flex items-center gap-3 text-sm">
            <a href="#features" className="px-3 py-2 rounded-lg hover:bg-white/5">Features</a>
            <a href="#pricing" className="px-3 py-2 rounded-lg hover:bg-white/5">Pricing</a>
            <a href="/chat" className="px-3 py-2 rounded-lg hover:bg-white/5">Open Chat</a>
          </nav>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 pt-14 pb-10 grid md:grid-cols-2 gap-8 items-center">
        <div>
          <motion.h1 initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:.25}}
            className="text-3xl md:text-5xl font-semibold leading-tight">
            Create Anything — <span className="text-[#F4AFCB]">App</span>, <span className="text-[#F4AFCB]">Website</span>, <span className="text-[#F4AFCB]">Research</span>
          </motion.h1>
          <p className="mt-4 text-neutral-300">Deep research, app making, HTML/React games, Telegram/Discord bots, file tools — all in one sandboxed workspace.</p>
          <div className="mt-6 flex gap-3">
            <CTA href="/chat">✨ Try Chat</CTA>
            <CTA href="#pricing">See Pricing</CTA>
          </div>
          <div className="mt-3 text-xs text-neutral-400">No model disclosure. Creator: <b>Sir Arslan Ahmad</b>.</div>
        </div>
        <motion.div initial={{opacity:0,scale:.97}} animate={{opacity:1,scale:1}} transition={{duration:.25}}
          className="rounded-2xl border border-white/10 bg-neutral-900/30 p-4">
          <div className="aspect-video rounded-xl border border-white/10 bg-gradient-to-br from-[#161018] to-[#201424] grid place-items-center text-neutral-400">
            <div className="text-center">
              <div className="text-sm">Non-interactable showcase</div>
              <div className="mt-2 text-xs">Chat preview with minimal UI</div>
            </div>
          </div>
        </motion.div>
      </section>

      <section id="features" className="max-w-6xl mx-auto px-4 py-10 grid md:grid-cols-3 gap-4">
        {[
          ['Deep Research','Cited reports & docs'],
          ['App & APK','Expo/Flutter builds'],
          ['Bots','Telegram & Discord'],
          ['Websites','Next.js, Vercel deploy'],
          ['Games','2D HTML/React games'],
          ['Files','Process & generate media'],
        ].map(([t,s],i)=> (
          <motion.div key={i} initial={{opacity:0,y:8}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
            transition={{duration:.2, delay:i*.04}} className="rounded-xl border border-white/10 p-4 bg-neutral-900/30">
            <div className="text-sm font-semibold">{t}</div>
            <div className="text-xs text-neutral-400 mt-1">{s}</div>
          </motion.div>
        ))}
      </section>

      <section id="pricing" className="max-w-6xl mx-auto px-4 py-14">
        <h2 className="text-2xl font-semibold">Pricing</h2>
        <div className="mt-6 grid md:grid-cols-3 gap-4">
          {[
            {name:'Free', price:'₹0', tagline:'30 free messages/day · 1 APK build', cta:'/chat'},
            {name:'249', price:'₹249', tagline:'4.5k credits · 9 APK builds · 100 credits = 40 msgs', cta:'/chat'},
            {name:'499', price:'₹499', tagline:'9.2k credits · 20 APK builds · 100 credits = 40 msgs', cta:'/chat'},
          ].map((p,i)=> (
            <motion.div key={i} initial={{opacity:0,y:8}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
              transition={{duration:.2, delay:i*.05}} className="rounded-2xl border border-white/10 p-5 bg-neutral-900/30">
              <div className="text-lg font-semibold">{p.name}</div>
              <div className="text-3xl mt-2">{p.price}</div>
              <div className="text-xs text-neutral-400 mt-2">{p.tagline}</div>
              <a href={p.cta} className="btn btn-shine inline-block mt-4">Start</a>
            </motion.div>
          ))}
        </div>
        <div className="mt-3 text-xs text-neutral-400">Daily credit reset at 00:00 IST (free & pro).</div>
      </section>

      <footer className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-6 text-xs text-neutral-500">© Scyen AI</div>
      </footer>
    </main>
  );
}
