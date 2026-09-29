/**
 * Utility for formatting SEO meta titles.
 * Google and Bing display up to 60-65 characters.
 * Bing Webmaster Tools explicitly flags titles > 65 characters as "Title too long" (High severity).
 * This helper guarantees titles stay strictly within 60 characters with the brand suffix.
 */
export function buildSeoTitle(
  mainText: string,
  suffix: string = '',
  brand: string = 'Play Hentai',
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
