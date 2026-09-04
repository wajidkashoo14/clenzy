import type { Metadata } from 'next';
import { AgentTasksContent } from '@/features/agent/AgentTasksContent';

export const metadata: Metadata = {
  title: 'Agent Tasks',
  robots: { index: false, follow: false },
};

export default function AgentTasksPage() {
  return <AgentTasksContent />;
}
