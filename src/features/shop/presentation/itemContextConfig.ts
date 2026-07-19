import {
  ADD_ITEM,
  DELETE_ITEM,
  EMPTY_ITEMS,
  GET_ITEMS,
  GET_ITEMS_BY_ID,
  GET_ITEM_BY_CATEGORY,
  GET_PRODUCT_IMAGES,
  SEARCH_ITEMS,
  UPDATE_ITEM
} from '../../../types/itemTypes';

export const itemInitialState = {
  items: [],
  productImgs: [],
  file: [],
  loading: false,
  error: false,
  message: ''
};

export const ITEM_ACTIONS = {
  GET_ITEMS,
  SEARCH_ITEMS,
  GET_ITEM_BY_CATEGORY,
  GET_ITEMS_BY_ID,
  GET_PRODUCT_IMAGES,
  ADD_ITEM,
  UPDATE_ITEM,
  DELETE_ITEM,
  EMPTY_ITEMS
};
