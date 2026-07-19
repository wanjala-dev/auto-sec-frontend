export const normalizeCartQuantity = (quantity: any, delta = 0) => {
  const numericQuantity = Number(quantity);
  const base = Number.isFinite(numericQuantity) ? numericQuantity : 0;
  return Math.max(base + delta, 0);
};

export const resolveStoredUserId = () => {
  try {
    const rawUser = localStorage.getItem('user');
    if (!rawUser) return null;
    const parsed = JSON.parse(rawUser);
    return (
      parsed?.pk || parsed?.id || parsed?.user?.pk || parsed?.user?.id || null
    );
  } catch {
    return null;
  }
};

export const extractCartItems = (payload: any) => payload?.data || [];

export const extractFirstCartItem = (payload: any) =>
  Array.isArray(payload) && payload.length > 0 ? payload[0] : null;

export const normalizeCartErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ||
  error?.response?.data?.detail ||
  error?.response?.data ||
  error?.message ||
  fallback;
