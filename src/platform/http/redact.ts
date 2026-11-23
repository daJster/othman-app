/**
 * Keeps credentials out of anything the app records.
 *
 * A URL is the only place a secret reaches logs by accident: a stream or a
 * signed link carries its token in the query string. Redaction is by parameter
 * name, so a new endpoint using one of these names is covered without anyone
 * opting in. Over-redacting a harmless `key=` is the price of that guarantee.
 */
const SECRET_PARAM =
  /([?&;](?:token|access_token|id_token|api_key|apikey|key|password|authorization)=)[^&#;]*/gi;

export function redactUrl(url: string): string {
  return url.replace(SECRET_PARAM, '$1REDACTED');
}
