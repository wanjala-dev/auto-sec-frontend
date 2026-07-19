import React from 'react';
import './index.css';
import BrandLogo from '../../Utility/BrandLogo';
import { useActiveWorkspaceBrand } from '../../../features/theme/presentation/useActiveWorkspaceBrand';

// The spinner mark shows the active workspace's brand logo when one is
// resolved (post-auth), falling back to the Octopus SVG otherwise (pre-auth
// / initial load, before the workspace summary is cached). A tiny functional
// child so the class component can read the brand hook.
const SpinnerBrandMark = () => {
  const { logoUrl, name } = useActiveWorkspaceBrand();
  return (
    <BrandLogo
      logoUrl={logoUrl}
      name={name}
      className="object-contain"
      style={{ width: '5rem', height: '5rem' }}
    />
  );
};

class Loading2 extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      message: '',
      fail: true,
      errors: {}
    };
  }

  render() {
    const { message, overlay = true, size = 0.7 } = this.props;

    return (
      <div className={overlay ? 'Home' : ''}>
        <div
          className={`content ${overlay ? 'loader-wrapper' : ''}`}
          style={
            !overlay
              ? {
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%'
                }
              : undefined
          }
        >
          <div className="spinner" style={{ transform: `scale(${size})` }}>
            <section className="loading"></section>
            <span
              className={overlay ? 'logo_centered' : 'logo_centered_local'}
              style={{
                width: '5rem',
                height: '5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <SpinnerBrandMark />
            </span>
          </div>
          {message && <section className="description">{message}</section>}
        </div>
      </div>
    );
  }
}

export default Loading2;
