import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export async function POST(req: NextRequest){
  try{
    const form = await req.formData();
    const files = form.getAll('files');
    const out: any[] = [];
    for (const it of files){
      if (typeof it === 'string') continue;
      const f = it as File;
      out.push({ name: f.name, url: undefined });
    }
    return NextResponse.json({ files: out });
  }catch{
    return NextResponse.json({ files: [] });
  }
}
