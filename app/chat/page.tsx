'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ChatPage(){
  const router = useRouter();

  useEffect(() => {
    // Redirect to a new chat
    router.push('/chat/new');
  }, [router]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
      <div className="text-neutral-400">Redirecting...</div>
    </div>
  );
}