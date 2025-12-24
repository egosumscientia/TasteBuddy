module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module-resolver', {
        root: ['./app'],
        alias: {
          '@components': './app/components',
          '@screens': './app/screens',
          '@hooks': './app/hooks',
          '@utils': './app/utils',
          '@styles': './app/styles',
          '@data': './app/data',
        },
      }],
    ],
  };
};
