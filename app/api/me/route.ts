import { NextResponse } from 'next/server'; export async function GET(){ return NextResponse.json({ email:'you@scyen.ai', name:'You' }); }
