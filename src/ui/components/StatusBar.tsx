import { limitTone } from '@/core/limits/limitService';
import { BoltIcon, InfoIcon } from '@/ui/icons';

export type ContextState = 'normal' | 'loading' | 'error';

interface StatusBarProps {
  contextText: string;
  contextState?: ContextState;
  remaining: number;
  /** Tooltip describing the limit, e.g. "Daily summaries remaining". */
  limitTooltip: string;
  warnAt?: number;
}

/** Shared info banner: context window label on the left, daily limit badge on the right. */
export function StatusBar({ contextText, contextState = 'normal', remaining, limitTooltip, warnAt = 2 }: StatusBarProps) {
  const tone = limitTone(remaining, warnAt);
  return (
    <div className="clipinsights__statusBar">
      <div className="clipinsights__contextInfo">
        <span className={`clipinsights__contextIcon ${contextState === 'loading' ? 'loading' : ''}`}>
          <InfoIcon />
        </span>
        <span className={`clipinsights__contextText ${contextState}`}>{contextText}</span>
      </div>
      <div className={`clipinsights__limitBadge ${tone === 'normal' ? '' : tone}`}>
        <BoltIcon />
        <span className="clipinsights__limitCount">{remaining}</span>
        <span className="clipinsights__limitTooltip">{limitTooltip}</span>
      </div>
    </div>
  );
}
