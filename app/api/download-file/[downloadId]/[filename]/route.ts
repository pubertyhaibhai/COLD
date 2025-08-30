import { NextRequest, NextResponse } from 'next/server';
import { existsSync, createReadStream, statSync } from 'fs';
import { join } from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: { downloadId: string; filename: string } }
) {
  try {
    const { downloadId, filename } = params;
    
    if (!downloadId || !filename) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const tempDir = join('/tmp', 'youtube-downloads');
    
    // Find the actual file (it will have the downloadId prefix)
    const actualFilename = require('fs').readdirSync(tempDir)
      .find((f: string) => f.startsWith(downloadId));
    
    if (!actualFilename) {
      return NextResponse.json({ 
        error: 'File not found or has expired' 
      }, { status: 404 });
    }
    
    const filePath = join(tempDir, actualFilename);
    
    if (!existsSync(filePath)) {
      return NextResponse.json({ 
        error: 'File not found or has expired' 
      }, { status: 404 });
    }

    // Get file stats
    const stats = statSync(filePath);
    const fileSize = stats.size;
    
    // Determine content type based on file extension
    const ext = actualFilename.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (ext) {
      case 'mp4':
        contentType = 'video/mp4';
        break;
      case 'mp3':
        contentType = 'audio/mpeg';
        break;
      case 'webm':
        contentType = 'video/webm';
        break;
      case 'm4a':
        contentType = 'audio/mp4';
        break;
    }

    // Handle range requests for video streaming
    const range = req.headers.get('range');
    
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;
      
      const stream = createReadStream(filePath, { start, end });
      
      return new Response(stream as any, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${decodeURIComponent(filename)}"`,
          'Cache-Control': 'no-cache'
        }
      });
    } else {
      // Regular download
      const stream = createReadStream(filePath);
      
      return new Response(stream as any, {
        headers: {
          'Content-Type': contentType,
          'Content-Length': fileSize.toString(),
          'Content-Disposition': `attachment; filename="${decodeURIComponent(filename)}"`,
          'Cache-Control': 'no-cache'
        }
      });
    }
    
  } catch (error) {
    console.error('File download error:', error);
    return NextResponse.json({ 
      error: 'Failed to download file' 
    }, { status: 500 });
  }
}

