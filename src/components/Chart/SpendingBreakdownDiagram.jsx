import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { select } from 'd3-selection';

const MIDDLE_COLORS = [
  '#EC4899',
  '#F43F5E',
  '#E11D48',
  '#F97316',
  '#F59E0B',
  '#D946EF'
];
const RIGHT_COLORS = [
  '#8B5CF6',
  '#7C3AED',
  '#6366F1',
  '#4F46E5',
  '#4338CA',
  '#3730A3'
];

const fmt = (v) => {
  const n = Number(v) || 0;
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
};

const flowPath = (x0, y0, x1, y1) => {
  const mx = (x0 + x1) / 2;
  return `M${x0},${y0} C${mx},${y0} ${mx},${y1} ${x1},${y1}`;
};

/**
 * Spending breakdown Sankey — shows how money from a single source
 * splits into intermediate categories and then into final destinations.
 *
 * Props:
 *   source      — { label, total, subtitle?, icon? }
 *   middleNodes — [{ key, label, total, subtitle? }] (categories/budgets)
 *   rightNodes  — [{ key, label, total, subtitle? }] (destinations/projects)
 *   title       — heading text
 *   className   — wrapper class
 *
 * If rightNodes is empty, renders a 2-column layout (source → middle).
 * If rightNodes is provided, renders 3-column (source → middle → right).
 */
const SpendingBreakdownDiagram = ({
  source,
  middleNodes = [],
  rightNodes = [],
  title = 'Spending Breakdown',
  bare = false,
  className = ''
}) => {
  const svgRef = useRef(null);
  const hasRight = rightNodes.length > 0;
  const maxNodes = Math.max(middleNodes.length, rightNodes.length, 1);
  const svgHeight = maxNodes * 58 + 50;
  const svgWidth = hasRight ? 900 : 700;

  useEffect(() => {
    if (!svgRef.current || !source) return;

    const svg = select(svgRef.current);
    svg.selectAll('*').remove();

    const defs = svg.append('defs');
    const margin = { top: 6, right: 16, bottom: 6, left: 16 };
    const w = svgWidth - margin.left - margin.right;
    const h = svgHeight - margin.top - margin.bottom;
    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const sourceTotal = source.total || 0;
    if (!sourceTotal || !middleNodes.length) {
      g.append('text')
        .attr('x', w / 2)
        .attr('y', h / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#555')
        .attr('font-size', '14px')
        .text('No spending data');
      return;
    }

    // Column positions
    const leftX = 0;
    const midX = hasRight ? w * 0.38 : w * 0.55;
    const rightX = w;
    const cardW = 150;
    const cardH = 44;
    const cardR = 10;
    const gap = 8;

    // Source card (left) — centered vertically
    const sourceCardH = 70;
    const sourceCardW = 160;
    const sourceY = (h - sourceCardH) / 2;

    // Source card background
    const sourceGrad = defs
      .append('linearGradient')
      .attr('id', 'source-grad')
      .attr('x1', '0%')
      .attr('x2', '100%');
    sourceGrad
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#06B6D4');
    sourceGrad
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#22D3EE');

    g.append('rect')
      .attr('x', leftX)
      .attr('y', sourceY)
      .attr('width', sourceCardW)
      .attr('height', sourceCardH)
      .attr('rx', 16)
      .attr('fill', 'url(#source-grad)')
      .attr('filter', 'drop-shadow(0 8px 24px rgba(6,182,212,0.3))');

    g.append('text')
      .attr('x', leftX + 16)
      .attr('y', sourceY + 35)
      .attr('fill', '#fff')
      .attr('font-size', '15px')
      .attr('font-weight', '700')
      .text(source.label);
    g.append('text')
      .attr('x', leftX + 16)
      .attr('y', sourceY + 52)
      .attr('fill', '#fff')
      .attr('font-size', '10px')
      .attr('opacity', 0.8)
      .text(source.subtitle || fmt(source.total));

    // Gradient dot at source exit
    g.append('circle')
      .attr('cx', sourceCardW + 5)
      .attr('cy', sourceY + sourceCardH / 2)
      .attr('r', 6)
      .attr('fill', '#EC4899');
    g.append('circle')
      .attr('cx', sourceCardW + 5)
      .attr('cy', sourceY + sourceCardH / 2)
      .attr('r', 3)
      .attr('fill', '#fff');

    // Middle cards
    const totalMiddleH = middleNodes.length * (cardH + gap) - gap;
    let my = (h - totalMiddleH) / 2;
    const mCards = middleNodes.map((node, i) => {
      const card = {
        ...node,
        x: midX,
        y: my,
        color: MIDDLE_COLORS[i % MIDDLE_COLORS.length]
      };
      my += cardH + gap;
      return card;
    });

    // Draw source → middle paths
    mCards.forEach((card, i) => {
      const gradId = `sm-${i}`;
      const grad = defs
        .append('linearGradient')
        .attr('id', gradId)
        .attr('x1', '0%')
        .attr('x2', '100%');
      grad
        .append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#06B6D4')
        .attr('stop-opacity', 0.7);
      grad
        .append('stop')
        .attr('offset', '40%')
        .attr('stop-color', '#06B6D4')
        .attr('stop-opacity', 0.5);
      grad
        .append('stop')
        .attr('offset', '70%')
        .attr('stop-color', card.color)
        .attr('stop-opacity', 0.5);
      grad
        .append('stop')
        .attr('offset', '100%')
        .attr('stop-color', card.color)
        .attr('stop-opacity', 0.7);

      const frac =
        sourceTotal > 0 ? card.total / sourceTotal : 1 / mCards.length;
      const thickness = Math.max(frac * 40, 8);

      g.append('path')
        .attr(
          'd',
          flowPath(
            sourceCardW + 12,
            sourceY + sourceCardH / 2,
            midX,
            card.y + cardH / 2
          )
        )
        .attr('fill', 'none')
        .attr('stroke', `url(#${gradId})`)
        .attr('stroke-width', thickness)
        .attr('opacity', 0.75);

      // Card
      g.append('rect')
        .attr('x', card.x)
        .attr('y', card.y)
        .attr('width', cardW)
        .attr('height', cardH)
        .attr('rx', cardR)
        .attr('fill', card.color)
        .attr('opacity', 0.9);

      g.append('text')
        .attr('x', card.x + 14)
        .attr('y', card.y + 20)
        .attr('fill', '#fff')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .text(card.label);
      g.append('text')
        .attr('x', card.x + 14)
        .attr('y', card.y + 36)
        .attr('fill', '#fff')
        .attr('font-size', '14px')
        .attr('font-weight', '700')
        .text(fmt(card.total));
      if (card.subtitle) {
        g.append('text')
          .attr('x', card.x + 14)
          .attr('y', card.y + 48)
          .attr('fill', '#fff')
          .attr('font-size', '9px')
          .attr('opacity', 0.7)
          .text(card.subtitle);
      }
    });

    // Right cards (if provided)
    if (hasRight) {
      const totalRightH = rightNodes.length * (cardH + gap) - gap;
      let ry = (h - totalRightH) / 2;
      const rCards = rightNodes.map((node, i) => {
        const card = {
          ...node,
          x: rightX - cardW,
          y: ry,
          color: RIGHT_COLORS[i % RIGHT_COLORS.length]
        };
        ry += cardH + gap;
        return card;
      });

      // Middle → right paths
      rCards.forEach((rCard, ri) => {
        // Connect from each middle card proportionally
        const mSource = mCards[ri % mCards.length];
        const gradId = `mr-${ri}`;
        const grad = defs
          .append('linearGradient')
          .attr('id', gradId)
          .attr('x1', '0%')
          .attr('x2', '100%');
        grad
          .append('stop')
          .attr('offset', '0%')
          .attr('stop-color', mSource.color)
          .attr('stop-opacity', 0.3);
        grad
          .append('stop')
          .attr('offset', '100%')
          .attr('stop-color', rCard.color)
          .attr('stop-opacity', 0.7);

        const totalRight = rightNodes.reduce((s, n) => s + (n.total || 0), 0);
        const frac =
          totalRight > 0 ? rCard.total / totalRight : 1 / rCards.length;
        const thickness = Math.max(frac * 30, 3);

        g.append('path')
          .attr(
            'd',
            flowPath(
              midX + cardW,
              mSource.y + cardH / 2,
              rCard.x,
              rCard.y + cardH / 2
            )
          )
          .attr('fill', 'none')
          .attr('stroke', `url(#${gradId})`)
          .attr('stroke-width', thickness)
          .attr('opacity', 0.6);

        // Card
        g.append('rect')
          .attr('x', rCard.x)
          .attr('y', rCard.y)
          .attr('width', cardW)
          .attr('height', cardH)
          .attr('rx', cardR)
          .attr('fill', 'none')
          .attr('stroke', rCard.color)
          .attr('stroke-width', 1.5);

        g.append('text')
          .attr('x', rCard.x + 14)
          .attr('y', rCard.y + 20)
          .attr('fill', '#ddd')
          .attr('font-size', '11px')
          .attr('font-weight', '600')
          .text(rCard.label);
        g.append('text')
          .attr('x', rCard.x + 14)
          .attr('y', rCard.y + 36)
          .attr('fill', rCard.color)
          .attr('font-size', '14px')
          .attr('font-weight', '700')
          .text(fmt(rCard.total));
        if (rCard.subtitle) {
          g.append('text')
            .attr('x', rCard.x + 14)
            .attr('y', rCard.y + 48)
            .attr('fill', '#777')
            .attr('font-size', '9px')
            .text(rCard.subtitle);
        }
      });
    }
  }, [source, middleNodes, rightNodes, svgHeight, svgWidth, hasRight]);

  return (
    <div
      className={
        bare
          ? `overflow-hidden ${className}`
          : `rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0c0e1a] overflow-hidden ${className}`
      }
    >
      <div className="px-4 pt-2 pb-0.5">
        <h2 className="text-center text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
          {title}
        </h2>
      </div>
      <div className="overflow-x-auto px-1 pb-1">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full"
          style={{ minWidth: '500px' }}
        />
      </div>
    </div>
  );
};

SpendingBreakdownDiagram.propTypes = {
  source: PropTypes.shape({
    label: PropTypes.string,
    total: PropTypes.number,
    subtitle: PropTypes.string
  }),
  middleNodes: PropTypes.array,
  rightNodes: PropTypes.array,
  title: PropTypes.string,
  bare: PropTypes.bool,
  className: PropTypes.string
};

export default SpendingBreakdownDiagram;
