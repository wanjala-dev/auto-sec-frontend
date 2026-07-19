import React, { useEffect, useState } from 'react';
import { subscribeConnectivity } from '../../infrastructure/http/apiClient';
import '../../components/Utility/Sunrise/Sunrise.css';
import Button from '../Button/Button';

export default function ConnectivityBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    return subscribeConnectivity(setOffline);
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed inset-0 z-[10000] overflow-hidden connectivity-sunset">
      <div className="absolute inset-0 backdrop-blur-md bg-black/40 z-[29]"></div>
      <div className="sky"></div>
      <div className="sea">
        <div className="light"></div>
      </div>
      <div className="sun"></div>
      <div className="bird1"></div>
      <div className="birdr1"></div>
      <div className="bird"></div>
      <div className="birdr"></div>
      <div className="fin">
        <div className="wave"></div>
      </div>
      <div
        className="absolute inset-0 z-[78] pointer-events-none bg-black"
        style={{
          opacity: 0.9,
          animation: 'connectivityPageDarken 90s ease-in-out infinite'
        }}
      />
      <div
        className="absolute inset-0 z-[80] flex items-center justify-center"
        style={{ paddingTop: '12vh' }}
      >
        <div
          className="flex flex-col items-center text-center px-6 max-w-md"
          style={{
            opacity: 0,
            animation: 'connectivityTextFadeIn 1.2s ease-out 0.3s forwards'
          }}
        >
          <h1 className="text-3xl font-bold text-white drop-shadow-lg">
            We&apos;ll be right back
          </h1>
          <p className="mt-3 text-sm text-white/80 leading-relaxed drop-shadow">
            Our servers are temporarily unavailable. Hang tight &mdash;
            we&apos;ll reconnect automatically when things are back up.
          </p>
          <Button
            variant="primary"
            pill
            size="normal"
            className="mt-8"
            onClick={() => window.location.reload()}
          >
            Try again
          </Button>
        </div>
      </div>
      <style>{`
        @keyframes connectivityTextFadeIn {
          0% { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        /* Override the marketing Sunrise behavior: full sunrise → sunset → dark-dwell loop. */
        /* 90s cycle: ~3s emerge, ~26s rise, ~7s hold peak, ~18s set + darken, ~35s dark dwell. */
        .connectivity-sunset .sun {
          animation: connectivitySunSet 90s ease-in-out infinite;
          transform-origin: center;
        }
        @keyframes connectivitySunSet {
          /* Sun absent, page dark — also the seamless return point of the prior cycle */
          0%   { top: 50%; transform: scale(0);    opacity: 0;    box-shadow: 0 0 0 0 transparent, 0 0 0 0 transparent; }
          /* Emerges at the horizon */
          4%   { top: 50%; transform: scale(1);    opacity: 1;    box-shadow: 0 0 60px 10px #f20, 0 0 200px 20px #f33; }
          /* Rises to its peak */
          33%  { top: 15%; transform: scale(1);    opacity: 1;    box-shadow: 0 0 60px 10px #f20, 0 0 200px 20px #f33; }
          /* Holds at peak */
          41%  { top: 15%; transform: scale(1);    opacity: 1;    box-shadow: 0 0 60px 10px #f20, 0 0 200px 20px #f33; }
          /* Mid-set: shrinking + cooling */
          50%  { top: 15%; transform: scale(0.55); opacity: 0.55; box-shadow: 0 0 30px 4px #a10, 0 0 100px 10px #a22; }
          /* Fully set */
          61%  { top: 15%; transform: scale(0);    opacity: 0;    box-shadow: 0 0 0 0 transparent, 0 0 0 0 transparent; }
          /* Dark dwell — sun travels invisibly back to its emerge position for the next cycle */
          100% { top: 50%; transform: scale(0);    opacity: 0;    box-shadow: 0 0 0 0 transparent, 0 0 0 0 transparent; }
        }
        /* Mirror the dim on the horizon glow so it fades with the sun */
        .connectivity-sunset .light {
          animation: connectivityLightDim 90s ease-in-out infinite;
        }
        @keyframes connectivityLightDim {
          0%   { opacity: 0; }
          4%   { opacity: 0; }
          25%  { opacity: 0.2; }
          41%  { opacity: 0.2; }
          50%  { opacity: 0.08; }
          61%  { opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes connectivityPageDarken {
          0%   { opacity: 0.9; }
          4%   { opacity: 0; }
          41%  { opacity: 0; }
          50%  { opacity: 0.55; }
          61%  { opacity: 0.9; }
          100% { opacity: 0.9; }
        }
        @media (prefers-reduced-motion: reduce) {
          .connectivity-sunset .sun,
          .connectivity-sunset .light { animation: none; }
        }
      `}</style>
    </div>
  );
}
