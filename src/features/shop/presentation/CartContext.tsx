import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef
} from 'react';

import { useFeatureFlags } from '../../feature-flags/presentation/FeatureFlagsContext';
import cartReducer from '../../../reducer/cartReducer';
import { CART_ACTIONS, cartInitialState } from './cartContextConfig';
import { useCartPresentationSlices } from './useCartPresentationSlices';
import { useCartProviderSupport } from './useCartProviderSupport';
import { useCartProviderValue } from './useCartProviderValue';

type CartProviderProps = {
  children: React.ReactNode;
};

const CartContext = createContext(null as any);

const CartProvider = ({ children }: CartProviderProps) => {
  const [state, dispatch] = useReducer(cartReducer, cartInitialState);

  const support = useCartProviderSupport({
    dispatch
  });

  const { summary, items } = useCartPresentationSlices({
    dispatch,
    actions: CART_ACTIONS,
    support
  });

  // Auto-fetch cart + items once on mount when a user is logged in.
  // This ensures the cart sidebar works on every page, even after refresh.
  // When feature.marketplace is off (GTM scope freeze — prod default)
  // the cart endpoints 403, so we skip the call entirely and save both
  // a round-trip and noise in the logs.
  const { isFlagEnabled } = useFeatureFlags();
  const marketplaceEnabled = isFlagEnabled('feature.marketplace');
  const autoFetchedRef = useRef(false);
  useEffect(() => {
    if (autoFetchedRef.current) return;
    if (!marketplaceEnabled) return;
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const userId = parsed?.id || parsed?.pk || parsed?.uuid;
      if (!userId) return;
      autoFetchedRef.current = true;
      summary
        .getCart(userId)
        .then((cart: any) => {
          const cartId = cart?.id || cart?.cartId;
          if (cartId) {
            items.getItemsCart(cartId);
          }
        })
        .catch(() => {});
    } catch {
      // no user in storage — nothing to fetch
    }
  }, [marketplaceEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const contextValue = useCartProviderValue({
    state,
    summary,
    items,
    support
  });

  return (
    <CartContext.Provider value={contextValue}>{children}</CartContext.Provider>
  );
};

export const useCartContext = () => {
  const context = useContext(CartContext);
  if (context === null) {
    throw new Error('useCartContext must be used within a CartProvider');
  }
  return context;
};

export { CartContext, CartProvider };
