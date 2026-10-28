/**
 * Manual mock for `react-native-reanimated`.
 *
 * It is a **Node-module mock** (this file sits next to `node_modules`), so Jest
 * applies it to every test without a `jest.mock()` call. That is deliberate:
 * the real library cannot even be *imported* under this Jest setup.
 * `react-native-worklets` reaches for its native module at load time
 * (`loadUnpackers` on an undefined proxy) and the failure is a module-load
 * crash, not a missing animation.
 *
 * The library's own `react-native-reanimated/mock` does not help: it imports
 * the real entry point to re-export the pieces it does not fake, which is the
 * same crash one level deeper.
 *
 * What is faked, and why it is enough:
 *  - `Animated.*` components are the plain React Native components. Layout and
 *    entering/exiting props are inert here, which is fine because tests assert
 *    what a screen shows, never how it moves (styling and motion are verified
 *    on device).
 *  - Animation builders (`FadeIn`, `LinearTransition`, …) are chainable
 *    no-ops, so `.duration(180)` returns the same mock.
 *  - Hooks return stable initial values; `useAnimatedStyle` runs its factory
 *    immediately so a style computed from a shared value still reaches layout.
 *
 * Anything added to the app later that needs *animation behaviour* in a test
 * has to be extended here explicitly rather than silently pretending to work.
 */
const ReactNative = require('react-native');

/**
 * A builder that accepts any chain of modifiers and returns itself, so
 * `FadeIn.duration(160)` and `LinearTransition.springify()` both work.
 */
const builder = (() => {
  const target = function noop() {};
  const proxy = new Proxy(target, {
    get: (object, property) => {
      if (property === 'then') return undefined;
      if (property === Symbol.toPrimitive) return () => 0;
      if (property === 'toString') return () => '[animation]';
      if (property in object) return object[property];
      return () => proxy;
    },
  });

  return proxy;
})();

const Animated = {
  View: ReactNative.View,
  Text: ReactNative.Text,
  ScrollView: ReactNative.ScrollView,
  Image: ReactNative.Image,
  FlatList: ReactNative.FlatList,
  createAnimatedComponent: (component) => component,
};

const animations = {
  FadeIn: builder,
  FadeInDown: builder,
  FadeInUp: builder,
  FadeInLeft: builder,
  FadeInRight: builder,
  FadeOut: builder,
  FadeOutDown: builder,
  FadeOutUp: builder,
  FadeOutLeft: builder,
  FadeOutRight: builder,
  Layout: builder,
  LinearTransition: builder,
  CurvedTransition: builder,
  FadingTransition: builder,
  SequencedTransition: builder,
  SlideInDown: builder,
  SlideInUp: builder,
  SlideOutDown: builder,
  SlideOutUp: builder,
  ZoomIn: builder,
  ZoomOut: builder,
};

module.exports = {
  __esModule: true,
  default: Animated,
  ...Animated,
  ...animations,

  // Hooks.
  useSharedValue: (initial) => ({ value: initial }),
  useAnimatedStyle: (factory) => factory(),
  useAnimatedProps: (factory) => factory(),
  useDerivedValue: (factory) => ({ value: factory() }),
  useAnimatedRef: () => ({ current: null }),
  useAnimatedReaction: () => undefined,
  useAnimatedScrollHandler: () => () => undefined,
  useReducedMotion: () => false,

  // Timing and sequencing.
  withTiming: (value) => value,
  withSpring: (value) => value,
  withDelay: (_delay, value) => value,
  withSequence: (...values) => values[values.length - 1],
  withRepeat: (value) => value,
  cancelAnimation: () => undefined,

  // Worklet plumbing.
  runOnJS: (fn) => fn,
  runOnUI: (fn) => fn,
  scheduleOnRN: (fn, ...args) => fn(...args),
  scheduleOnUI: (fn, ...args) => fn(...args),

  // Interpolation.
  interpolate: (value) => value,
  Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
  Easing: {
    linear: (value) => value,
    ease: (value) => value,
    inOut: (value) => value,
    bezier: () => (value) => value,
  },
  ReduceMotion: { System: 'system', Always: 'always', Never: 'never' },

  // Version surface some libraries probe.
  isSharedValue: () => false,
  makeMutable: (initial) => ({ value: initial }),
};
