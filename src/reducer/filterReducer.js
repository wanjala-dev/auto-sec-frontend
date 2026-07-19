import {
  FILTER_PRICE,
  FILTER_RATING,
  FILTER_CONDITION,
  FILTER_PRICE_AND_RATING,
  FILTER_PRICE_AND_CONDITION,
  FILTER_RATING_AND_CONDITION,
  FILTER_ALL,
  RESET_FILTER
} from '../types/filterTypes';

// Reducer function
const filterReducer = (state, action) => {
  // Destructure action for clarity
  const { type, payload } = action;

  // Use block scope for each case
  switch (type) {
    case FILTER_PRICE:
    case FILTER_RATING:
    case FILTER_CONDITION:
    case FILTER_PRICE_AND_RATING:
    case FILTER_PRICE_AND_CONDITION:
    case FILTER_RATING_AND_CONDITION:
    case FILTER_ALL:
    case RESET_FILTER: {
      // Multiple cases can share the same handler
      // Provide default values for safety
      return {
        ...state,
        products: payload ?? state.products,
        loading: false
      };
    }

    // Default case returns state unchanged
    default:
      return state;
  }
};

export default filterReducer;
