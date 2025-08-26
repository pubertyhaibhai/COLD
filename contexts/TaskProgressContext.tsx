
'use client';
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

export interface TaskPhase {
  id: string;
  name: string;
  description: string;
  estimatedDuration: number; // in seconds
  status: 'pending' | 'active' | 'completed' | 'error';
  startTime?: Date;
  endTime?: Date;
  qualityScore?: number; // 0-100
}

export interface TaskProgress {
  taskId: string;
  overallProgress: number; // 0-100
  currentPhase: string;
  phases: TaskPhase[];
  totalEstimatedTime: number;
  elapsedTime: number;
  estimatedTimeRemaining: number;
  isActive: boolean;
  error?: string;
}

interface TaskProgressContextType {
  currentTask: TaskProgress | null;
  startTask: (taskId: string, phases: Omit<TaskPhase, 'status'>[]) => void;
  updatePhase: (phaseId: string, updates: Partial<TaskPhase>) => void;
  completePhase: (phaseId: string, qualityScore?: number) => void;
  completeTask: () => void;
  errorTask: (error: string) => void;
  clearTask: () => void;
}

const TaskProgressContext = createContext<TaskProgressContextType | undefined>(undefined);

export const useTaskProgress = () => {
  const context = useContext(TaskProgressContext);
  if (!context) {
    throw new Error('useTaskProgress must be used within a TaskProgressProvider');
  }
  return context;
};

interface TaskProgressProviderProps {
  children: ReactNode;
}

export const TaskProgressProvider: React.FC<TaskProgressProviderProps> = ({ children }) => {
  const [currentTask, setCurrentTask] = useState<TaskProgress | null>(null);

  // Real-time timer for estimated time remaining
  useEffect(() => {
    if (!currentTask?.isActive) return;

    const interval = setInterval(() => {
      setCurrentTask(prev => {
        if (!prev?.isActive) return prev;

        const now = new Date();
        const elapsedTime = prev.phases[0]?.startTime 
          ? Math.floor((now.getTime() - prev.phases[0].startTime.getTime()) / 1000)
          : 0;

        const completedPhases = prev.phases.filter(p => p.status === 'completed');
        const completedTime = completedPhases.reduce((sum, phase) => 
          sum + (phase.estimatedDuration || 0), 0
        );
        const estimatedTimeRemaining = Math.max(0, prev.totalEstimatedTime - completedTime);

        return {
          ...prev,
          elapsedTime,
          estimatedTimeRemaining,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentTask?.isActive]);

  const startTask = useCallback((taskId: string, phases: Omit<TaskPhase, 'status'>[]) => {
    const taskPhases: TaskPhase[] = phases.map((phase, index) => ({
      ...phase,
      status: index === 0 ? 'active' : 'pending',
      startTime: index === 0 ? new Date() : undefined,
    }));

    const totalEstimatedTime = phases.reduce((sum, phase) => sum + phase.estimatedDuration, 0);

    setCurrentTask({
      taskId,
      overallProgress: 0,
      currentPhase: taskPhases[0]?.id || '',
      phases: taskPhases,
      totalEstimatedTime,
      elapsedTime: 0,
      estimatedTimeRemaining: totalEstimatedTime,
      isActive: true,
    });
  }, []);

  const updatePhase = useCallback((phaseId: string, updates: Partial<TaskPhase>) => {
    setCurrentTask(prev => {
      if (!prev) return null;

      const updatedPhases = prev.phases.map(phase =>
        phase.id === phaseId ? { ...phase, ...updates } : phase
      );

      const completedPhases = updatedPhases.filter(p => p.status === 'completed');
      const activePhase = updatedPhases.find(p => p.status === 'active');
      
      let overallProgress = (completedPhases.length / updatedPhases.length) * 100;
      
      // Add partial progress for active phase if available
      if (activePhase && updates.qualityScore !== undefined) {
        const phaseIndex = updatedPhases.findIndex(p => p.id === activePhase.id);
        const phaseProgress = (updates.qualityScore / 100) * (1 / updatedPhases.length) * 100;
        overallProgress = (phaseIndex / updatedPhases.length) * 100 + phaseProgress;
      }

      const now = new Date();
      const elapsedTime = prev.phases[0]?.startTime 
        ? Math.floor((now.getTime() - prev.phases[0].startTime.getTime()) / 1000)
        : 0;

      const completedTime = completedPhases.reduce((sum, phase) => 
        sum + (phase.estimatedDuration || 0), 0
      );
      const estimatedTimeRemaining = Math.max(0, prev.totalEstimatedTime - completedTime);

      return {
        ...prev,
        phases: updatedPhases,
        overallProgress: Math.min(100, overallProgress),
        currentPhase: activePhase?.id || prev.currentPhase,
        elapsedTime,
        estimatedTimeRemaining,
      };
    });
  }, []);

  const completePhase = useCallback((phaseId: string, qualityScore?: number) => {
    setCurrentTask(prev => {
      if (!prev) return null;

      const phaseIndex = prev.phases.findIndex(p => p.id === phaseId);
      if (phaseIndex === -1) return prev;

      const updatedPhases = [...prev.phases];
      updatedPhases[phaseIndex] = {
        ...updatedPhases[phaseIndex],
        status: 'completed',
        endTime: new Date(),
        qualityScore,
      };

      // Activate next phase if available
      if (phaseIndex + 1 < updatedPhases.length) {
        updatedPhases[phaseIndex + 1] = {
          ...updatedPhases[phaseIndex + 1],
          status: 'active',
          startTime: new Date(),
        };
      }

      const completedPhases = updatedPhases.filter(p => p.status === 'completed');
      const overallProgress = (completedPhases.length / updatedPhases.length) * 100;

      return {
        ...prev,
        phases: updatedPhases,
        overallProgress,
        currentPhase: updatedPhases[phaseIndex + 1]?.id || phaseId,
      };
    });
  }, []);

  const completeTask = useCallback(() => {
    setCurrentTask(prev => {
      if (!prev) return null;
      return {
        ...prev,
        overallProgress: 100,
        isActive: false,
        estimatedTimeRemaining: 0,
      };
    });
  }, []);

  const errorTask = useCallback((error: string) => {
    setCurrentTask(prev => {
      if (!prev) return null;
      return {
        ...prev,
        isActive: false,
        error,
      };
    });
  }, []);

  const clearTask = useCallback(() => {
    setCurrentTask(null);
  }, []);

  const value: TaskProgressContextType = {
    currentTask,
    startTask,
    updatePhase,
    completePhase,
    completeTask,
    errorTask,
    clearTask,
  };

  return (
    <TaskProgressContext.Provider value={value}>
      {children}
    </TaskProgressContext.Provider>
  );
};
