import React, { useEffect, useRef, useState } from 'react';
import { FiMic, FiSquare, FiChevronDown } from 'react-icons/fi';

const BAR_COUNT = 80;

/**
 * Full-width voice transcription bar that slides up above the chat bar.
 * Real-time waveform from Web Audio API AnalyserNode.
 * Mirrored bars (up + down from center) with pink→purple→cyan gradient.
 *
 * Props:
 *  - isOpen        {boolean}
 *  - isListening   {boolean}
 *  - transcript    {string}
 *  - error         {string|null}
 *  - analyser      {React.RefObject<AnalyserNode>}  from useSpeechToText
 *  - onStart       {fn}
 *  - onStop        {fn}
 *  - onInsert      {fn(text)}
 *  - onClose       {fn}
 */
export default function HudVoiceModal({
  isOpen,
  isListening,
  transcript,
  error,
  analyser,
  onStart,
  onStop,
  onInsert,
  onClose
}) {
  const [bars, setBars] = useState(() => new Array(BAR_COUNT).fill(2));
  const rafRef = useRef(null);
  const didAutoStart = useRef(false);

  // Auto-start listening when panel opens
  useEffect(() => {
    if (isOpen && !didAutoStart.current) {
      didAutoStart.current = true;
      onStart();
    }
    if (!isOpen) {
      didAutoStart.current = false;
    }
  }, [isOpen, onStart]);

  // Waveform animation — uses real audio data when available
  useEffect(() => {
    if (!isListening) {
      setBars(new Array(BAR_COUNT).fill(2));
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const freqData = new Uint8Array(128);

    const animate = () => {
      const node = analyser?.current;
      if (node) {
        // Real audio data from microphone
        node.getByteFrequencyData(freqData);
        setBars(
          Array.from({ length: BAR_COUNT }, (_, i) => {
            // Map bar index to frequency bin (spread across spectrum)
            const bin = Math.floor((i / BAR_COUNT) * freqData.length);
            const val = freqData[bin] / 255; // 0-1
            return 2 + val * 44;
          })
        );
      } else {
        // Fallback: animated sine waves
        setBars((prev) =>
          prev.map((_, i) => {
            const wave = Math.sin(Date.now() / 180 + i * 0.35) * 0.5 + 0.5;
            const jitter = Math.random() * 0.2;
            return 2 + (wave + jitter) * 38;
          })
        );
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isListening, analyser]);

  // Color gradient across bars: pink → purple → cyan
  const barColor = (i) => {
    const t = i / BAR_COUNT;
    if (t < 0.35) {
      const hue = 320 + t * (280 / 0.35);
      return `hsl(${hue % 360}, 82%, 60%)`;
    }
    if (t < 0.65) {
      const hue = 280 - (t - 0.35) * (60 / 0.3);
      return `hsl(${hue}, 75%, 55%)`;
    }
    const hue = 220 + (t - 0.65) * (40 / 0.35);
    return `hsl(${hue}, 88%, 60%)`;
  };

  return (
    <div
      className="overflow-hidden border-t border-cyan-500/[0.06] bg-[#0a0a18]/95 backdrop-blur-xl"
      style={{
        maxHeight: isOpen ? '200px' : '0px',
        opacity: isOpen ? 1 : 0,
        transition:
          'max-height 400ms cubic-bezier(0.25,0.1,0.25,1), opacity 350ms ease'
      }}
    >
      {/* Waveform + transcript */}
      <div className="relative flex items-center justify-center px-6 py-4 min-h-[100px]">
        {/* Mirrored waveform — real-time audio reactive */}
        <div className="absolute inset-0 flex items-center justify-center gap-[1px] px-2 overflow-hidden">
          {bars.map((h, i) => {
            const color = isListening ? barColor(i) : '#1e1e3a';
            return (
              <div key={i} className="flex flex-col items-center gap-0">
                {/* Top bar (grows upward) */}
                <div
                  className="w-[3px] rounded-t-sm"
                  style={{
                    height: `${h}px`,
                    background: isListening
                      ? `linear-gradient(to top, ${color}66, ${color})`
                      : '#1e1e3a'
                  }}
                />
                {/* Bottom bar (mirrored, shorter) */}
                <div
                  className="w-[3px] rounded-b-sm"
                  style={{
                    height: `${h * 0.65}px`,
                    background: isListening
                      ? `linear-gradient(to bottom, ${color}66, ${color}40)`
                      : '#1e1e3a'
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Transcript overlay */}
        <div className="relative z-10 text-center max-w-2xl">
          <p className="text-[15px] font-mono text-white leading-relaxed drop-shadow-lg">
            {transcript || (
              <span className="text-gray-500 text-[12px]">
                {isListening ? 'Listening...' : ''}
              </span>
            )}
          </p>
          {error && (
            <p className="text-[10px] font-mono text-red-400 mt-1">{error}</p>
          )}
        </div>

        {/* Controls — right side */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex items-center gap-2">
          <button
            type="button"
            onClick={isListening ? onStop : onStart}
            className={`w-8 h-8 flex items-center justify-center border transition ${
              isListening
                ? 'border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                : 'border-cyan-500/20 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20'
            }`}
          >
            {isListening ? <FiSquare size={14} /> : <FiMic size={14} />}
          </button>
          <button
            type="button"
            onClick={() => {
              if (transcript) onInsert(transcript);
              onClose();
            }}
            className="w-8 h-8 flex items-center justify-center border border-white/[0.04] text-gray-600 hover:text-cyan-400 transition"
          >
            <FiChevronDown size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
