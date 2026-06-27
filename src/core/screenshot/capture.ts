export interface CapturedFrame {
  /** JPEG data URL of the current frame. */
  dataUrl: string;
  /** Playback position (seconds) at capture time. */
  time: number;
}

/**
 * Capture the current frame of a video element as a JPEG data URL. Runs in the
 * content script's isolated world; YouTube media is same-origin (MSE blob URLs)
 * so the canvas is not tainted. (v3 routed this through the background SW
 * unnecessarily — see ARCHITECTURE.md A.6 / B.5.)
 */
export function captureFrame(video: HTMLVideoElement, quality = 0.5): CapturedFrame {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
  return { dataUrl: canvas.toDataURL('image/jpeg', quality), time: video.currentTime };
}
