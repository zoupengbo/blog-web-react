const path = require('path');

module.exports = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@pages': path.resolve(__dirname, 'src/page'),
      '@common': path.resolve(__dirname, 'src/common'),
      '@layout': path.resolve(__dirname, 'src/layout'),
      '@context': path.resolve(__dirname, 'src/context'),
      '@service': path.resolve(__dirname, 'src/common/services'),
      '@services': path.resolve(__dirname, 'src/common/services'),
      '@api': path.resolve(__dirname, 'src/common'),
    }
  },
  jest: {
    configure: {
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@components/(.*)$': '<rootDir>/src/components/$1',
        '^@components$': '<rootDir>/src/components',
        '^@pages/(.*)$': '<rootDir>/src/page/$1',
        '^@pages$': '<rootDir>/src/page',
        '^@common/(.*)$': '<rootDir>/src/common/$1',
        '^@common$': '<rootDir>/src/common',
        '^@layout/(.*)$': '<rootDir>/src/layout/$1',
        '^@layout$': '<rootDir>/src/layout',
        '^@context/(.*)$': '<rootDir>/src/context/$1',
        '^@context$': '<rootDir>/src/context',
        '^@service/(.*)$': '<rootDir>/src/common/services/$1',
        '^@service$': '<rootDir>/src/common/services',
        '^@services/(.*)$': '<rootDir>/src/common/services/$1',
        '^@services$': '<rootDir>/src/common/services',
        '^@api/(.*)$': '<rootDir>/src/common/$1',
        '^@api$': '<rootDir>/src/common',
      }
    }
  }
};
