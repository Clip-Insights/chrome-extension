import { useCallback, useState } from 'react';
import { type ChatMessage, streamChat } from '@/core/api/client';
import { chatLimit } from '@/core/limits/limitService';
import { getSlicedTranscript } from '@/core/transcript/slicer';
import { useToast } from '@/ui/toast/ToastContext';
import { usePlatform } from '@/ui/PlatformContext';
import type { ContextState } from '@/ui/components/StatusBar';

const TRANSCRIPT_UNAVAILABLE_MESSAGE =
  "Sorry — this video's transcript is unavailable, so I can't answer questions about it.";

const CHAT_MEMORY_ENABLED = true;
const CHAT_MEMORY_WINDOW_SIZE = 4;
const MAX_QUERY_LENGTH = 1000;

export interface UiMessage {
  role: 'user' | 'bot';
  content: string;
}

export interface UseChat {
  messages: UiMessage[];
  remaining: number;
  contextText: string;
  contextState: ContextState;
  sending: boolean;
  prepareContext: () => Promise<void>;
  send: (text: string) => Promise<void>;
  reset: () => void;
}

function buildHistory(messages: UiMessage[]): ChatMessage[] {
  return messages
    .slice(-CHAT_MEMORY_WINDOW_SIZE)
    .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));
}

function contextLabel(lastTagTime: number): string {
  return lastTagTime !== -1 ? `Context up to ${(lastTagTime / 60).toFixed(2)} min` : 'Full video context';
}

export function useChat(): UseChat {
  const { adapter, ctx } = usePlatform();
  const { show } = useToast();
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [remaining, setRemaining] = useState(() => chatLimit.remaining());
  const [contextText, setContextText] = useState('Analyzing video...');
  const [contextState, setContextState] = useState<ContextState>('normal');
  const [sending, setSending] = useState(false);

  const updateLastBot = (transform: (content: string) => string) =>
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last && last.role === 'bot') next[next.length - 1] = { ...last, content: transform(last.content) };
      return next;
    });

  const prepareContext = useCallback(async () => {
    setRemaining(chatLimit.remaining());
    if (!adapter.isContentPage()) {
      setContextText('Not a YouTube video');
      setContextState('error');
      return;
    }
    setContextText('Analyzing video...');
    setContextState('loading');
    try {
      const sliced = await getSlicedTranscript(adapter, ctx);
      if (!sliced.available) {
        setContextText('No transcript available');
        setContextState('error');
        return;
      }
      setContextText(contextLabel(sliced.lastTagTime));
      setContextState('normal');
    } catch {
      setContextText('Context unavailable');
      setContextState('error');
    }
  }, [adapter, ctx]);

  const send = useCallback(
    async (raw: string) => {
      const query = raw.trim();
      if (!query) return;
      if (query.length > MAX_QUERY_LENGTH) {
        show('Your message is too long. Please shorten it.', 'error');
        return;
      }
      if (chatLimit.isReached()) {
        show('Daily chat limit reached. Please try again tomorrow.', 'error');
        return;
      }
      if (!adapter.isContentPage()) {
        show('Open a video to start chatting.', 'info');
        return;
      }

      const withUser: UiMessage[] = [...messages, { role: 'user', content: query }];
      setMessages(withUser);
      setSending(true);
      try {
        const sliced = await getSlicedTranscript(adapter, ctx);
        // Guard: never spend a chat credit or POST a non-transcript (e.g.
        // "No captions available") to the backend. Tell the user instead.
        if (!sliced.available) {
          setContextText('No transcript available');
          setContextState('error');
          setMessages([...withUser, { role: 'bot', content: TRANSCRIPT_UNAVAILABLE_MESSAGE }]);
          show('No transcript is available for this video.', 'error');
          return;
        }

        setContextText(contextLabel(sliced.lastTagTime));
        setContextState('normal');
        setRemaining(chatLimit.consume());

        setMessages([...withUser, { role: 'bot', content: '' }]);
        await streamChat(
          {
            youtube_url: ctx.contentUrl,
            query,
            transcription: sliced.transcript,
            stream: true,
            chat_memory_enabled: CHAT_MEMORY_ENABLED,
            chat_history: CHAT_MEMORY_ENABLED ? buildHistory(withUser) : [],
          },
          {
            onToken: (token) => updateLastBot((content) => content + token),
            onError: (msg) => updateLastBot(() => msg),
          },
        );
      } catch {
        setMessages((prev) => [...prev, { role: 'bot', content: 'Sorry, there was an error. Please try again.' }]);
      } finally {
        setSending(false);
      }
    },
    [adapter, ctx, messages, show],
  );

  const reset = useCallback(() => setMessages([]), []);

  return { messages, remaining, contextText, contextState, sending, prepareContext, send, reset };
}
