import { useMemo } from 'react';

export const useItemProviderValue = ({ state, catalog, mutation, support }) =>
  useMemo(
    () => ({
      ...state,
      getItems: catalog.getItems,
      searchItems: catalog.searchItems,
      getItemById: catalog.getItemById,
      getProductImages: catalog.getProductImages,
      getItemByCategory: catalog.getItemByCategory,
      addItem: mutation.addItem,
      deleteItem: mutation.deleteItem,
      updateItem: mutation.updateItem,
      emptyItem: mutation.emptyItem,
      setLoading: support.setLoading
    }),
    [state, catalog, mutation, support]
  );
