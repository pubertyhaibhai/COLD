
import { NextResponse } from 'next/server';

export async function GET(){
  return NextResponse.json({ items:[
    { id:'1', title:'Welcome chat', updated_at: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
    { id:'2', title:'Portfolio website plan', updated_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
    { id:'3', title:'APK build attempt', updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
    { id:'4', title:'React game development', updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString() },
  ]});
}

export async function POST(req: Request){ 
  const { title } = await req.json();
  const newId = 'chat-' + Date.now();
  return NextResponse.json({ id: newId, title: title || 'New task' }); 
}
