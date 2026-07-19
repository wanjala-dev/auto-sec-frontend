type SeedPresentationState = {
  child?: any;
  seed?: any;
  banners?: any[];
  donations?: any[];
  donationsLoading?: boolean;
  donationsError?: any;
  donationSubmitting?: boolean;
};

export const seedInitialState = {
  loading: false,
  categories: [],
  seed: {},
  donations: [],
  donationsLoading: false,
  donationsError: null,
  donationSubmitting: false
};

export const selectSeedPresentationState = (
  state: SeedPresentationState = {}
) => ({
  selectedChild: state.child,
  activeSeed: state.seed,
  activeBanners: state.banners ?? [],
  donationsState: {
    donations: state.donations,
    donationsLoading: state.donationsLoading,
    donationsError: state.donationsError,
    donationSubmitting: state.donationSubmitting
  }
});
