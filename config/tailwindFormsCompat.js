const plugin = require('tailwindcss/plugin');
const forms = require('@tailwindcss/forms');

const renameColorAdjust = (value) => {
  if (Array.isArray(value)) {
    return value.map(renameColorAdjust);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key === 'color-adjust' ? 'print-color-adjust' : key,
      renameColorAdjust(nestedValue)
    ])
  );
};

module.exports = plugin.withOptions(
  (options = {}) => {
    const wrappedPlugin = forms(options);

    return function handler(api) {
      return wrappedPlugin.handler({
        ...api,
        addBase(base) {
          return api.addBase(renameColorAdjust(base));
        },
        addComponents(components, optionsArg) {
          return api.addComponents(renameColorAdjust(components), optionsArg);
        }
      });
    };
  },
  (options = {}) => {
    const wrappedPlugin = forms(options);
    return wrappedPlugin.config || {};
  }
);
