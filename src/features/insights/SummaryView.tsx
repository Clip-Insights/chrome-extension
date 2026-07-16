import { renderMarkdown } from '@/core/markdown';
import { StatusBar } from '@/ui/components/StatusBar';
import { ViewHeader, ViewHeaderAction } from '@/ui/components/ViewHeader';
import { ClearIcon, RefreshIcon, SparklesIcon, SummaryIcon } from '@/ui/icons';
import type { UseInsights } from './useInsights';

interface SummaryViewProps {
  insights: UseInsights;
  onClose: () => void;
}

export function SummaryView({ insights, onClose }: SummaryViewProps) {
  const { status } = insights;

  return (
    <div id="clipinsights__summaryContainer">
      <ViewHeader
        icon={<SummaryIcon />}
        title="Summary"
        onClose={onClose}
        actions={
          status === 'ready' && (
            <>
              <ViewHeaderAction label="Regenerate" onClick={() => void insights.regenerate()}>
                <RefreshIcon />
              </ViewHeaderAction>
              <ViewHeaderAction label="Clear summary" danger onClick={() => void insights.clear()}>
                <ClearIcon />
              </ViewHeaderAction>
            </>
          )
        }
      />
      <StatusBar
        contextText={insights.contextText}
        contextState={insights.contextState}
        remaining={insights.remaining}
        limitTooltip="Daily summaries remaining"
      />
      <div id="clipinsights__summary">
        {status === 'ready' && insights.summary ? (
          <div className="clipinsights__md" dangerouslySetInnerHTML={{ __html: renderMarkdown(insights.summary) }} />
        ) : status === 'loading' ? (
          <div className="clipinsights__insightsLoading">
            <span className="clipinsights__spinner" />
            Generating summary…
          </div>
        ) : status === 'idle' ? (
          <div className="clipinsights__insightsEmpty">
            <span className="clipinsights__insightsEmptyIcon">
              <SparklesIcon />
            </span>
            <p className="clipinsights__insightsEmptyTitle">No summary yet</p>
            <p className="clipinsights__insightsEmptyText">
              Generate an AI summary of this video from its transcript. It's saved here for next time.
            </p>
            <button className="clipinsights__btnPrimary" onClick={() => void insights.generate()}>
              Generate summary
            </button>
          </div>
        ) : (
          <div className="clipinsights__insightsEmpty">
            <p className="clipinsights__insightsEmptyText">{insights.message}</p>
            {status === 'error' && (
              <button className="clipinsights__btnPrimary" onClick={() => void insights.regenerate()}>
                Try again
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
