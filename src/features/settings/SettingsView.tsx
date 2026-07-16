import type { UsageCounter } from '@/core/api/client';
import { formatResetTime } from '@/core/time';
import { ViewHeader } from '@/ui/components/ViewHeader';
import { LogoutIcon, SettingsIcon } from '@/ui/icons';
import { useSettings } from './useSettings';

const MANAGE_PLAN_URL = 'https://app.clipinsights.com';

interface SettingsViewProps {
  onClose: () => void;
  onLogout: () => void;
}

function UsageMeter({ label, usage }: { label: string; usage: UsageCounter }) {
  const percent = usage.limit > 0 ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 0;
  return (
    <div className="clipinsights__usageMeter">
      <div className="clipinsights__usageMeterHead">
        <span>{label}</span>
        <span className="clipinsights__usageMeterCount">
          {usage.used} / {usage.limit}
        </span>
      </div>
      <div className="clipinsights__usageTrack">
        <div className={`clipinsights__usageFill${percent >= 100 ? ' full' : ''}`} style={{ width: `${percent}%` }} />
      </div>
      {usage.resets_at && usage.used > 0 && (
        <p className="clipinsights__usageReset">Resets {formatResetTime(new Date(usage.resets_at))}</p>
      )}
    </div>
  );
}

/** Account settings: profile, plan and usage details, and logout. */
export function SettingsView({ onClose, onLogout }: SettingsViewProps) {
  const { profile, plan, loading, error } = useSettings();

  return (
    <div id="clipinsights__settingsContainer">
      <ViewHeader icon={<SettingsIcon />} title="Settings" onClose={onClose} />

      <div id="clipinsights__settingsBody">
        {loading ? (
          <div className="clipinsights__insightsLoading">
            <span className="clipinsights__spinner" />
            Loading your account…
          </div>
        ) : error ? (
          <div className="clipinsights__insightsEmpty">
            <p className="clipinsights__insightsEmptyText">{error}</p>
          </div>
        ) : (
          <>
            <div className="clipinsights__settingsCard clipinsights__profileCard">
              <span className="clipinsights__avatar">
                {(profile?.name || profile?.email || '?').charAt(0).toUpperCase()}
              </span>
              <div className="clipinsights__profileMeta">
                {profile?.name && <p className="clipinsights__profileName">{profile.name}</p>}
                <p className="clipinsights__profileEmail">{profile?.email}</p>
              </div>
            </div>

            <div className="clipinsights__settingsCard">
              <div className="clipinsights__settingsCardHead">
                <h3 className="clipinsights__settingsCardTitle">Plan</h3>
                <span className="clipinsights__planBadge">{plan?.limits.name ?? '—'}</span>
              </div>
              <p className="clipinsights__settingsCardText">
                {plan && plan.limits.monthly_price_usd > 0
                  ? `$${plan.limits.monthly_price_usd}/month`
                  : 'Free plan'}
              </p>
              <a className="clipinsights__settingsLink" href={MANAGE_PLAN_URL} target="_blank" rel="noreferrer">
                Manage plan ↗
              </a>
            </div>

            {plan?.usage && (
              <div className="clipinsights__settingsCard">
                <div className="clipinsights__settingsCardHead">
                  <h3 className="clipinsights__settingsCardTitle">Today's usage</h3>
                </div>
                <UsageMeter label="Summaries & key points" usage={plan.usage.summary} />
                <UsageMeter label="Chat messages" usage={plan.usage.chat} />
              </div>
            )}

            <button className="clipinsights__logoutBtn" onClick={onLogout}>
              <LogoutIcon />
              Log out
            </button>
          </>
        )}
      </div>
    </div>
  );
}
