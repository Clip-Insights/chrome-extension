import { useEffect } from 'react';
import { formatSummaryToHtml } from '@/core/format';
import { StatusBar } from '@/ui/components/StatusBar';
import type { UseInsights } from './useInsights';

interface SummaryViewProps {
  insights: UseInsights;
  onClose: () => void;
}

export function SummaryView({ insights, onClose }: SummaryViewProps) {
  useEffect(() => {
    void insights.generate();
    // Run once when the view opens; generate() is a no-op when already ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div id="clipinsights__summaryContainer">
      <div id="clipinsights__summaryHeader">
        <h2 id="clipinsights__summaryHeading">📄Summary</h2>
        <button className="clipinsights__button" id="clipinsights__closeSummary" onClick={onClose}>
          ✖<span className="clipinsights__btnTooltip">Close</span>
        </button>
      </div>
      <StatusBar
        contextText={insights.contextText}
        contextState={insights.contextState}
        remaining={insights.remaining}
        limitTooltip="Daily summaries remaining"
      />
      <div id="clipinsights__summary" style={{ whiteSpace: 'pre-wrap' }}>
        {insights.status === 'loading' ? (
          'Generating summary ...'
        ) : insights.summary ? (
          <span dangerouslySetInnerHTML={{ __html: formatSummaryToHtml(insights.summary) }} />
        ) : (
          insights.message
        )}
      </div>
    </div>
  );
}
