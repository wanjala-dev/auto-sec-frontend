import React, { useMemo } from 'react';
import PropTypes from 'prop-types';

const StarField = ({ count = 140 }) => {
  const s = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        i,
        cx: Math.random() * 100,
        cy: Math.random() * 100,
        r: Math.random() * 1.2 + 0.2,
        o: Math.random() * 0.5 + 0.08,
        d: Math.random() * 5
      })),
    [count]
  );

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none">
      {s.map((s) => (
        <circle
          key={s.i}
          cx={`${s.cx}%`}
          cy={`${s.cy}%`}
          r={s.r}
          fill="white"
          opacity={s.o}
          style={{
            animation: `cc-twinkle ${2 + s.d}s ease-in-out infinite alternate`,
            animationDelay: `${s.d}s`
          }}
        />
      ))}
    </svg>
  );
};

StarField.propTypes = {
  count: PropTypes.number
};

export default StarField;
