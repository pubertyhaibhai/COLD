import type { Metadata } from 'next';
import './globals.css';
import { TaskProgressProvider } from '@/contexts/TaskProgressContext';

export const metadata: Metadata = {
  title: 'Scyen AI',
  description: 'Minimal AI Chat Interface',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-neutral-950 text-neutral-100">
        <TaskProgressProvider>
          {children}
        </TaskProgressProvider>
      </body>
    </html>
  );
}