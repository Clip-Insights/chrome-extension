import { useState } from 'react';
import type { LoginResult } from '@/core/auth/session';
import { GoogleGIcon } from '@/ui/icons';
import { useToast } from '@/ui/toast/ToastContext';

interface LoginViewProps {
  onLogin: (email: string, password: string) => Promise<LoginResult>;
  onGoogleLogin: () => Promise<LoginResult>;
  onBack: () => void;
}

export function LoginView({ onLogin, onGoogleLogin, onBack }: LoginViewProps) {
  const { show } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const result = await onLogin(email, password);
    setBusy(false);
    show(result.message, result.ok ? 'success' : 'error');
    if (result.ok) onBack();
  };

  const submitGoogle = async () => {
    setGoogleBusy(true);
    const result = await onGoogleLogin();
    setGoogleBusy(false);
    show(result.message, result.ok ? 'success' : 'error');
    if (result.ok) onBack();
  };

  return (
    <div id="clipinsights__loginContainer">
      <h4 className="clipinsights__h4">Login</h4>
      <button
        type="button"
        className="clipinsights__button clipinsights__googleBtn"
        id="clipinsights__googleLoginBtn"
        disabled={busy || googleBusy}
        onClick={() => void submitGoogle()}
      >
        <GoogleGIcon />
        <span>{googleBusy ? 'Signing in…' : 'Sign in with Google'}</span>
      </button>
      <input
        type="email"
        placeholder="Email"
        className="clipinsights__loginInputs"
        id="clipinsights__emailInput"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        className="clipinsights__loginInputs"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && void submit()}
      />
      <div id="clipinsights__submitBackBtns">
        <button className="clipinsights__button" id="clipinsights__submitLogin" disabled={busy} onClick={() => void submit()}>
          {busy ? 'Verifying' : 'Login'}
        </button>
        <button className="clipinsights__button" id="clipinsights__backBtn" onClick={onBack}>
          Back
        </button>
      </div>
      <p id="clipinsights__registrationLink">
        Don't have an account?
        <a href="https://app.clipinsights.com/signup" target="_blank" rel="noreferrer">
          Register!
        </a>
      </p>
    </div>
  );
}
