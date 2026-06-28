import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { LoginView } from '@/features/auth/LoginView';
import { useTimeline } from '@/features/timeline/useTimeline';
import { useInsights } from '@/features/insights/useInsights';
import { SummaryView } from '@/features/insights/SummaryView';
import { KeyPointsView } from '@/features/insights/KeyPointsView';
import { useChat } from '@/features/chat/useChat';
import { ChatView } from '@/features/chat/ChatView';
import { useExport } from '@/features/export/useExport';
import { useTranscriptCopy } from '@/features/transcript/useTranscriptCopy';
import { Header } from '@/ui/components/Header';
import { MainView } from '@/ui/components/MainView';
import { Toaster } from '@/ui/toast/Toaster';
import { useToast } from '@/ui/toast/ToastContext';

type View = 'main' | 'summary' | 'keypoints' | 'chat' | 'login';

/** Top-level panel: owns feature hooks, view routing and keyboard shortcuts. */
export function Panel() {
  const { show } = useToast();
  const auth = useAuth();
  const timeline = useTimeline();
  const insights = useInsights();
  const chat = useChat();
  const exporter = useExport();
  const transcriptCopy = useTranscriptCopy();
  const [view, setView] = useState<View>('main');

  const handleClear = useCallback(async () => {
    await timeline.clearAll();
    insights.reset();
    chat.reset();
  }, [timeline, insights, chat]);

  const onAuthClick = useCallback(() => {
    if (auth.status === 'logged-in') {
      auth.logout();
      setView('main');
      show('Successfully logged out.', 'success');
    } else {
      setView('login');
    }
  }, [auth, show]);

  // Keyboard shortcuts (Ctrl+Shift+…). Latest handlers are read via a ref so the
  // listener is attached once (ARCHITECTURE.md A.15).
  const actionsRef = useRef<Record<string, () => void>>({});
  actionsRef.current = {
    S: () => void timeline.addScreenshot(),
    Y: () => setView('summary'),
    H: () => setView('main'),
    K: () => setView('keypoints'),
    L: () => setView('main'),
    C: () => void handleClear(),
    T: () => void transcriptCopy.copy(),
    P: () => void exporter.downloadPdf(),
    U: () => void exporter.uploadPdf(),
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!event.ctrlKey || !event.shiftKey) return;
      const action = actionsRef.current[event.key.toUpperCase()];
      if (action) {
        event.preventDefault();
        action();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <div id="clip-insights-notepad">
      <div id="clipinsights__body">
        <Header authStatus={auth.status} onAuthClick={onAuthClick} />

        {view === 'main' && (
          <MainView
            timeline={timeline}
            exporter={exporter}
            transcriptCopy={transcriptCopy}
            onOpenSummary={() => setView('summary')}
            onOpenKeypoints={() => setView('keypoints')}
            onOpenChat={() => setView('chat')}
            onClear={() => void handleClear()}
          />
        )}
        {view === 'summary' && <SummaryView insights={insights} onClose={() => setView('main')} />}
        {view === 'keypoints' && <KeyPointsView insights={insights} onClose={() => setView('main')} />}
        {view === 'chat' && <ChatView chat={chat} onClose={() => setView('main')} />}
        {view === 'login' && <LoginView onLogin={auth.login} onBack={() => setView('main')} />}
      </div>
      <Toaster />
    </div>
  );
}
