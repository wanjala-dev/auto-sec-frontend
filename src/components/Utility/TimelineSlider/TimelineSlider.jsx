import React, { useCallback, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';

/**
 * Draggable timeline slider for predict forward/backward.
 *
 * Range: -6 (backward 6 months) to +6 (forward 6 months), center = 0 (now).
 * Snaps to: -6, -3, -1, 0, +1, +3, +6 on release.
 * Smooth dragging while held — snaps only on pointerUp.
 */

const STEPS = [-6, -3, -1, 0, 1, 3, 6];

const STEP_LABELS = {
  '-6': '6 mo ago',
  '-3': '3 mo ago',
  '-1': '1 mo ago',
  0: 'Now',
  1: '1 mo',
  3: '3 mo',
  6: '6 mo'
};

const snapToStep = (raw) => {
  let closest = STEPS[0];
  let minDist = Math.abs(raw - closest);
  for (const step of STEPS) {
    const dist = Math.abs(raw - step);
    if (dist < minDist) {
      minDist = dist;
      closest = step;
    }
  }
  return closest;
};

const rawToPct = (raw) => ((raw + 6) / 12) * 100;

const TimelineSlider = ({ value = 0, onChange }) => {
  const snapped = useMemo(() => snapToStep(value), [value]);
  const [dragging, setDragging] = useState(false);
  const [rawValue, setRawValue] = useState(snapped);
  // Ref always holds the latest raw value — no stale closure issues
  const rawRef = useRef(snapped);

  const displayValue = dragging ? rawValue : snapped;
  const thumbPct = rawToPct(displayValue);

  const handleInput = useCallback((e) => {
    const raw = Number(e.target.value);
    rawRef.current = raw;
    setRawValue(raw);
    setDragging(true);
  }, []);

  // Reads from ref so it always gets the latest value, even during fast drags
  const handleCommit = useCallback(() => {
    setDragging(false);
    const latest = rawRef.current;
    const stepped = snapToStep(latest);
    rawRef.current = stepped;
    setRawValue(stepped);
    onChange?.(stepped);
  }, [onChange]);

  // Also fire onChange on every snap boundary crossing during drag
  // so the chart updates live if the user pauses on a step
  const lastFiredRef = useRef(snapped);
  const handleChange = useCallback(
    (e) => {
      const raw = Number(e.target.value);
      rawRef.current = raw;
      setRawValue(raw);
      setDragging(true);

      const stepped = snapToStep(raw);
      if (stepped !== lastFiredRef.current) {
        lastFiredRef.current = stepped;
        onChange?.(stepped);
      }
    },
    [onChange]
  );

  const handleTickClick = useCallback(
    (step) => {
      rawRef.current = step;
      lastFiredRef.current = step;
      setRawValue(step);
      setDragging(false);
      onChange?.(step);
    },
    [onChange]
  );

  return (
    <div className="w-full px-3 pt-4 pb-2">
      {/* Tick labels */}
      <div className="relative flex justify-between px-0.5 mb-2">
        {STEPS.map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => handleTickClick(step)}
            className={`text-[10px] font-medium transition-colors cursor-pointer leading-none ${
              snapped === step
                ? 'text-emerald-400 font-bold'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {STEP_LABELS[String(step)]}
          </button>
        ))}
      </div>

      {/* Slider track — progress bar style */}
      <div className="relative h-8 flex items-center cursor-pointer">
        {/* Background track */}
        <div className="absolute inset-x-0 h-3.5 rounded-full bg-gray-800/60 border border-gray-700/50" />

        {/* Gradient fill from left to thumb */}
        <div
          className="absolute h-3.5 rounded-full"
          style={{
            left: 0,
            width: `${thumbPct}%`,
            background:
              'linear-gradient(90deg, #10B981 0%, #22D3EE 40%, #F59E0B 100%)',
            transition: dragging ? 'none' : 'width 0.2s ease-out'
          }}
        />

        {/* Tick marks on the track */}
        {STEPS.map((step) => {
          const stepPct = rawToPct(step);
          return (
            <div
              key={step}
              className={`absolute w-0.5 rounded-full ${
                step === 0 ? 'h-5 bg-gray-500/50' : 'h-3 bg-gray-600/30'
              }`}
              style={{
                left: `${stepPct}%`,
                transform: 'translateX(-50%)'
              }}
            />
          );
        })}

        {/* Range input (invisible, on top for drag interaction) */}
        <input
          type="range"
          min={-6}
          max={6}
          step={0.1}
          value={displayValue}
          onInput={handleChange}
          onChange={handleChange}
          onMouseUp={handleCommit}
          onTouchEnd={handleCommit}
          onPointerUp={handleCommit}
          className="absolute inset-0 w-full h-full opacity-0 cursor-grab active:cursor-grabbing"
          aria-label="Prediction timeline"
        />

        {/* Thumb — bigger, more visible */}
        <div
          className="absolute flex items-center justify-center h-7 w-14 rounded-full border-2 border-white/90 shadow-xl pointer-events-none"
          style={{
            left: `${thumbPct}%`,
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #10B981, #F59E0B)',
            transition: dragging ? 'none' : 'left 0.2s ease-out',
            boxShadow: '0 2px 12px rgba(16, 185, 129, 0.4)'
          }}
        >
          <span className="text-[9px] font-bold text-white leading-none select-none">
            {snapped === 0 ? 'NOW' : snapped > 0 ? `+${snapped}` : snapped}
          </span>
        </div>
      </div>

      {/* Slide hint */}
      <p className="text-center text-[8px] uppercase tracking-[0.2em] text-gray-600 mt-1 select-none">
        drag to predict
      </p>
    </div>
  );
};

TimelineSlider.propTypes = {
  value: PropTypes.number,
  onChange: PropTypes.func
};

export default TimelineSlider;
