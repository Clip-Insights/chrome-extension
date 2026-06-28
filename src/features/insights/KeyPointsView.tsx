import { useEffect } from 'react';
import { StatusBar } from '@/ui/components/StatusBar';
import type { UseInsights } from './useInsights';

interface KeyPointsViewProps {
  insights: UseInsights;
  onClose: () => void;
}

export function KeyPointsView({ insights, onClose }: KeyPointsViewProps) {
  useEffect(() => {
    void insights.generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div id="clipinsights__keypointsContainer">
      <div id="clipinsights__keyPointsHeader">
        <h2 id="clipinsights__keypointsHeading">🔹Key Points</h2>
        <button className="clipinsights__button" id="clipinsights__closeKeyPoints" onClick={onClose}>
          ✖<span className="clipinsights__btnTooltip">Close</span>
        </button>
      </div>
      <StatusBar
        contextText={insights.contextText}
        contextState={insights.contextState}
        remaining={insights.remaining}
        limitTooltip="Daily key points remaining"
      />
      <div id="clipinsights__keypoints" style={{ whiteSpace: 'pre-wrap' }}>
        {insights.status === 'loading' ? (
          'Generating Key Points ...'
        ) : insights.keypoints.length > 0 ? (
          <ul className="styled-keypoints">
            {insights.keypoints.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        ) : (
          insights.message
        )}
      </div>
    </div>
  );
}
