import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { select } from 'd3-selection';
import { scaleLinear } from 'd3-scale';
import { brandColor } from '../../theme/brandColor';
import apiClient from '../../infrastructure/http/apiClient';
import { useSeedContext } from '../../features/seed/presentation/SeedContext';
import { normalizeWorkspaceId as normalizeSeedId } from '../../domain/workspace/workspaceId';
import Loading2 from '../Utility/LoadingSpinner/Loading';

const PERIODS = ['1W', '1M', '3M', '1Y', 'ALL'];

const INFLOW_COLORS = [
  brandColor.primary(),
  '#388E3C',
  '#2E7D32',
  '#1B5E20',
  brandColor.secondary(),
  '#D4A017',
  '#3B82F6',
  '#6366F1'
];
const OUTFLOW_COLORS = [
  '#EC4899',
  '#F43F5E',
  '#E11D48',
  '#BE123C',
  '#F97316',
  '#F59E0B',
  '#8B5CF6',
  '#7C3AED'
];

const fmt = (v) => {
  const n = Number(v) || 0;
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
};

/* ------------------------------------------------------------------ */
/*  Cubic bezier path between two points                               */
/* ------------------------------------------------------------------ */
const flowPath = (x0, y0, x1, y1) => {
  const mx = (x0 + x1) / 2;
  return `M${x0},${y0} C${mx},${y0} ${mx},${y1} ${x1},${y1}`;
};

/* ------------------------------------------------------------------ */
/*  MoneyFlowDiagram                                                   */
/* ------------------------------------------------------------------ */

const MoneyFlowDiagram = ({
  workspaceId: wsProp,
  budgetId,
  recipientId,
  campaignId,
  eventId,
  projectId,
  data: externalData,
  period: initialPeriod = '3M',
  showPeriodToggle = true,
  bare = false,
  className = '',
  refreshToken = 0
}) => {
  const { seed } = useSeedContext();
  const resolvedWs = wsProp || normalizeSeedId(seed?.id);
  const svgRef = useRef(null);
  const [period, setPeriod] = useState(initialPeriod);
  const [flowData, setFlowData] = useState(externalData || null);
  const [loading, setLoading] = useState(!externalData);

  useEffect(() => {
    if (externalData) {
      setFlowData(externalData);
      setLoading(false);
      return;
    }
    if (!resolvedWs) return;
    setLoading(true);
    const params = { period };
    // Scope to a single budget when the consumer passes one. Backend
    // filter on this param is a Sprint-3 follow-up; plumbing the
    // intent now so once it's honoured the diagram is budget-scoped.
    if (budgetId) params.budget_id = budgetId;
    // Scope to a single entity (recipient / campaign / event / project)
    // when the consumer passes one. BudgetFlowView already honours these
    // params (see /budget/flow/<ws>/ controller + BudgetFlowQuery), so
    // forwarding them makes the diagram per-entity instead of
    // workspace-wide.
    if (recipientId) params.recipient_id = recipientId;
    if (campaignId) params.campaign_id = campaignId;
    if (eventId) params.event_id = eventId;
    if (projectId) params.project_id = projectId;
    apiClient
      .get(`/budget/flow/${resolvedWs}/`, { params })
      .then((res) => setFlowData(res?.data || null))
      .catch(() => setFlowData(null))
      .finally(() => setLoading(false));
  }, [
    resolvedWs,
    period,
    externalData,
    budgetId,
    recipientId,
    campaignId,
    eventId,
    projectId,
    refreshToken
  ]);

  // Compute dynamic height based on data
  const inflows = useMemo(
    () => (flowData?.inflows || []).filter((d) => d.total > 0),
    [flowData]
  );
  const outflows = useMemo(
    () => (flowData?.outflows || []).filter((d) => d.total > 0),
    [flowData]
  );
  const maxNodes = Math.max(inflows.length, outflows.length, 1);
  const svgHeight = maxNodes * 58 + 50;
  const svgWidth = 900;

  // Draw SVG
  useEffect(() => {
    if (!svgRef.current || !flowData) return;

    const svg = select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 6, right: 20, bottom: 6, left: 20 };
    const w = svgWidth - margin.left - margin.right;
    const h = svgHeight - margin.top - margin.bottom;
    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Defs for gradients
    const defs = svg.append('defs');

    const totalIn = flowData.total_in || 0;
    const totalOut = flowData.total_out || 0;

    if (!inflows.length && !outflows.length) {
      g.append('text')
        .attr('x', w / 2)
        .attr('y', h / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#555')
        .attr('font-size', '14px')
        .text('No transaction data for this period');
      return;
    }

    const leftX = 0;
    const centerX = w / 2;
    const rightX = w;
    const barW = 6;
    const gap = 10;

    // Layout inflow nodes
    const inflowTotalH = h - 40;
    let iy = 20;
    const iNodes = inflows.map((d, i) => {
      const frac = totalIn > 0 ? d.total / totalIn : 1 / inflows.length;
      const nh = Math.max(frac * inflowTotalH - gap, 12);
      const node = {
        ...d,
        x: leftX,
        y: iy,
        h: nh,
        color: INFLOW_COLORS[i % INFLOW_COLORS.length]
      };
      iy += nh + gap;
      return node;
    });

    // Layout outflow nodes
    const outflowTotalH = h - 40;
    let oy = 20;
    const oNodes = outflows.map((d, i) => {
      const frac = totalOut > 0 ? d.total / totalOut : 1 / outflows.length;
      const nh = Math.max(frac * outflowTotalH - gap, 12);
      const node = {
        ...d,
        x: rightX - barW,
        y: oy,
        h: nh,
        color: OUTFLOW_COLORS[i % OUTFLOW_COLORS.length]
      };
      oy += nh + gap;
      return node;
    });

    // Center node position
    const centerY = h / 2;

    // Draw inflow paths (left → center)
    const iCenterH = Math.min(h * 0.6, iNodes.length * 30);
    const iStep = iCenterH / Math.max(iNodes.length, 1);
    const iStartY = centerY - iCenterH / 2;

    iNodes.forEach((node, i) => {
      const gradId = `ig-${i}`;
      const grad = defs
        .append('linearGradient')
        .attr('id', gradId)
        .attr('x1', '0%')
        .attr('x2', '100%');
      grad
        .append('stop')
        .attr('offset', '0%')
        .attr('stop-color', node.color)
        .attr('stop-opacity', 0.85);
      grad
        .append('stop')
        .attr('offset', '100%')
        .attr('stop-color', node.color)
        .attr('stop-opacity', 0.15);

      const sy = node.y + node.h / 2;
      const ty = iStartY + i * iStep + iStep / 2;
      const thickness = Math.max(node.h * 0.8, 3);

      g.append('path')
        .attr('d', flowPath(leftX + barW + 2, sy, centerX - 50, ty))
        .attr('fill', 'none')
        .attr('stroke', `url(#${gradId})`)
        .attr('stroke-width', thickness)
        .attr('opacity', 0.75);

      // Bar
      g.append('rect')
        .attr('x', leftX)
        .attr('y', node.y)
        .attr('width', barW)
        .attr('height', node.h)
        .attr('rx', 3)
        .attr('fill', node.color);

      // Labels
      g.append('text')
        .attr('x', leftX + barW + 12)
        .attr('y', node.y + node.h / 2 - 8)
        .attr('fill', '#ccc')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .text(node.label);
      g.append('text')
        .attr('x', leftX + barW + 12)
        .attr('y', node.y + node.h / 2 + 6)
        .attr('fill', node.color)
        .attr('font-size', '13px')
        .attr('font-weight', '700')
        .text(fmt(node.total));
      g.append('text')
        .attr('x', leftX + barW + 12)
        .attr('y', node.y + node.h / 2 + 18)
        .attr('fill', '#555')
        .attr('font-size', '9px')
        .text(`${node.count} transactions`);
    });

    // Draw outflow paths (center → right)
    const oCenterH = Math.min(h * 0.6, oNodes.length * 30);
    const oStep = oCenterH / Math.max(oNodes.length, 1);
    const oStartY = centerY - oCenterH / 2;

    oNodes.forEach((node, i) => {
      const gradId = `og-${i}`;
      const grad = defs
        .append('linearGradient')
        .attr('id', gradId)
        .attr('x1', '0%')
        .attr('x2', '100%');
      grad
        .append('stop')
        .attr('offset', '0%')
        .attr('stop-color', node.color)
        .attr('stop-opacity', 0.15);
      grad
        .append('stop')
        .attr('offset', '100%')
        .attr('stop-color', node.color)
        .attr('stop-opacity', 0.85);

      const sy = oStartY + i * oStep + oStep / 2;
      const ty = node.y + node.h / 2;
      const thickness = Math.max(node.h * 0.8, 3);

      g.append('path')
        .attr('d', flowPath(centerX + 50, sy, rightX - barW - 2, ty))
        .attr('fill', 'none')
        .attr('stroke', `url(#${gradId})`)
        .attr('stroke-width', thickness)
        .attr('opacity', 0.75);

      // Bar
      g.append('rect')
        .attr('x', node.x)
        .attr('y', node.y)
        .attr('width', barW)
        .attr('height', node.h)
        .attr('rx', 3)
        .attr('fill', node.color);

      // Labels (right-aligned)
      g.append('text')
        .attr('x', rightX - barW - 12)
        .attr('y', node.y + node.h / 2 - 8)
        .attr('fill', '#ccc')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('text-anchor', 'end')
        .text(node.label);
      g.append('text')
        .attr('x', rightX - barW - 12)
        .attr('y', node.y + node.h / 2 + 6)
        .attr('fill', node.color)
        .attr('font-size', '13px')
        .attr('font-weight', '700')
        .attr('text-anchor', 'end')
        .text(fmt(node.total));
    });

    // Center hub
    g.append('circle')
      .attr('cx', centerX)
      .attr('cy', centerY)
      .attr('r', 55)
      .attr('fill', 'none')
      .attr('stroke', '#333')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,4')
      .attr('opacity', 0.5);

    g.append('text')
      .attr('x', centerX)
      .attr('y', centerY - 12)
      .attr('text-anchor', 'middle')
      .attr('fill', '#777')
      .attr('font-size', '10px')
      .text('Net balance');
    g.append('text')
      .attr('x', centerX)
      .attr('y', centerY + 12)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '24px')
      .attr('font-weight', '800')
      .text(fmt(flowData.net || 0));
    g.append('text')
      .attr('x', centerX)
      .attr('y', centerY + 28)
      .attr('text-anchor', 'middle')
      .attr('fill', '#555')
      .attr('font-size', '9px')
      .text(`${fmt(totalIn)} in · ${fmt(totalOut)} out`);
  }, [flowData, inflows, outflows, svgHeight]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-16 ${className}`}>
        <Loading2 overlay={false} size={0.5} message="Loading flow data..." />
      </div>
    );
  }

  return (
    <div
      className={
        bare
          ? `overflow-hidden ${className}`
          : `rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0c0e1a] overflow-hidden ${className}`
      }
    >
      <div className="px-4 pt-2 pb-0.5">
        {showPeriodToggle && (
          <div className="flex items-center justify-center gap-1 mb-2">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 mr-3">
              Timeline
            </p>
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  period === p
                    ? 'bg-emerald-500 text-white'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
        <h2 className="text-center text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
          Money Flow
        </h2>
      </div>

      <div className="overflow-x-auto px-2 pb-2">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full"
          style={{ minWidth: '700px', maxHeight: '700px' }}
        />
      </div>

      {flowData && (
        <div className="grid grid-cols-3 gap-4 px-4 pb-2 border-t border-gray-100 dark:border-white/5 pt-2">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-widest text-gray-400">
              Total In
            </p>
            <p className="text-xl font-bold text-emerald-500">
              {fmt(flowData.total_in)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-widest text-gray-400">
              Balance
            </p>
            <p
              className={`text-xl font-bold ${
                (flowData.net || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'
              }`}
            >
              {fmt(flowData.net)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-widest text-gray-400">
              Total Out
            </p>
            <p className="text-xl font-bold text-rose-500">
              {fmt(flowData.total_out)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

MoneyFlowDiagram.propTypes = {
  workspaceId: PropTypes.string,
  budgetId: PropTypes.string,
  recipientId: PropTypes.string,
  campaignId: PropTypes.string,
  eventId: PropTypes.string,
  projectId: PropTypes.string,
  data: PropTypes.object,
  period: PropTypes.string,
  showPeriodToggle: PropTypes.bool,
  bare: PropTypes.bool,
  className: PropTypes.string,
  refreshToken: PropTypes.number
};

export default MoneyFlowDiagram;
