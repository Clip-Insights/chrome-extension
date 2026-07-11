import { WEB_APP_URL } from '@/core/api/env';

interface SignupPromptProps {
  /** Which gated feature the user tried to open, e.g. "AI summaries". */
  feature: string;
  onLogin: () => void;
  onBack: () => void;
}

/**
 * Shown when a guest opens a feature that needs an account. Notes, screenshots
 * and PDF export stay free without one; AI features require sign-up (free plan).
 *
 * Layout follows the standard upgrade-gate pattern: one full-width primary
 * action, a full-width secondary, and a quiet text link back — not a row of
 * equal-weight buttons.
 */
export function SignupPrompt({ feature, onLogin, onBack }: SignupPromptProps) {
  return (
    <div id="clipinsights__loginContainer" className="clipinsights__signupPrompt">
      <h4 className="clipinsights__h4">Create a free account</h4>
      <p className="clipinsights__signupText">
        {feature} are included free with a Clip Insights account — along with AI chat, key
        points and cloud PDF storage. Notes, screenshots and downloads stay free without one.
      </p>
      <div className="clipinsights__signupActions">
        <a
          className="clipinsights__button clipinsights__btnPrimary clipinsights__btnBlock"
          href={`${WEB_APP_URL}/signup`}
          target="_blank"
          rel="noreferrer"
        >
          Sign up free
        </a>
        <button
          className="clipinsights__button clipinsights__btnSecondary clipinsights__btnBlock"
          onClick={onLogin}
        >
          I already have an account
        </button>
        <button className="clipinsights__button clipinsights__btnGhost" onClick={onBack}>
          Not now
        </button>
      </div>
    </div>
  );
}
