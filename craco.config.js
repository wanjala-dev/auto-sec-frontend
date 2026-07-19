module.exports = {
  eslint: false,
  style: {
    postcssOptions: {
      plugins: [require('tailwindcss'), require('autoprefixer')]
    }
  },
  jest: {
    configure: (jestConfig) => ({
      ...jestConfig,
      moduleNameMapper: {
        ...(jestConfig.moduleNameMapper || {}),
        '^canvas$': '<rootDir>/src/mocks/canvasMock.js'
      }
    })
  }
};
