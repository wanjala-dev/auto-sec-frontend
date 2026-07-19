// Versioned API surface — keep in lockstep with apiClient's API_VERSION_PREFIX.
// These full-URL auth constants (login/logout/register/reset) target /api/v1/
// like every other call. The identity endpoints are byte-identical under v1.
const API_BASE_URL = `${(process.env.REACT_APP_API_BASE_URL || '').replace(
  /\/+$/,
  ''
)}/api/v1`;

export const LOGIN_URL = `${API_BASE_URL}/identity/login/`;
export const LOGOUT_URL = `${API_BASE_URL}/identity/logout/`;
export const SIGN_UP_URL = `${API_BASE_URL}/identity/register/`;
export const RESET_PASSWORD_URL = `${API_BASE_URL}/identity/auth/password/reset/`;
export const POST_IDEA_URL = `${API_BASE_URL}/ideas/`;
export const USERS_URL = `${API_BASE_URL}/identity/users/`;
export const ROUTE_LOGIN = '/identity/login';
export const ROUTE_PROFILE = '/Profile';
export const SET_PASSWORD_URL = `${API_BASE_URL}SetNewPassword/`;
export const EDIT_PROFILE_URL = '';
export const POSTS_URL = `${API_BASE_URL}/social/`;
export const GOOGLE_CLIENT_ID =
  '342465009120-2rc0ai7fi6prsurfq68ndcbuvufssefe.apps.googleusercontent.com';
export const VERIFY_EMAIL =
  'http://seed-service-dev-xfusyrzccq-uc.a.run.app/EmailConfirmed/';
