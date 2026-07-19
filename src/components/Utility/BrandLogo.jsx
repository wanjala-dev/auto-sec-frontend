import React from 'react';

import OctopusLogo from './OctopusLogo';

/**
 * The app's main mark: renders a workspace's brand logo (`logoUrl`) as an
 * <img> when present, falling back to the default Octopus SVG otherwise.
 *
 * Used both pre-auth (login-brand from the `?ws=` lookup) and post-auth (the
 * active workspace's `theme.logo_url`) so every logo site brands consistently
 * and unbranded workspaces keep the octopus unchanged. `className` styles the
 * rendered element (SVG or <img>) so callers size it exactly as before.
 */
const BrandLogo = ({ logoUrl, name = '', className = '', ...rest }) => {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name || 'Workspace logo'}
        className={className}
        {...rest}
      />
    );
  }
  return <OctopusLogo className={className} {...rest} />;
};

export default BrandLogo;
