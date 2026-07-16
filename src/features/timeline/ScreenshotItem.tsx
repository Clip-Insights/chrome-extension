import type { ScreenshotRecord } from '@/core/types';
import { formatHMS } from '@/core/time';
import { CloseIcon } from '@/ui/icons';

interface ScreenshotItemProps {
  screenshot: ScreenshotRecord;
  onDelete: (id: number) => Promise<void>;
  onSeek: (seconds: number) => void;
  /** Fired when the image finishes decoding (used to keep new items scrolled into view). */
  onImageLoad?: () => void;
}

export function ScreenshotItem({ screenshot, onDelete, onSeek, onImageLoad }: ScreenshotItemProps) {
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
      <img
        className="clipinsights__screenshot"
        src={screenshot.url}
        alt="Captured frame"
        onLoad={onImageLoad}
      />
      <button
        className="clipinsights__timestamp"
        onClick={() => onSeek(screenshot.videoTimestamp)}
        aria-label="Jump video to this time"
      >
        {formatHMS(screenshot.videoTimestamp)}
      </button>
    </div>
  );
}
