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
 * `lang`/`dir` default to Arabic and RTL for the first paint, matching the
 * product's Arabic-first commitment; `src/i18n` overwrites both as soon as the
 * stored or detected language resolves. The manifest, theme colour and touch
 * icon are declared here so the static export ships the PWA metadata that the
 * Expo config does not own.
 */
export default function Root({ children }: PropsWithChildren) {
  const { headNodes, bodyNodes, htmlAttributes, bodyAttributes } =
    useServerDocumentContext();

  return (
    <html lang="ar" dir="rtl" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <meta name="theme-color" content="#003b24" />
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
