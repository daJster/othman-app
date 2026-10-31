const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

// `withUniwindConfig` MUST stay the outermost wrapper: it rewrites the CSS
// pipeline and any wrapper applied after it would bypass the Uniwind
// transformer.
module.exports = withUniwindConfig(config, {
  // Relative path, always. The directory holding the entry file is the scan
  // root, which is why the CSS lives in `src/` — `othman-web/` must never be
  // scanned for class names.
  cssEntryFile: './src/global.css',
  dtsFile: './src/uniwind-types.d.ts',
  polyfills: { rem: 16 },
});
