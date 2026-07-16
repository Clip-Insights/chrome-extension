import { StatusBar } from '@/ui/components/StatusBar';
import { ViewHeader, ViewHeaderAction } from '@/ui/components/ViewHeader';
import { ClearIcon, KeyPointsIcon, RefreshIcon, SparklesIcon } from '@/ui/icons';
import type { UseInsights } from './useInsights';

interface KeyPointsViewProps {
  insights: UseInsights;
  onClose: () => void;
}

export function KeyPointsView({ insights, onClose }: KeyPointsViewProps) {
  const { status } = insights;

  return (
    <div id="clipinsights__keypointsContainer">
      <ViewHeader
        icon={<KeyPointsIcon />}
        title="Key Points"
        onClose={onClose}
        actions={
          status === 'ready' && (
            <>
              <ViewHeaderAction label="Regenerate" onClick={() => void insights.regenerate()}>
                <RefreshIcon />
              </ViewHeaderAction>
              <ViewHeaderAction label="Clear key points" danger onClick={() => void insights.clear()}>
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
        limitTooltip="Daily key points remaining"
      />
      <div id="clipinsights__keypoints">
        {status === 'ready' && insights.keypoints.length > 0 ? (
          <ul className="styled-keypoints">
            {insights.keypoints.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        ) : status === 'loading' ? (
          <div className="clipinsights__insightsLoading">
            <span className="clipinsights__spinner" />
            Extracting key points…
          </div>
        ) : status === 'idle' || (status === 'ready' && insights.keypoints.length === 0) ? (
          <div className="clipinsights__insightsEmpty">
            <span className="clipinsights__insightsEmptyIcon">
              <SparklesIcon />
            </span>
            <p className="clipinsights__insightsEmptyTitle">No key points yet</p>
            <p className="clipinsights__insightsEmptyText">
              Extract the key takeaways of this video from its transcript. They're saved here for next time.
            </p>
            <button
              className="clipinsights__btnPrimary"
              /* A cached result can have zero points; `generate` no-ops on
               * status 'ready', so regenerate to fetch a fresh one. */
              onClick={() => void (status === 'ready' ? insights.regenerate() : insights.generate())}
            >
              Extract key points
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
