import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import './components/V2/HudToast.css';
import './index.css';
import App from './root/presentation/App';
import V2Providers from './root/presentation/V2Providers';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container #root not found');
}

// Google client id from env; the login page guards its Google button on this
// being present, so an empty value simply hides Google sign-in (password still
// works). Set REACT_APP_GOOGLE_CLIENT_ID + authorize http://localhost:3001 as
// an origin to enable it.
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <V2Providers>
          <App />
        </V2Providers>
        {/* v2-toast-theme wraps the container so HudToast.css restyles every
            toast into the V2 HUD look (chamfered navy panel, cyan hairline). */}
        <div className="v2-toast-theme">
          <ToastContainer
            position="top-right"
            theme="dark"
            autoClose={3500}
            newestOnTop
            closeOnClick
          />
        </div>
      </BrowserRouter>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
