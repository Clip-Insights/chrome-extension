import { useCallback, useEffect, useRef, useState } from 'react';
import { invalidatePlanInfo } from '@/core/limits/limitService';
import { useAuth } from '@/features/auth/useAuth';
import { LoginView } from '@/features/auth/LoginView';
import { SignupPrompt } from '@/features/auth/SignupPrompt';
import { useTimeline } from '@/features/timeline/useTimeline';
import { useInsights } from '@/features/insights/useInsights';
import { SummaryView } from '@/features/insights/SummaryView';
import { KeyPointsView } from '@/features/insights/KeyPointsView';
import { useChat } from '@/features/chat/useChat';
import { ChatView } from '@/features/chat/ChatView';
import { useExport } from '@/features/export/useExport';
import { SettingsView } from '@/features/settings/SettingsView';
import { useTranscriptCopy } from '@/features/transcript/useTranscriptCopy';
import { Header } from '@/ui/components/Header';
import { MainView } from '@/ui/components/MainView';
import { Toaster } from '@/ui/toast/Toaster';
import { useToast } from '@/ui/toast/ToastContext';

type View = 'main' | 'summary' | 'keypoints' | 'chat' | 'login' | 'signup' | 'settings';

const AI_FEATURE_LABEL: Partial<Record<View, string>> = {
  summary: 'AI summaries',
  keypoints: 'AI key points',
  chat: 'AI chat',
};

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
  const [gatedFeature, setGatedFeature] = useState('AI features');

  const handleClear = useCallback(async () => {
    await timeline.clearAll();
    insights.reset();
    chat.reset();
  }, [timeline, insights, chat]);

  // AI features need an account (the backend enforces this too); guests get a
  // sign-up prompt instead of the feature view.
  const openAiView = useCallback(
    (target: View) => {
      if (auth.status === 'logged-in') {
        setView(target);
      } else {
        setGatedFeature(AI_FEATURE_LABEL[target] ?? 'AI features');
        setView('signup');
      }
    },
    [auth.status],
  );

  // Logged-in users get the settings view (profile, plan, usage, logout);
  // guests go straight to login.
  const onAuthClick = useCallback(() => {
    setView(auth.status === 'logged-in' ? 'settings' : 'login');
  }, [auth.status]);

  const onLogout = useCallback(() => {
    auth.logout();
    invalidatePlanInfo();
    setView('main');
    show('Successfully logged out.', 'success');
  }, [auth, show]);

  const onLogin = useCallback(
    async (email: string, password: string) => {
      const result = await auth.login(email, password);
      if (result.ok) invalidatePlanInfo();
      return result;
    },
    [auth],
  );

  const onGoogleLogin = useCallback(async () => {
    const result = await auth.googleLogin();
    if (result.ok) invalidatePlanInfo();
    return result;
  }, [auth]);

  // Keyboard shortcuts (Ctrl+Shift+…). Latest handlers are read via a ref so the
  // listener is attached once (ARCHITECTURE.md A.15).
  const actionsRef = useRef<Record<string, () => void>>({});
  actionsRef.current = {
    S: () => void timeline.addScreenshot(),
    Y: () => openAiView('summary'),
    H: () => setView('main'),
    K: () => openAiView('keypoints'),
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
            onOpenSummary={() => openAiView('summary')}
            onOpenKeypoints={() => openAiView('keypoints')}
            onOpenChat={() => openAiView('chat')}
            onClear={() => void handleClear()}
          />
        )}
        {view === 'summary' && <SummaryView insights={insights} onClose={() => setView('main')} />}
        {view === 'keypoints' && <KeyPointsView insights={insights} onClose={() => setView('main')} />}
        {view === 'chat' && <ChatView chat={chat} onClose={() => setView('main')} />}
        {view === 'login' && (
          <LoginView onLogin={onLogin} onGoogleLogin={onGoogleLogin} onBack={() => setView('main')} />
        )}
        {view === 'signup' && (
          <SignupPrompt feature={gatedFeature} onLogin={() => setView('login')} onBack={() => setView('main')} />
        )}
        {view === 'settings' && <SettingsView onClose={() => setView('main')} onLogout={onLogout} />}
      </div>
      <Toaster />
    </div>
  );
}
