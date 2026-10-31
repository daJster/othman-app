export function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export interface WordToken {
  word: string;
  start: number;
  end: number;
}

export function tokenizeArabic(text: string): WordToken[] {
  const tokens: WordToken[] = [];
  const regex = /[\u0600-\u06FF]+|[^\s\u0600-\u06FF]+/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    tokens.push({
      word: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return tokens;
}

export function getInitials(name: string): string {
  if (!name) return '';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .substring(0, 2);
}
