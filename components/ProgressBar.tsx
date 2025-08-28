
'use client';
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTaskProgress, TaskPhase } from '@/contexts/TaskProgressContext';

interface ProgressBarProps {
  isExpanded: boolean;
  onToggle: () => void;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ isExpanded, onToggle }) => {
  const { currentTask } = useTaskProgress();
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!currentTask?.isActive) return;

    const interval = setInterval(() => {
      const minutes = Math.floor(currentTask.estimatedTimeRemaining / 60);
      const seconds = currentTask.estimatedTimeRemaining % 60;
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentTask?.estimatedTimeRemaining, currentTask?.isActive]);

  if (!currentTask) return null;

  const currentPhaseData = currentTask.phases.find(p => p.id === currentTask.currentPhase);
  const completedPhases = currentTask.phases.filter(p => p.status === 'completed');
  const avgQuality = completedPhases.length > 0
    ? completedPhases.reduce((sum, p) => sum + (p.qualityScore || 0), 0) / completedPhases.length
    : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="bg-gradient-to-br from-[#161018] to-[#1E1420] border border-[#6B1B5C]/30 rounded-xl overflow-hidden"
      >
        {/* Header with toggle */}
        <motion.div 
          onClick={onToggle}
          className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-[#D78AC5] rounded-full animate-pulse" />
            <span className="text-sm font-medium text-neutral-200">
              ScynV Research Agent
            </span>
            <span className="text-xs text-neutral-400">
              {Math.round(currentTask.overallProgress)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            {timeLeft && (
              <span className="text-xs text-neutral-400">{timeLeft}</span>
            )}
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-neutral-400"
            >
              ↑
            </motion.div>
          </div>
        </motion.div>

        {/* Compact progress bar */}
        <div className="px-3 pb-2">
          <div className="h-1.5 bg-neutral-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#6B1B5C] to-[#D78AC5]"
              initial={{ width: 0 }}
              animate={{ width: `${currentTask.overallProgress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="border-t border-white/10"
            >
              <div className="p-4 pt-3">
                {/* Current phase info */}
                {currentPhaseData && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mb-4 p-3 bg-[#6B1B5C]/10 border border-[#6B1B5C]/20 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-[#D78AC5]">
                        {currentPhaseData.name}
                      </h4>
                      <div className="flex items-center gap-2">
                        {currentPhaseData.status === 'active' && (
                          <div className="w-1.5 h-1.5 bg-[#D78AC5] rounded-full animate-pulse" />
                        )}
                        <span className="text-xs text-neutral-400">
                          {currentPhaseData.status}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-neutral-400">
                      {currentPhaseData.description}
                    </p>
                  </motion.div>
                )}

                {/* Phase list */}
                <div className="space-y-2">
                  {currentTask.phases.map((phase, index) => (
                    <motion.div
                      key={phase.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                        phase.status === 'active' 
                          ? 'bg-[#6B1B5C]/20 border border-[#6B1B5C]/30' 
                          : phase.status === 'completed'
                          ? 'bg-green-900/20 border border-green-500/30'
                          : 'bg-neutral-800/30'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${
                        phase.status === 'completed' 
                          ? 'bg-green-500' 
                          : phase.status === 'active'
                          ? 'bg-[#D78AC5] animate-pulse'
                          : 'bg-neutral-600'
                      }`} />
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-neutral-200">
                            {phase.name}
                          </span>
                          {phase.qualityScore && (
                            <span className="text-xs text-green-400">
                              {phase.qualityScore.toFixed(0)}%
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-neutral-400">
                          {phase.description}
                        </div>
                      </div>
                      
                      <div className="text-xs text-neutral-500">
                        {phase.estimatedDuration}s
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Stats */}
                <div className="flex justify-between text-xs text-neutral-400 pt-2 border-t border-white/10">
                  <span>Elapsed: {Math.floor(currentTask.elapsedTime / 60)}:{(currentTask.elapsedTime % 60).toString().padStart(2, '0')}</span>
                  {avgQuality && (
                    <span>Avg Quality: {avgQuality.toFixed(0)}%</span>
                  )}
                  <span>{currentTask.phases.filter(p => p.status === 'completed').length}/{currentTask.phases.length} done</span>
                </div>

                {/* Error state */}
                {currentTask.error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-3 p-2 bg-red-900/20 border border-red-500/30 rounded-lg"
                  >
                    <div className="text-sm text-red-300 flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      Error: {currentTask.error}
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProgressBar;
