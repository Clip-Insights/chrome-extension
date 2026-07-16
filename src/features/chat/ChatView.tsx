import { useEffect, useRef, useState } from 'react';
import { limitTone } from '@/core/limits/limitService';
import { renderMarkdown } from '@/core/markdown';
import { ViewHeader } from '@/ui/components/ViewHeader';
import { BoltIcon, ChatIcon, InfoIcon, SendIcon } from '@/ui/icons';
import type { UseChat } from './useChat';

interface ChatViewProps {
  chat: UseChat;
  onClose: () => void;
}

export function ChatView({ chat, onClose }: ChatViewProps) {
  const [input, setInput] = useState('');
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void chat.prepareContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.messages]);

  const submit = () => {
    const text = input;
    if (!text.trim() || chat.sending) return;
    setInput('');
    void chat.send(text);
  };

  const tone = limitTone(chat.remaining, 3);

  return (
    <div id="clipinsights__chatContainer">
      <ViewHeader icon={<ChatIcon />} title="Clip Bot" onClose={onClose} />

      <div id="clipinsights__chatStatusBar">
        <div id="clipinsights__contextInfo">
          <span className={`clipinsights__contextIcon ${chat.contextState === 'loading' ? 'loading' : ''}`}>
            <InfoIcon />
          </span>
          <span id="clipinsights__contextTime" className={chat.contextState}>
            {chat.contextText}
          </span>
        </div>
        <div className={`clipinsights__limitBadge ${tone === 'normal' ? '' : tone}`} id="clipinsights__limitBadge">
          <BoltIcon />
          <span id="clipinsights__limitCount">{chat.remaining}</span>
          <span id="clipinsights__limitTooltip" className="clipinsights__limitTooltip">
            Daily chats remaining
          </span>
        </div>
      </div>

      <div id="clipinsights__chatMessages" ref={messagesRef}>
        {chat.messages.map((m, i) => {
          const isLast = i === chat.messages.length - 1;
          const isStreaming = chat.sending && isLast && m.role === 'bot';
          return (
            <div
              key={i}
              className={`clipinsights__message ${m.role === 'user' ? 'clipinsights__user' : 'clipinsights__bot'}`}
            >
              {isStreaming && m.content === '' ? (
                <span className="clipinsights__typing" aria-label="Clip Bot is thinking">
                  <span />
                  <span />
                  <span />
                </span>
              ) : m.role === 'bot' ? (
                // The AI answers in GitHub-flavoured markdown (bold, lists,
                // tables, code); render it sanitized instead of as raw text.
                <>
                  <div className="clipinsights__md" dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />
                  {isStreaming && <span className="clipinsights__caret" />}
                </>
              ) : (
                m.content
              )}
            </div>
          );
        })}
      </div>

      <div id="clipinsights__chatInputContainer">
        <textarea
          id="clipinsights__chatInput"
          placeholder="Ask about this video…"
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends; Shift+Enter inserts a newline (like every chat app).
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button
          className="clipinsights__button"
          id="clipinsights__sendChatBtn"
          disabled={chat.sending || !input.trim()}
          onClick={submit}
          aria-label="Send message"
        >
          <SendIcon />
          <span className="clipinsights__btnTooltip">Send message</span>
        </button>
      </div>
    </div>
  );
}
