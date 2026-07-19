import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import apiClient from '../../infrastructure/http/apiClient';
import MoneyFlowDiagram from './MoneyFlowDiagram';
import SpendingBreakdownDiagram from './SpendingBreakdownDiagram';
import TimelineSlider from '../Utility/TimelineSlider/TimelineSlider';
import Loading2 from '../Utility/LoadingSpinner/Loading';

const BADGE_LABELS = {
  forward: 'Projected',
  backward: 'Historical'
};

const BADGE_COLORS = {
  forward: 'bg-amber-500/90 text-white',
  backward: 'bg-blue-500/90 text-white'
};

/**
 * Transform the budget flow API response into SpendingBreakdownDiagram props.
 */
const buildBreakdownProps = (data, mode, horizonMonths, sourceLabel) => {
  if (!data) return null;

  const monthsText =
    horizonMonths === 1 ? '1 month' : `${horizonMonths} months`;
  const defaultLabel =
    mode === 'forward' ? `Next ${monthsText}` : `Past ${monthsText}`;

  const source = {
    label: sourceLabel || defaultLabel,
    total: data.total_in || 0,
    subtitle:
      mode === 'forward'
        ? `Projected over ${monthsText}`
        : `Actual over ${monthsText}`
  };

  const middleNodes = (data.inflows || [])
    .filter((n) => n.total > 0)
    .map((n) => ({
      key: n.key,
      label: n.label,
      total: n.total,
      subtitle: `${n.count || 0} transactions`
    }));

  const rightNodes = (data.outflows || [])
    .filter((n) => n.total > 0)
    .map((n) => ({
      key: n.key,
      label: n.label,
      total: n.total,
      subtitle: `${n.count || 0} transactions`
    }));

  return { source, middleNodes, rightNodes };
};

const PredictableMoneyFlow = ({
  workspaceId,
  data: externalData,
  period: initialPeriod = '3M',
  showPeriodToggle = true,
  showPredictControls = true,
  className = '',
  recipientId,
  campaignId,
  eventId,
  projectId,
  budgetId,
  sourceLabel,
  SliderComponent,
  refreshToken = 0
}) => {
  const [sliderValue, setSliderValue] = useState(0);
  const [predictedData, setPredictedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPeriod] = useState(initialPeriod);
  const [predictExpanded, setPredictExpanded] = useState(false);

  const mode =
    sliderValue === 0 ? 'actual' : sliderValue > 0 ? 'forward' : 'backward';
  const horizonMonths = Math.abs(sliderValue);

  const fetchPrediction = useCallback(
    (direction, horizon) => {
      if (!workspaceId) return;

      setLoading(true);

      const params = {
        direction,
        horizon,
        base_period: currentPeriod
      };
      if (recipientId) params.recipient_id = recipientId;
      if (campaignId) params.campaign_id = campaignId;
      if (eventId) params.event_id = eventId;
      if (projectId) params.project_id = projectId;
      // Scope to a single budget if the consumer passes one. Backend
      // filter on this param is a Sprint-3 follow-up (see /budget
      // skill §5 Pitfall 6); plumbing the intent now so once the
      // backend honours it the chart is correctly budget-scoped.
      if (budgetId) params.budget_id = budgetId;

      apiClient
        .get(`/budget/flow/${workspaceId}/predict/`, { params })
        .then((res) => {
          setPredictedData(res?.data || null);
        })
        .catch(() => {
          setPredictedData(null);
        })
        .finally(() => {
          setLoading(false);
        });
    },
    [
      workspaceId,
      currentPeriod,
      recipientId,
      campaignId,
      eventId,
      projectId,
      budgetId
    ]
  );

  const handleSliderChange = useCallback(
    (val) => {
      setSliderValue(val);
      if (val === 0) {
        setPredictedData(null);
      } else {
        const dir = val > 0 ? 'forward' : 'backward';
        fetchPrediction(dir, Math.abs(val));
      }
    },
    [fetchPrediction]
  );

  const isPredict = mode !== 'actual';

  const breakdownProps = useMemo(
    () => buildBreakdownProps(predictedData, mode, horizonMonths, sourceLabel),
    [predictedData, mode, horizonMonths, sourceLabel]
  );

  return (
    <div
      className={`relative rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0c0e1a] overflow-hidden ${className}`}
    >
      {/* Prediction badge */}
      {isPredict && !loading && predictedData && (
        <div
          className={`absolute top-3 right-3 z-10 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${BADGE_COLORS[mode]}`}
        >
          {BADGE_LABELS[mode]} {mode === 'forward' ? '+' : '-'}
          {horizonMonths} {horizonMonths === 1 ? 'Month' : 'Months'}
        </div>
      )}

      {/* Chart content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loading2
            overlay={false}
            size={0.5}
            message="Computing prediction..."
          />
        </div>
      ) : isPredict && breakdownProps ? (
        <SpendingBreakdownDiagram
          bare
          source={breakdownProps.source}
          middleNodes={breakdownProps.middleNodes}
          rightNodes={breakdownProps.rightNodes}
          title={
            mode === 'forward'
              ? `Predicted Flow — ${horizonMonths} ${
                  horizonMonths === 1 ? 'Month' : 'Months'
                } Ahead`
              : `Historical Flow — ${horizonMonths} ${
                  horizonMonths === 1 ? 'Month' : 'Months'
                } Back`
          }
        />
      ) : (
        <MoneyFlowDiagram
          bare
          workspaceId={isPredict ? undefined : workspaceId}
          budgetId={budgetId}
          recipientId={isPredict ? undefined : recipientId}
          campaignId={isPredict ? undefined : campaignId}
          eventId={isPredict ? undefined : eventId}
          projectId={isPredict ? undefined : projectId}
          data={isPredict ? predictedData : externalData}
          period={currentPeriod}
          showPeriodToggle={false}
          className=""
          refreshToken={refreshToken}
        />
      )}

      {/* Collapsible predict control at bottom of chart */}
      {showPredictControls && (
        <div className="border-t border-gray-200 dark:border-white/10">
          <button
            type="button"
            onClick={() => {
              if (predictExpanded) {
                setPredictExpanded(false);
                if (sliderValue !== 0) {
                  setSliderValue(0);
                  setPredictedData(null);
                }
              } else {
                setPredictExpanded(true);
              }
            }}
            className="flex w-full items-center justify-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-700 dark:text-white/60 dark:hover:text-white/90 transition-colors"
            aria-expanded={predictExpanded}
            aria-controls="money-flow-predict-panel"
          >
            <span>Predict</span>
            {predictExpanded ? (
              <FiChevronDown size={14} aria-hidden />
            ) : (
              <FiChevronUp size={14} aria-hidden />
            )}
          </button>
          {predictExpanded && (
            <div id="money-flow-predict-panel">
              {SliderComponent ? (
                <SliderComponent
                  value={sliderValue}
                  onChange={handleSliderChange}
                />
              ) : (
                <TimelineSlider
                  value={sliderValue}
                  onChange={handleSliderChange}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

PredictableMoneyFlow.propTypes = {
  workspaceId: PropTypes.string,
  data: PropTypes.object,
  period: PropTypes.string,
  showPeriodToggle: PropTypes.bool,
  showPredictControls: PropTypes.bool,
  className: PropTypes.string,
  recipientId: PropTypes.string,
  campaignId: PropTypes.string,
  eventId: PropTypes.string,
  projectId: PropTypes.string,
  budgetId: PropTypes.string,
  sourceLabel: PropTypes.string,
  SliderComponent: PropTypes.elementType,
  refreshToken: PropTypes.number
};

export default PredictableMoneyFlow;
