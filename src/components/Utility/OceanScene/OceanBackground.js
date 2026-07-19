import React from 'react';
import './OceanScene.css';

export default function OceanBackground() {
  return (
    <div className="ocean-scene">
      {/* Ambient color variation */}
      <div className="ocean-ambient" />

      {/* Light caustics from surface */}
      <div className="ocean-caustics" />

      {/* Light rays — all from top-left */}
      <div className="ocean-rays">
        <div className="ocean-ray" />
        <div className="ocean-ray" />
        <div className="ocean-ray" />
        <div className="ocean-ray" />
        <div className="ocean-ray" />
        <div className="ocean-ray" />
      </div>

      {/* Bubbles — behind content */}
      <div className="ocean-bubbles">
        <div className="ocean-bubble" />
        <div className="ocean-bubble" />
        <div className="ocean-bubble" />
        <div className="ocean-bubble" />
        <div className="ocean-bubble" />
        <div className="ocean-bubble" />
        <div className="ocean-bubble" />
        <div className="ocean-bubble" />
      </div>

      {/* Bubbles — in front of content */}
      <div className="ocean-bubbles-front">
        <div className="ocean-bubble" />
        <div className="ocean-bubble" />
        <div className="ocean-bubble" />
        <div className="ocean-bubble" />
      </div>

      {/* Seabed */}
      <div className="ocean-floor">
        <div className="ocean-floor-sand" />
        <div className="ocean-floor-texture" />
        {/* Rocks */}
        <div className="ocean-rock" />
        <div className="ocean-rock" />
        <div className="ocean-rock" />
        <div className="ocean-rock" />
        <div className="ocean-rock" />
        <div className="ocean-rock" />
        {/* Seaweed clusters */}
        <div className="ocean-seaweed" />
        <div className="ocean-seaweed" />
        <div className="ocean-seaweed" />
        <div className="ocean-seaweed" />
        <div className="ocean-seaweed" />
        <div className="ocean-seaweed" />
        <div className="ocean-seaweed" />
        <div className="ocean-seaweed" />
      </div>
    </div>
  );
}
