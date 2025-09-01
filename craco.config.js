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
    }
  }
};
