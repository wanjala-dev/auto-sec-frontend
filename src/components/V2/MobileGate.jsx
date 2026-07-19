import React from 'react';
import HexEyeLogo from './HexEyeLogo';

/**
 * V2 Mobile Gate — shows a "desktop only" message on small screens.
 * Wrap the V2 command center with this component.
 */
const MobileGate = ({ children }) => (
  <React.Fragment>
    {/* Desktop: show children */}
    <div className="hidden lg:block h-full">{children}</div>

    {/* Mobile/tablet: show gate message */}
    <div className="lg:hidden fixed inset-0 z-50 bg-[#020309] flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="mb-6 flex justify-center">
          <HexEyeLogo className="h-16 w-16" />
        </div>
        <h1 className="text-lg font-mono font-bold text-cyan-400 tracking-wider mb-2">
          DESKTOP REQUIRED
        </h1>
        <p className="text-[12px] font-mono text-gray-500 leading-relaxed mb-6">
          The Command Center V2 is designed for desktop displays. Please access
          this interface from a device with a larger screen.
        </p>
        <p className="text-[8px] font-mono text-gray-700 tracking-[0.2em]">
          MINIMUM RESOLUTION: 1024 × 768
        </p>
      </div>
    </div>
  </React.Fragment>
);

export default MobileGate;
