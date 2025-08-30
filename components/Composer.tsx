'use client';
import { useRef, useState, useEffect } from 'react';

interface ComposerProps {
  onSend: (t: string) => void;
  onFiles: (files: FileList) => void;
  onDeepSearch: (query: string) => void;
  onYouTubeDownload: (url: string, format: 'mp4' | 'mp3') => void;
  deepSearchActive?: boolean;
  onDeepSearchToggle?: (active: boolean) => void;
}

export default function Composer({ 
  onSend, 
  onFiles, 
  onDeepSearch, 
  onYouTubeDownload,
  deepSearchActive = false, 
  onDeepSearchToggle 
}: ComposerProps) {
  const [v, setV] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showYouTubeDownloader, setShowYouTubeDownloader] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const send = () => {
    const t = v.trim();
    if (!t) return;
    setV('');
    
    if (deepSearchActive) {
      // If Deep Search is active, use deep search
      onDeepSearch(t);
      // Turn off Deep Search after use
      onDeepSearchToggle?.(false);
    } else {
      // Normal send
      onSend(t);
    }
  };

  const handleDeepSearchActivate = () => {
    setShowDropdown(false);
    onDeepSearchToggle?.(true);
  };

  const handleYouTubeDownload = () => {
    setShowDropdown(false);
    setShowYouTubeDownloader(true);
  };

  const handleYouTubeDownloadStart = (url: string, format: 'mp4' | 'mp3') => {
    onYouTubeDownload(url, format);
    setShowYouTubeDownloader(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <div className="flex gap-1.5 md:gap-2 items-center relative">
        <input 
          ref={ref} 
          type="file" 
          multiple 
          accept="image/*,application/pdf,.doc,.docx,.txt,.csv,.xlsx"
          className="hidden" 
          onChange={e => e.target.files && onFiles(e.target.files)} 
        />
        
        {/* Plus Button with Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="px-2 md:px-3 py-2 md:py-3 rounded-lg border border-white/10 hover:border-white/20 text-xs md:text-sm bg-neutral-900 hover:bg-neutral-800 transition-colors flex items-center justify-center"
            title="Options"
          >
            <span className="text-lg font-bold text-white">+</span>
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div className="absolute bottom-full left-0 mb-2 bg-neutral-800 border border-white/10 rounded-lg shadow-lg min-w-[200px] z-50">
              <button
                onClick={() => {
                  ref.current?.click();
                  setShowDropdown(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-neutral-700 rounded-t-lg flex items-center gap-2 text-sm text-white"
              >
                <img src="/send-file-icon.ico" alt="Send File" className="w-4 h-4" />
                Send File/Media
              </button>
              <button
                onClick={handleDeepSearchActivate}
                className="w-full px-3 py-2 text-left hover:bg-neutral-700 flex items-center gap-2 text-sm text-white"
              >
                <img src="/deep-search-icon.ico" alt="Deep Search" className="w-4 h-4" />
                Deep Search
              </button>
              <button
                onClick={handleYouTubeDownload}
                className="w-full px-3 py-2 text-left hover:bg-neutral-700 rounded-b-lg flex items-center gap-2 text-sm text-white"
              >
                <span className="text-red-500 text-sm">📺</span>
                Download from YouTube
              </button>
            </div>
          )}
        </div>

        <button className="px-2 md:px-3 py-2 md:py-3 rounded-lg border border-white/10 hover:border-white/20 text-xs md:text-sm flex items-center justify-center" title="Agent">
          <img src="/ai-logo.ico" alt="AI Agent" className="w-6 h-6 md:w-8 md:h-8" />
        </button>
        
        <div className="flex-1 relative">
          <input 
            value={v} 
            onChange={e => setV(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && send()} 
            placeholder={deepSearchActive ? "Type your search query..." : "Type a message…"}
            className={`w-full rounded-lg bg-neutral-900 border px-3 md:px-4 py-2 md:py-3 outline-none text-xs md:text-sm ${
              deepSearchActive 
                ? 'border-blue-500/60 focus:border-blue-500 pr-10' 
                : 'border-white/10 focus:border-[#D78AC5]/60'
            }`}
          />
          
          {/* Deep Search Indicator */}
          {deepSearchActive && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              <img src="/deep-search-icon.ico" alt="Deep Search Active" className="w-4 h-4" />
              <button
                onClick={() => onDeepSearchToggle?.(false)}
                className="text-blue-400 hover:text-blue-300 text-xs"
                title="Cancel Deep Search"
              >
                ✕
              </button>
            </div>
          )}
        </div>
        
        <button 
          onClick={send} 
          className={`px-3 md:px-4 py-2 md:py-3 rounded-lg text-white text-xs md:text-sm transition-colors ${
            deepSearchActive
              ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600'
              : 'bg-gradient-to-r from-[#6B1B5C] to-[#D78AC5] hover:from-[#7A1F66] hover:to-[#E094CF]'
          }`}
        >
          {deepSearchActive ? 'Search' : 'Send'}
        </button>
      </div>

      {/* YouTube Downloader Modal */}
      {showYouTubeDownloader && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-800 rounded-xl p-6 w-full max-w-md border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="text-red-500">📺</span>
                YouTube Downloader
              </h3>
              <button
                onClick={() => setShowYouTubeDownloader(false)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="text-neutral-300 text-sm mb-4">
              I'll help you download videos from YouTube. Please paste the YouTube URL in the chat and I'll guide you through the process!
            </p>
            <button
              onClick={() => {
                setShowYouTubeDownloader(false);
                setV('I want to download a YouTube video: ');
              }}
              className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Start in Chat
            </button>
          </div>
        </div>
      )}
    </>
  );
}
