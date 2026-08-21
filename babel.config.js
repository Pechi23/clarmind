module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Force-lower private class fields/methods so they never reach the Hermes
      // bytecode compiler, which rejects `this.#x` syntax from some bundled deps.
      ['@babel/plugin-transform-class-properties', { loose: true }],
      ['@babel/plugin-transform-private-methods', { loose: true }],
      ['@babel/plugin-transform-private-property-in-object', { loose: true }],
      // Reanimated's plugin must be listed last.
      'react-native-reanimated/plugin',
    ],
  };
};
