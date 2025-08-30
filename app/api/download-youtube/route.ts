import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { existsSync, mkdirSync, unlinkSync, statSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

interface DownloadRequest {
  url: string;
  format: 'mp4' | 'mp3';
  chatId?: string;
}

interface DownloadProgress {
  percentage: number;
  speed: string;
  eta: string;
  size: string;
}

// Rate limiting storage (in production, use Redis)
const rateLimits = new Map<string, { count: number; resetTime: number }>();
const MAX_DOWNLOADS_PER_HOUR = 5;

// Active downloads tracking
const activeDownloads = new Map<string, { process: any; startTime: number }>();

// File cleanup tracking
const fileCleanupTimers = new Map<string, NodeJS.Timeout>();

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const limit = rateLimits.get(clientId);
  
  if (!limit || now > limit.resetTime) {
    rateLimits.set(clientId, { count: 1, resetTime: now + 3600000 }); // 1 hour
    return true;
  }
  
  if (limit.count >= MAX_DOWNLOADS_PER_HOUR) {
    return false;
  }
  
  limit.count++;
  return true;
}

function parseProgress(line: string): DownloadProgress | null {
  // Parse yt-dlp progress output
  const progressMatch = line.match(/\[download\]\s+(\d+\.?\d*)%\s+of\s+([^\s]+)\s+at\s+([^\s]+)\s+ETA\s+([^\s]+)/);
  if (progressMatch) {
    return {
      percentage: parseFloat(progressMatch[1]),
      size: progressMatch[2],
      speed: progressMatch[3],
      eta: progressMatch[4]
    };
  }
  return null;
}

function scheduleFileCleanup(filePath: string, downloadId: string) {
  // Clean up file after 3 minutes
  const timer = setTimeout(() => {
    try {
      if (existsSync(filePath)) {
        unlinkSync(filePath);
        console.log(`Cleaned up file: ${filePath}`);
      }
      fileCleanupTimers.delete(downloadId);
    } catch (error) {
      console.error(`Error cleaning up file ${filePath}:`, error);
    }
  }, 3 * 60 * 1000); // 3 minutes
  
  fileCleanupTimers.set(downloadId, timer);
}

export async function POST(req: NextRequest) {
  try {
    const { url, format, chatId }: DownloadRequest = await req.json();
    
    if (!url || !format) {
      return NextResponse.json({ 
        error: 'Missing required parameters: url and format' 
      }, { status: 400 });
    }

    // Basic YouTube URL validation
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    if (!youtubeRegex.test(url)) {
      return NextResponse.json({ 
        error: 'Invalid YouTube URL' 
      }, { status: 400 });
    }

    // Rate limiting
    const clientId = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(clientId)) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded. Maximum 5 downloads per hour.' 
      }, { status: 429 });
    }

    const downloadId = randomUUID();
    const tempDir = join('/tmp', 'youtube-downloads');
    
    // Create temp directory if it doesn't exist
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }

    // Set up Server-Sent Events
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      start(controller) {
        let outputPath = '';
        let finalFilename = '';
        
        // yt-dlp command based on format
        const ytDlpArgs = [
          url,
          '--no-playlist',
          '--extract-flat', 'false',
          '--output', join(tempDir, `${downloadId}.%(ext)s`),
          '--progress',
          '--newline'
        ];

        if (format === 'mp3') {
          ytDlpArgs.push(
            '--extract-audio',
            '--audio-format', 'mp3',
            '--audio-quality', '192K'
          );
        } else {
          ytDlpArgs.push(
            '--format', 'best[height<=720]',
            '--merge-output-format', 'mp4'
          );
        }

        const ytDlpProcess = spawn('yt-dlp', ytDlpArgs, {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        activeDownloads.set(downloadId, { process: ytDlpProcess, startTime: Date.now() });

        // Send initial status
        const initialData = JSON.stringify({ 
          type: 'started', 
          downloadId, 
          message: 'Starting download...' 
        });
        controller.enqueue(encoder.encode(`data: ${initialData}\n\n`));

        ytDlpProcess.stdout.on('data', (data) => {
          const lines = data.toString().split('\n');
          for (const line of lines) {
            if (line.trim()) {
              console.log('yt-dlp stdout:', line);
              
              // Parse progress
              const progress = parseProgress(line);
              if (progress) {
                const progressData = JSON.stringify({
                  type: 'progress',
                  downloadId,
                  ...progress
                });
                controller.enqueue(encoder.encode(`data: ${progressData}\n\n`));
              }
              
              // Check for completion
              if (line.includes('[download] 100%') || line.includes('has already been downloaded')) {
                const statusData = JSON.stringify({
                  type: 'processing',
                  downloadId,
                  message: 'Processing file...'
                });
                controller.enqueue(encoder.encode(`data: ${statusData}\n\n`));
              }
            }
          }
        });

        ytDlpProcess.stderr.on('data', (data) => {
          const errorLine = data.toString();
          console.error('yt-dlp stderr:', errorLine);
          
          if (errorLine.includes('ERROR')) {
            const errorData = JSON.stringify({
              type: 'error',
              downloadId,
              error: 'Download failed: ' + errorLine
            });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
            controller.close();
            activeDownloads.delete(downloadId);
          }
        });

        ytDlpProcess.on('close', (code) => {
          activeDownloads.delete(downloadId);
          
          if (code === 0) {
            // Find the downloaded file
            try {
              const files = require('fs').readdirSync(tempDir);
              const downloadedFile = files.find(f => f.startsWith(downloadId));
              
              if (downloadedFile) {
                outputPath = join(tempDir, downloadedFile);
                finalFilename = downloadedFile.replace(downloadId + '.', '');
                
                // Get file size
                const stats = statSync(outputPath);
                const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
                
                // Schedule cleanup
                scheduleFileCleanup(outputPath, downloadId);
                
                const completeData = JSON.stringify({
                  type: 'complete',
                  downloadId,
                  filename: finalFilename,
                  size: `${fileSizeInMB} MB`,
                  downloadUrl: `/api/download-file/${downloadId}/${encodeURIComponent(finalFilename)}`
                });
                controller.enqueue(encoder.encode(`data: ${completeData}\n\n`));
              } else {
                const errorData = JSON.stringify({
                  type: 'error',
                  downloadId,
                  error: 'Downloaded file not found'
                });
                controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
              }
            } catch (error) {
              const errorData = JSON.stringify({
                type: 'error',
                downloadId,
                error: 'Error processing downloaded file'
              });
              controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
            }
          } else {
            const errorData = JSON.stringify({
              type: 'error',
              downloadId,
              error: `Download failed with code ${code}`
            });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          }
          
          controller.close();
        });

        ytDlpProcess.on('error', (error) => {
          activeDownloads.delete(downloadId);
          const errorData = JSON.stringify({
            type: 'error',
            downloadId,
            error: 'Failed to start download: ' + error.message
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        });
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Download failed'
    }, { status: 500 });
  }
}

// Cancel download endpoint
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const downloadId = searchParams.get('downloadId');
    
    if (!downloadId) {
      return NextResponse.json({ error: 'Missing downloadId' }, { status: 400 });
    }
    
    const download = activeDownloads.get(downloadId);
    if (download) {
      download.process.kill('SIGTERM');
      activeDownloads.delete(downloadId);
      
      // Clear cleanup timer if exists
      const timer = fileCleanupTimers.get(downloadId);
      if (timer) {
        clearTimeout(timer);
        fileCleanupTimers.delete(downloadId);
      }
      
      return NextResponse.json({ message: 'Download cancelled' });
    }
    
    return NextResponse.json({ error: 'Download not found' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to cancel download' }, { status: 500 });
  }
}

