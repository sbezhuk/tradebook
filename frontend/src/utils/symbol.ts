export const PAIR_REGEX = /^[A-Z0-9_!.-]{1,15}\/[A-Z0-9_!.-]{2,10}(\s*\([A-Z0-9_\- ]+\))?$/i;

const SUFFIX_REGEX = /^(.*?)\s*(\([A-Za-z0-9_\- ]+\))\s*$/;

export interface SymbolParts {
  base: string;
  quote: string | null;
  suffix: string | null;
}

/**
 * Extracts base asset, quote currency (if any), and suffix (e.g. '(IO)').
 *
 * Examples:
 *  'BTC/USDT' -> { base: 'BTC', quote: 'USDT', suffix: null }
 *  'NVDA/USDT (IO)' -> { base: 'NVDA', quote: 'USDT', suffix: '(IO)' }
 *  'NVDA (IO)' -> { base: 'NVDA', quote: null, suffix: '(IO)' }
 *  'BTC' -> { base: 'BTC', quote: null, suffix: null }
 */
export function parseSymbolParts(raw: string): SymbolParts {
  const s = (raw || '').trim();
  if (!s) {
    return { base: '', quote: null, suffix: null };
  }

  let mainPart = s;
  let suffix: string | null = null;
  const match = s.match(SUFFIX_REGEX);
  if (match) {
    mainPart = match[1].trim();
    suffix = match[2].trim().toUpperCase();
  }

  if (mainPart.includes('/')) {
    const parts = mainPart.split('/');
    const base = parts[0].trim().toUpperCase();
    const quote = parts.slice(1).join('/').trim().toUpperCase();
    return { base, quote: quote || null, suffix };
  }

  if (mainPart.includes('-') || mainPart.includes('_')) {
    const parts = mainPart.split(/[-_]/);
    const base = parts[0].trim().toUpperCase();
    const quote = parts.slice(1).join('-').trim().toUpperCase();
    return { base, quote: quote || null, suffix };
  }

  const up = mainPart.toUpperCase();
  if (up.endsWith('USDT') && up.length > 4) {
    return { base: up.slice(0, -4).trim().toUpperCase(), quote: 'USDT', suffix };
  }
  if (up.endsWith('USDC') && up.length > 4) {
    return { base: up.slice(0, -4).trim().toUpperCase(), quote: 'USDC', suffix };
  }

  return { base: mainPart.trim().toUpperCase(), quote: null, suffix };
}

/**
 * Ensures the symbol is always formatted as a trading pair:
 * e.g. BTC -> BTC/USDT, NVDA (IO) -> NVDA/USDT (IO).
 * Existing pairs like BTC/USDC, EUR/USD are preserved.
 */
export function normalizeSymbolPair(
  raw: string,
  defaultQuote: 'USDT' | 'USDC' = 'USDT'
): string {
  const s = (raw || '').trim();
  if (!s) return '';

  const { base, quote, suffix } = parseSymbolParts(s);
  const targetQuote = (quote || defaultQuote).toUpperCase();
  const suffixStr = suffix ? ` ${suffix}` : '';

  if (!base) return '';
  return `${base}/${targetQuote}${suffixStr}`;
}

/**
 * Switches the quote currency of a pair to USDT or USDC, preserving base & suffix.
 *
 * Examples:
 *  changeSymbolQuote('BTC/USDT', 'USDC') -> 'BTC/USDC'
 *  changeSymbolQuote('NVDA/USDT (IO)', 'USDC') -> 'NVDA/USDC (IO)'
 *  changeSymbolQuote('BTC', 'USDC') -> 'BTC/USDC'
 */
export function changeSymbolQuote(
  raw: string,
  newQuote: 'USDT' | 'USDC'
): string {
  const s = (raw || '').trim();
  if (!s) return '';

  const { base, suffix } = parseSymbolParts(s);
  if (!base) return '';

  const suffixStr = suffix ? ` ${suffix}` : '';
  return `${base}/${newQuote.toUpperCase()}${suffixStr}`;
}

/**
 * Validates that the symbol represents a valid trading pair format:
 * BASE/QUOTE or BASE/QUOTE (SUFFIX).
 */
export function isValidPair(raw: string): boolean {
  const s = (raw || '').trim();
  if (!s) return false;
  return PAIR_REGEX.test(s);
}

/**
 * Detects whether the symbol currently quotes against USDT or USDC.
 */
export function detectQuoteCurrency(raw: string): 'USDT' | 'USDC' | null {
  const { quote } = parseSymbolParts(raw);
  if (quote === 'USDT' || quote === 'USDC') {
    return quote;
  }
  return null;
}
