import type { ScreenshotRecord } from '@/core/types';
import { formatHMS } from '@/core/time';
import { CloseIcon } from '@/ui/icons';

interface ScreenshotItemProps {
  screenshot: ScreenshotRecord;
  onDelete: (id: number) => Promise<void>;
}

export function ScreenshotItem({ screenshot, onDelete }: ScreenshotItemProps) {
  return (
    <div className="clipinsights__screenshot-note">
      <div className="clipinsights__note-actions">
        <button
          className="clipinsights__delete-btn"
          onClick={() => screenshot.id !== undefined && void onDelete(screenshot.id)}
        >
          <CloseIcon />
          <span className="clipinsights__btnTooltip">Delete</span>
        </button>
      </div>
      <img className="clipinsights__screenshot" src={screenshot.url} alt="Captured frame" />
      <p className="clipinsights__timestamp">{formatHMS(screenshot.videoTimestamp)}</p>
    </div>
  );
}
