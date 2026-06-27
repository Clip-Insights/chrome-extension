import { useEffect, useRef, useState } from 'react';
import { limitTone } from '@/core/limits/limitService';
import { BoltIcon, InfoIcon } from '@/ui/icons';
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
    setInput('');
    void chat.send(text);
  };

  const tone = limitTone(chat.remaining, 3);

  return (
    <div id="clipinsights__chatContainer">
      <div id="clipinsights__chatHeader">
        <h4 className="clipinsights__h4">Clip Bot</h4>
        <button className="clipinsights__button" id="clipinsights__closeChat" onClick={onClose}>
          ✖<span className="clipinsights__btnTooltip">Close</span>
        </button>
      </div>

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
        {chat.messages.map((m, i) => (
          <div
            key={i}
            className={`clipinsights__message ${m.role === 'user' ? 'clipinsights__user' : 'clipinsights__bot'}`}
          >
            {m.content}
          </div>
        ))}
      </div>

      <div id="clipinsights__chatInputContainer">
        <input
          type="text"
          id="clipinsights__chatInput"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <button className="clipinsights__button" id="clipinsights__sendChatBtn" disabled={chat.sending} onClick={submit}>
          Send<span className="clipinsights__btnTooltip">Send message</span>
        </button>
      </div>
    </div>
  );
}
