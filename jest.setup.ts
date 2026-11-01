// Keep the console honest: a warning here usually means a real problem in the
// component under test (missing key, act() leak, unknown prop).
import i18n from '@/i18n/i18n';
import { setLanguageState } from '@/i18n/language-store';

const originalWarn = console.warn;

/**
 * AsyncStorage ships a native module that does not exist under Jest, and the
 * failure is a *module load* crash — a test for an unrelated component fails as
 * soon as anything in its import graph reaches `storageService`. Mocking it once
 * here is the library's own recommendation and keeps per-file mocks for
 * behaviour only.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

/**
 * SDK 58's vector icons call `expo-font.loadAsync` on mount. Under Jest the
 * font asset is not in the registry, which throws an unhandled rejection even
 * when the component under test is not about fonts. Font-gate behavior is
 * covered by `boot-provider.test.tsx` with an injected hook.
 */
jest.mock('expo-font', () => ({
  ...jest.requireActual('expo-font'),
  isLoaded: jest.fn(() => true),
  loadAsync: jest.fn(async () => undefined),
}));

/**
 * The product defaults to Arabic on first launch. The suite asserts English
 * copy, so it pins English once per test file instead of every test having to
 * change the language.
 */
beforeAll(async () => {
  await i18n.changeLanguage('en');
  setLanguageState({ language: 'en', ready: true });
});

/**
 * Warnings that are expected in Jest and carry no signal here.
 *
 * Uniwind's styling is a Metro transform: Metro emits the stylesheet and Jest
 * never runs it. Two consequences, both harmless in this environment:
 *
 *  - `className` / `*ClassName` arrive at host components as inert props, which
 *    React Native reports as unknown props.
 *  - A colour class (`accent-*`) cannot be resolved to a value, so Uniwind logs
 *    the accent error for every themed icon.
 *  - `useCSSVariable` cannot see the `@theme static` block either, so a
 *    JS-only token (`--motion-page-turn`) is reported as missing and the
 *    component falls back to its documented default.
 *
 * Styling is verified on device and in the exported web CSS instead. Filtering
 * these two keeps every other warning visible.
 */
const IGNORED = [
  'unknown prop `className`',
  'was provided to extract accentColor',
  "couldn't find your variable",
];

beforeAll(() => {
  console.warn = (...args: unknown[]) => {
    const [first] = args;
    if (
      typeof first === 'string' &&
      IGNORED.some((fragment) => first.includes(fragment))
    ) {
      return;
    }
    originalWarn(...(args as Parameters<typeof console.warn>));
  };
});

afterAll(() => {
  console.warn = originalWarn;
});
