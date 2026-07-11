import { useState } from 'react';
import type { UseTimeline } from '@/features/timeline/useTimeline';
import type { UseExport } from '@/features/export/useExport';
import type { UseTranscriptCopy } from '@/features/transcript/useTranscriptCopy';
import { NoteComposer } from '@/features/timeline/NoteComposer';
import { TimelineList } from '@/features/timeline/TimelineList';
import { BtnTooltip } from '@/ui/components/BtnTooltip';
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
          <span>Snapshot</span>
          <BtnTooltip label="Capture screenshot" shortcut="Ctrl+Shift+S" />
        </button>
        <button className="clipinsights__button" id="clipinsights__summaryBtn" onClick={onOpenSummary}>
          <SummaryIcon />
          <span>Summary</span>
          <BtnTooltip label="Generate summary" shortcut="Ctrl+Shift+Y" />
        </button>
        <button className="clipinsights__button" id="clipinsights__keypointsBtn" onClick={onOpenKeypoints}>
          <KeyPointsIcon />
          <span>Key Points</span>
          <BtnTooltip label="Extract key points" shortcut="Ctrl+Shift+K" />
        </button>
        <button className="clipinsights__button" id="clipinsights__chatBtn" onClick={onOpenChat}>
          <ChatIcon />
          <span>Chat</span>
          <BtnTooltip label="Chat with AI" />
        </button>
      </div>

      <NoteComposer onAddNote={timeline.addNote} maxChars={timeline.maxNoteChars} />

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
          <span>{saving ? 'Saving...' : 'Download'}</span>
          <BtnTooltip label="Download as PDF" shortcut="Ctrl+Shift+P" />
        </button>
        <button
          className="clipinsights__button"
          id="clipinsights__uploadBtn"
          disabled={uploading}
          onClick={() => void runBusy(setUploading, exporter.uploadPdf)}
        >
          <UploadIcon />
          <span>{uploading ? 'Uploading...' : 'Upload'}</span>
          <BtnTooltip label="Upload to Clip Insights" shortcut="Ctrl+Shift+U" />
        </button>
        <button
          className="clipinsights__button"
          id="clipinsights__copyTranscriptBtn"
          disabled={transcriptCopy.status === 'copying'}
          onClick={() => void transcriptCopy.copy()}
        >
          <TranscriptIcon />
          <span>{transcriptLabel}</span>
          <BtnTooltip label="Copy transcript" shortcut="Ctrl+Shift+T" />
        </button>
        <button className="clipinsights__button" id="clipinsights__clearBtn" onClick={onClear}>
          <ClearIcon />
          <span>Clear</span>
          <BtnTooltip label="Clear all data" shortcut="Ctrl+Shift+C" />
        </button>
      </div>
    </div>
  );
}
