export interface CapturedFrame {
  /** JPEG data URL of the current frame. */
  dataUrl: string;
  /** Playback position (seconds) at capture time. */
  time: number;
}

/** Longest-edge cap (px) for stored frames. Full 1080p/4K frames bloat IndexedDB
 * fast (a handful can exhaust the quota and silently block further writes); a
 * 1280px JPEG stays sharp on the panel and in the PDF at a fraction of the size. */
const MAX_DIMENSION = 1280;

/**
 * Capture the current frame of a video element as a JPEG data URL. Runs in the
 * content script's isolated world; YouTube media is same-origin (MSE blob URLs)
 * so the canvas is not tainted. (v3 routed this through the background SW
 * unnecessarily — see ARCHITECTURE.md A.6 / B.5.)
 *
 * The frame is downscaled so its longest edge is at most `MAX_DIMENSION`, which
 * keeps stored screenshots small and bounds total storage growth.
 */
export function captureFrame(video: HTMLVideoElement, quality = 0.6): CapturedFrame {
  const { videoWidth, videoHeight } = video;
  const scale = Math.min(1, MAX_DIMENSION / Math.max(videoWidth, videoHeight || 1));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(videoWidth * scale);
  canvas.height = Math.round(videoHeight * scale);
  canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
  return { dataUrl: canvas.toDataURL('image/jpeg', quality), time: video.currentTime };
}
