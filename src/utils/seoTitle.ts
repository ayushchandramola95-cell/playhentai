/**
 * Utility for formatting SEO meta titles.
 * Google and Bing display up to 60-65 characters.
 * Bing Webmaster Tools explicitly flags titles > 65 characters as "Title too long" (High severity).
 * This helper guarantees titles stay strictly within 60 characters with the brand suffix.
 */
export function buildSeoTitle(
  mainText: string,
  suffix: string = '',
  brand: string = 'HentaiKage',
  maxLen: number = 60
): string {
  const brandSuffix = ` | ${brand}`;
  const suffixPart = suffix ? ` ${suffix}` : '';
  const fixedLen = brandSuffix.length + suffixPart.length;
  const availableForMain = maxLen - fixedLen;

  let cleanMain = mainText.trim();

  if (cleanMain.length > availableForMain) {
    cleanMain = cleanMain.slice(0, Math.max(10, availableForMain - 1)).trim() + '…';
  }

  return `${cleanMain}${suffixPart}${brandSuffix}`;
}

/**
 * Utility for formatting SEO meta descriptions.
 * Bing Webmaster Tools strictly requires meta descriptions to be between 25 and 160 characters.
 * Descriptions over 160 characters trigger the error:
 * "Meta Description too long or too short".
 * This helper guarantees the description stays strictly between 25 and 155 characters.
 */
export function buildSeoDescription(text: string, maxLen: number = 155): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) {
    return clean;
  }
  const truncated = clean.slice(0, maxLen - 3);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > 100) {
    return `${truncated.slice(0, lastSpace).trim()}...`;
  }
  return `${truncated.trim()}...`;
}

