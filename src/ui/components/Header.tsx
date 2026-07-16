import { LOGO_SVG } from '@/assets/logo';
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
      <a href="https://app.clipinsights.com" target="_blank" rel="noreferrer" id="clipinsights__logo">
        <div id="clipinsights__mainHeading">
          <span dangerouslySetInnerHTML={{ __html: LOGO_SVG }} />
          Clip Insights
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
