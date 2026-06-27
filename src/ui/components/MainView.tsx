import { useState } from 'react';
import type { UseTimeline } from '@/features/timeline/useTimeline';
import type { UseExport } from '@/features/export/useExport';
import type { UseTranscriptCopy } from '@/features/transcript/useTranscriptCopy';
import { NoteComposer } from '@/features/timeline/NoteComposer';
import { TimelineList } from '@/features/timeline/TimelineList';
import {
  ChatIcon,
  ClearIcon,
  DownloadIcon,
  KeyPointsIcon,
  SnapshotIcon,
  SummaryIcon,
  TranscriptIcon,
  UploadIcon,
} from '@/ui/icons';

interface MainViewProps {
  timeline: UseTimeline;
  exporter: UseExport;
  transcriptCopy: UseTranscriptCopy;
  onOpenSummary: () => void;
  onOpenKeypoints: () => void;
  onOpenChat: () => void;
  onClear: () => void;
}

export function MainView({
  timeline,
  exporter,
  transcriptCopy,
  onOpenSummary,
  onOpenKeypoints,
  onOpenChat,
  onClear,
}: MainViewProps) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const runBusy = async (set: (v: boolean) => void, fn: () => Promise<void>) => {
    set(true);
    try {
      await fn();
    } catch (error) {
      console.error(error);
    } finally {
      set(false);
    }
  };

  const transcriptLabel =
    transcriptCopy.status === 'copying' ? 'Copying...' : transcriptCopy.status === 'failed' ? 'Failed!' : 'Transcript';

  return (
    <div id="clipinsights__mainContent">
      <div className="clipinsights__button-container">
        <button className="clipinsights__button" id="clipinsights__screenshotBtn" onClick={() => void timeline.addScreenshot()}>
          <SnapshotIcon />
          Snapshot
          <span className="clipinsights__btnTooltip">Capture screenshot</span>
        </button>
        <button className="clipinsights__button" id="clipinsights__summaryBtn" onClick={onOpenSummary}>
          <SummaryIcon />
          <span>Summary</span>
          <span className="clipinsights__btnTooltip">Generate summary</span>
        </button>
        <button className="clipinsights__button" id="clipinsights__keypointsBtn" onClick={onOpenKeypoints}>
          <KeyPointsIcon />
          <span>Key Points</span>
          <span className="clipinsights__btnTooltip">Extract key points</span>
        </button>
        <button className="clipinsights__button" id="clipinsights__chatBtn" onClick={onOpenChat}>
          <ChatIcon />
          Chat
          <span className="clipinsights__btnTooltip">Chat with AI</span>
        </button>
      </div>

      <NoteComposer onAddNote={timeline.addNote} />

      <TimelineList
        items={timeline.items}
        onEditNote={timeline.editNote}
        onDeleteNote={timeline.removeNote}
        onDeleteScreenshot={timeline.removeScreenshot}
      />

      <div id="clipinsights__loginBtnContainer">
        <button
          className="clipinsights__button"
          id="clipinsights__saveBtn"
          disabled={saving}
          onClick={() => void runBusy(setSaving, exporter.downloadPdf)}
        >
          <DownloadIcon />
          {saving ? 'Saving...' : 'Download'}
          <span className="clipinsights__btnTooltip">Download as PDF</span>
        </button>
        <button
          className="clipinsights__button"
          id="clipinsights__uploadBtn"
          disabled={uploading}
          onClick={() => void runBusy(setUploading, exporter.uploadPdf)}
        >
          <UploadIcon />
          {uploading ? 'Uploading...' : 'Upload'}
          <span className="clipinsights__btnTooltip">Upload to Clip Insights</span>
        </button>
        <button
          className="clipinsights__button"
          id="clipinsights__copyTranscriptBtn"
          disabled={transcriptCopy.status === 'copying'}
          onClick={() => void transcriptCopy.copy()}
        >
          <TranscriptIcon />
          <span>{transcriptLabel}</span>
          <span className="clipinsights__btnTooltip">Copy transcript</span>
        </button>
        <button className="clipinsights__button" id="clipinsights__clearBtn" onClick={onClear}>
          <ClearIcon />
          Clear
          <span className="clipinsights__btnTooltip">Clear all data</span>
        </button>
      </div>
    </div>
  );
}
