import wordmark from '@/assets/wordmark.svg?raw';
import { WEB_APP_URL } from '@/core/api/env';
import type { AuthStatus } from '@/core/auth/session';
import { LoginIcon, SettingsIcon } from '@/ui/icons';

interface HeaderProps {
  authStatus: AuthStatus | 'unknown';
  /** Opens login (logged out) or the settings view (logged in). */
  onAuthClick: () => void;
}

export function Header({ authStatus, onAuthClick }: HeaderProps) {
  const loggedIn = authStatus === 'logged-in';
  const label = loggedIn ? 'Settings' : 'Login';
  return (
    <div id="clipinsights__top-container">
      <a href={WEB_APP_URL} target="_blank" rel="noreferrer" id="clipinsights__logo" aria-label="Clip Insights web app">
        <div id="clipinsights__mainHeading">
          <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: wordmark }} />
        </div>
      </a>
      <button id="clipinsights__loginBtn" className="clipinsights__button" onClick={onAuthClick}>
        {loggedIn ? <SettingsIcon /> : <LoginIcon />}
        <span>{label}</span>
        <span className="clipinsights__btnTooltip">{loggedIn ? 'Account & plan' : 'Login to your account'}</span>
      </button>
    </div>
  );
}
