import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

interface CodeExecutionRequest {
  language: 'python' | 'javascript' | 'shell';
  code: string;
  timeout?: number;
}

interface CodeExecutionResponse {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
  files?: string[];
}

export async function POST(req: NextRequest) {
  try {
    const { language, code, timeout = 30000 }: CodeExecutionRequest = await req.json();
    
    if (!code || !language) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing code or language parameter' 
      }, { status: 400 });
    }

    const startTime = Date.now();
    const sessionId = randomUUID();
    const tempDir = join('/tmp', `code-execution-${sessionId}`);
    
    // Create temporary directory
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }

    let result: CodeExecutionResponse;

    try {
      switch (language) {
        case 'python':
          result = await executePython(code, tempDir, timeout);
          break;
        case 'javascript':
          result = await executeJavaScript(code, tempDir, timeout);
          break;
        case 'shell':
          result = await executeShell(code, tempDir, timeout);
          break;
        default:
          throw new Error(`Unsupported language: ${language}`);
      }
      
      result.executionTime = Date.now() - startTime;
      
    } finally {
      // Cleanup temporary directory
      try {
        if (existsSync(tempDir)) {
          const { execSync } = require('child_process');
          execSync(`rm -rf "${tempDir}"`);
        }
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
    }

    return NextResponse.json(result);
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Code execution failed',
      output: '',
      executionTime: 0
    }, { status: 500 });
  }
}

async function executePython(code: string, tempDir: string, timeout: number): Promise<CodeExecutionResponse> {
  const fileName = join(tempDir, 'script.py');
  writeFileSync(fileName, code);

  return new Promise((resolve) => {
    const process = spawn('python3', [fileName], {
      cwd: tempDir,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let error = '';

    process.stdout.on('data', (data) => {
      output += data.toString();
    });

    process.stderr.on('data', (data) => {
      error += data.toString();
    });

    const timeoutId = setTimeout(() => {
      process.kill('SIGKILL');
      resolve({
        success: false,
        error: 'Execution timeout',
        output: output,
        executionTime: timeout
      });
    }, timeout);

    process.on('close', (code) => {
      clearTimeout(timeoutId);
      resolve({
        success: code === 0,
        output: output || error,
        error: code !== 0 ? error : undefined,
        executionTime: 0 // Will be set by caller
      });
    });

    process.on('error', (err) => {
      clearTimeout(timeoutId);
      resolve({
        success: false,
        error: err.message,
        output: '',
        executionTime: 0
      });
    });
  });
}

async function executeJavaScript(code: string, tempDir: string, timeout: number): Promise<CodeExecutionResponse> {
  const fileName = join(tempDir, 'script.js');
  writeFileSync(fileName, code);

  return new Promise((resolve) => {
    const process = spawn('node', [fileName], {
      cwd: tempDir,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let error = '';

    process.stdout.on('data', (data) => {
      output += data.toString();
    });

    process.stderr.on('data', (data) => {
      error += data.toString();
    });

    const timeoutId = setTimeout(() => {
      process.kill('SIGKILL');
      resolve({
        success: false,
        error: 'Execution timeout',
        output: output,
        executionTime: timeout
      });
    }, timeout);

    process.on('close', (code) => {
      clearTimeout(timeoutId);
      resolve({
        success: code === 0,
        output: output || error,
        error: code !== 0 ? error : undefined,
        executionTime: 0
      });
    });

    process.on('error', (err) => {
      clearTimeout(timeoutId);
      resolve({
        success: false,
        error: err.message,
        output: '',
        executionTime: 0
      });
    });
  });
}

async function executeShell(code: string, tempDir: string, timeout: number): Promise<CodeExecutionResponse> {
  return new Promise((resolve) => {
    const process = spawn('bash', ['-c', code], {
      cwd: tempDir,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let error = '';

    process.stdout.on('data', (data) => {
      output += data.toString();
    });

    process.stderr.on('data', (data) => {
      error += data.toString();
    });

    const timeoutId = setTimeout(() => {
      process.kill('SIGKILL');
      resolve({
        success: false,
        error: 'Execution timeout',
        output: output,
        executionTime: timeout
      });
    }, timeout);

    process.on('close', (code) => {
      clearTimeout(timeoutId);
      resolve({
        success: code === 0,
        output: output || error,
        error: code !== 0 ? error : undefined,
        executionTime: 0
      });
    });

    process.on('error', (err) => {
      clearTimeout(timeoutId);
      resolve({
        success: false,
        error: err.message,
        output: '',
        executionTime: 0
      });
    });
  });
}

