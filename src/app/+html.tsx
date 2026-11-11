import {
  ScrollViewStyleReset,
  useServerDocumentContext,
} from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * The web document shell.
 *
 * SDK 58 requires a custom `+html` to render the generated `headNodes` and
 * `bodyNodes`; without them the static export ships markup with no bundle and
 * the page never hydrates.
 *
 * `lang` defaults to Arabic for the first paint, matching the product's
 * Arabic-first commitment, and `src/i18n` corrects it once the stored or
 * detected language resolves. **`dir` is fixed at `ltr` and never changes.**
 * One physical layout serves both languages; Arabic is a *text* direction, set
 * per text run in `src/ui/text.tsx`. Letting `dir` flip here is what moved
 * margins, ordered children and absolute insets between languages.
 *
 * The manifest, theme colour and touch icon are declared here so the static
 * export ships the PWA metadata that the Expo config does not own.
 */
export default function Root({ children }: PropsWithChildren) {
  const { headNodes, bodyNodes, htmlAttributes, bodyAttributes } =
    useServerDocumentContext();

  return (
    <html lang="ar" dir="ltr" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <meta name="theme-color" content="#003b24" />
        {/*
         * The canvas before React paints. Without it the browser shows white
         * for the first frame of a dark-first app; the root view then paints the
         * resolved ground over it. Kept as a literal because this file is the
         * static shell and has no access to the theme tokens.
         */}
        <style>{`html, body { background-color: #040906; }`}</style>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <ScrollViewStyleReset />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
