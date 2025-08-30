'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface YouTubeDownloaderProps {
  isOpen: boolean;
  onClose: () => void;
  onDownloadStart: (url: string, format: 'mp4' | 'mp3') => void;
}

interface DownloadProgress {
  downloadId: string;
  percentage: number;
  speed: string;
  eta: string;
  size: string;
  status: 'started' | 'progress' | 'processing' | 'complete' | 'error';
  filename?: string;
  downloadUrl?: string;
  error?: string;
}

export default function YouTubeDownloader({ isOpen, onClose, onDownloadStart }: YouTubeDownloaderProps) {
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState<'mp4' | 'mp3'>('mp4');
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const validateYouTubeUrl = (url: string): boolean => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return youtubeRegex.test(url);
  };

  const startDownload = async () => {
    if (!url.trim() || !validateYouTubeUrl(url)) {
      alert('Please enter a valid YouTube URL');
      return;
    }

    setIsDownloading(true);
    setProgress(null);
    onDownloadStart(url, format);

    try {
      const response = await fetch('/api/download-youtube', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, format }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Download failed');
      }

      // Set up Server-Sent Events
      const eventSource = new EventSource(`/api/download-youtube`);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setProgress(data);

        if (data.type === 'complete') {
          setIsDownloading(false);
          eventSource.close();
        } else if (data.type === 'error') {
          setIsDownloading(false);
          eventSource.close();
        }
      };

      eventSource.onerror = () => {
        setIsDownloading(false);
        setProgress({
          downloadId: '',
          percentage: 0,
          speed: '',
          eta: '',
          size: '',
          status: 'error',
          error: 'Connection lost'
        });
        eventSource.close();
      };

    } catch (error) {
      setIsDownloading(false);
      setProgress({
        downloadId: '',
        percentage: 0,
        speed: '',
        eta: '',
        size: '',
        status: 'error',
        error: error instanceof Error ? error.message : 'Download failed'
      });
    }
  };

  const cancelDownload = async () => {
    if (progress?.downloadId && eventSourceRef.current) {
      try {
        await fetch(`/api/download-youtube?downloadId=${progress.downloadId}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error('Failed to cancel download:', error);
      }
      
      eventSourceRef.current.close();
      setIsDownloading(false);
      setProgress(null);
    }
  };

  const downloadFile = (downloadUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClose = () => {
    if (isDownloading) {
      cancelDownload();
    }
    setUrl('');
    setProgress(null);
    onClose();
  };

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-neutral-800 rounded-xl p-6 w-full max-w-md border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="text-red-500">📺</span>
                YouTube Downloader
              </h3>
              <button
                onClick={handleClose}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {!progress && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    YouTube URL
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:border-blue-500"
                    disabled={isDownloading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Format
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFormat('mp4')}
                      className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                        format === 'mp4'
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-neutral-700 border-neutral-600 text-neutral-300 hover:bg-neutral-600'
                      }`}
                      disabled={isDownloading}
                    >
                      MP4 (Video)
                    </button>
                    <button
                      onClick={() => setFormat('mp3')}
                      className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                        format === 'mp3'
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-neutral-700 border-neutral-600 text-neutral-300 hover:bg-neutral-600'
                      }`}
                      disabled={isDownloading}
                    >
                      MP3 (Audio)
                    </button>
                  </div>
                </div>

                <button
                  onClick={startDownload}
                  disabled={isDownloading || !url.trim()}
                  className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 disabled:bg-neutral-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {isDownloading ? 'Starting...' : 'Download'}
                </button>
              </div>
            )}

            {progress && (
              <div className="space-y-4">
                {progress.status === 'started' && (
                  <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p className="text-neutral-300">Starting download...</p>
                  </div>
                )}

                {progress.status === 'progress' && (
                  <div>
                    <div className="flex justify-between text-sm text-neutral-300 mb-2">
                      <span>Downloading...</span>
                      <span>{progress.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-neutral-700 rounded-full h-2 mb-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress.percentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-neutral-400">
                      <span>Speed: {progress.speed}</span>
                      <span>ETA: {progress.eta}</span>
                    </div>
                  </div>
                )}

                {progress.status === 'processing' && (
                  <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p className="text-neutral-300">Processing file...</p>
                  </div>
                )}

                {progress.status === 'complete' && (
                  <div className="text-center">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-white">✓</span>
                    </div>
                    <p className="text-green-400 mb-2">Download complete!</p>
                    <p className="text-sm text-neutral-300 mb-4">
                      {progress.filename} ({progress.size})
                    </p>
                    <button
                      onClick={() => progress.downloadUrl && progress.filename && downloadFile(progress.downloadUrl, progress.filename)}
                      className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      Download to Device
                    </button>
                    <p className="text-xs text-neutral-400 mt-2">
                      File will be deleted in 3 minutes
                    </p>
                  </div>
                )}

                {progress.status === 'error' && (
                  <div className="text-center">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-white">✕</span>
                    </div>
                    <p className="text-red-400 mb-2">Download failed</p>
                    <p className="text-sm text-neutral-300 mb-4">{progress.error}</p>
                    <button
                      onClick={() => setProgress(null)}
                      className="w-full py-2 px-4 bg-neutral-600 hover:bg-neutral-700 text-white rounded-lg transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                )}

                {isDownloading && (
                  <button
                    onClick={cancelDownload}
                    className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    Cancel Download
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

