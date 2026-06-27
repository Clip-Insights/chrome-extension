import { LOGO_SVG } from '@/assets/logo';
import type { AuthStatus } from '@/core/auth/session';
import { LoginIcon } from '@/ui/icons';

interface HeaderProps {
  authStatus: AuthStatus | 'unknown';
  onAuthClick: () => void;
}

export function Header({ authStatus, onAuthClick }: HeaderProps) {
  const label = authStatus === 'logged-in' ? 'Logout' : 'Login';
  return (
    <div id="clipinsights__top-container">
      <a href="https://clipinsights.vercel.app" target="_blank" rel="noreferrer" id="clipinsights__logo">
        <div id="clipinsights__mainHeading">
          <span dangerouslySetInnerHTML={{ __html: LOGO_SVG }} />
          Clip Insights
        </div>
      </a>
      <button id="clipinsights__loginBtn" className="clipinsights__button" onClick={onAuthClick}>
        <LoginIcon />
        <span>{label}</span>
        <span className="clipinsights__btnTooltip">{label} account</span>
      </button>
    </div>
  );
}
