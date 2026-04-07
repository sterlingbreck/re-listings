import * as cheerio from 'cheerio';
import { chromium as chromiumExtra } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

chromiumExtra.use(StealthPlugin());

export interface ScrapeResult {
  thumbnail: string | null;
  price: number | null;
  address: string | null;
  city: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  partial: boolean;
  error?: string;
}

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const EMPTY_RESULT: ScrapeResult = {
  thumbnail: null,
  price: null,
  address: null,
  city: null,
  bedrooms: null,
  bathrooms: null,
  partial: true,
};

async function fetchHtmlPlain(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

async function fetchHtmlWithBrowser(url: string): Promise<string> {
  const browser = await chromiumExtra.launch({ headless: true });
  try {
    const context = await browser.newContext({
      userAgent: USER_AGENT,
      viewport: { width: 1280, height: 800 },
      locale: 'en-US',
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    return await page.content();
  } finally {
    await browser.close();
  }
}

/** A scrape result is "useful enough" if extraction got at least the thumbnail
 *  plus one of price/address/bedrooms. Anything less means we should fall back. */
function isUseful(r: ScrapeResult): boolean {
  return Boolean(
    r.thumbnail && (r.price != null || r.address || r.bedrooms != null)
  );
}

export async function scrapeListing(url: string): Promise<ScrapeResult> {
  // Stage 1: try plain fetch (fast, ~200ms; works for homes.com etc.)
  let plainErr: string | null = null;
  try {
    const html = await fetchHtmlPlain(url);
    const result = extractFieldsFromHtml(html);
    if (isUseful(result)) return result;
    plainErr = 'plain fetch returned a page with no useful data (likely a bot wall)';
  } catch (err) {
    plainErr = (err as Error).message;
  }

  // Stage 2: fall back to stealth Playwright (slower, ~3-5s; bypasses Akamai)
  let browserErr: string | null = null;
  try {
    const html = await fetchHtmlWithBrowser(url);
    const result = extractFieldsFromHtml(html);
    if (isUseful(result)) return result;
    browserErr = 'browser fetch returned a page with no useful data (likely a CAPTCHA wall)';
  } catch (err) {
    browserErr = (err as Error).message;
  }

  return {
    ...EMPTY_RESULT,
    error: `Plain fetch: ${plainErr}. Browser fallback: ${browserErr}`,
  };
}

function extractFieldsFromHtml(html: string): ScrapeResult {
  const $ = cheerio.load(html);
  const result: ScrapeResult = { ...EMPTY_RESULT };

  // Strategy 1: JSON-LD structured data
  $('script[type="application/ld+json"]').each((_, el) => {
    const txt = $(el).contents().text();
    if (!txt) return;
    let data: unknown;
    try {
      data = JSON.parse(txt);
    } catch {
      return;
    }
    const items = Array.isArray(data) ? data : [data];
    for (const item of items) {
      extractFromJsonLd(item, result);
    }
  });

  // Strategy 2: Open Graph meta fallback
  if (!result.thumbnail) {
    const og = $('meta[property="og:image"]').attr('content');
    if (og) result.thumbnail = og;
  }
  if (!result.address) {
    const ogTitle = $('meta[property="og:title"]').attr('content');
    if (ogTitle) {
      // og:title on apartments.com is often "31226 Via San Vicente, San Juan Capistrano, CA 92675"
      const parts = ogTitle.split(',').map((s) => s.trim());
      if (parts.length >= 2) {
        result.address ??= parts[0];
        result.city ??= parts[1];
      }
    }
  }

  // Strategy 3: apartments.com-specific selectors
  if (!result.price) {
    const priceText = $('.priceBedRangeInfo .rentInfoDetail').first().text() ||
      $('.priceBedRangeInfo p').first().text() ||
      $('[data-testid="price"]').first().text();
    const parsed = parsePrice(priceText);
    if (parsed != null) result.price = parsed;
  }
  // apartments.com structures bedrooms/bathrooms as <li> blocks with paired
  // .rentInfoLabel ("Bedrooms"/"Bathrooms") + .rentInfoDetail ("3", "2.5", etc.)
  $('.priceBedRangeInfo li').each((_, li) => {
    const label = $(li).find('.rentInfoLabel').first().text().trim().toLowerCase();
    const detail = $(li).find('.rentInfoDetail').first().text().trim();
    if (!label || !detail) return;
    const m = detail.match(/(\d+(?:\.\d+)?)/);
    if (!m) return;
    const value = parseFloat(m[1]);
    if (label.startsWith('bedroom') && result.bedrooms == null) result.bedrooms = value;
    else if (label.startsWith('bathroom') && result.bathrooms == null) result.bathrooms = value;
  });
  // Fallback: free-text patterns for sites that use "3 bd / 2 ba" style
  if (result.bedrooms == null) {
    const bedText = $('.priceBedRangeInfo')
      .text()
      .match(/(\d+(?:\.\d+)?)\s*(bd|bed|beds|bedroom)/i);
    if (bedText) result.bedrooms = parseFloat(bedText[1]);
  }
  if (result.bathrooms == null) {
    const bathText = $('.priceBedRangeInfo')
      .text()
      .match(/(\d+(?:\.\d+)?)\s*(ba|bath|baths|bathroom)/i);
    if (bathText) result.bathrooms = parseFloat(bathText[1]);
  }
  if (!result.address || !result.city) {
    const street = $('.propertyAddress h2 span').first().text().trim() ||
      $('.propertyAddress span').first().text().trim();
    if (street && !result.address) result.address = street;
    const cityText = $('.propertyAddressContainer').text();
    const cityMatch = cityText.match(/,\s*([A-Za-z .'-]+),\s*[A-Z]{2}/);
    if (cityMatch && !result.city) result.city = cityMatch[1].trim();
  }

  result.partial = !(
    result.thumbnail &&
    result.price != null &&
    result.address &&
    result.city &&
    result.bedrooms != null &&
    result.bathrooms != null
  );

  return result;
}

function extractFromJsonLd(node: unknown, out: ScrapeResult): void {
  if (!node || typeof node !== 'object') return;
  const obj = node as Record<string, unknown>;

  // Recurse into @graph if present
  if (Array.isArray(obj['@graph'])) {
    for (const sub of obj['@graph'] as unknown[]) extractFromJsonLd(sub, out);
  }

  // Image
  if (!out.thumbnail) {
    const img = obj.image;
    if (typeof img === 'string') out.thumbnail = img;
    else if (Array.isArray(img) && img.length > 0) {
      const first = img[0];
      out.thumbnail = typeof first === 'string' ? first : (first as { url?: string })?.url ?? null;
    } else if (img && typeof img === 'object') {
      out.thumbnail = (img as { url?: string }).url ?? null;
    }
  }

  // Address
  const address = obj.address;
  if (address && typeof address === 'object') {
    const a = address as Record<string, unknown>;
    if (!out.address && typeof a.streetAddress === 'string') out.address = a.streetAddress;
    if (!out.city && typeof a.addressLocality === 'string') out.city = a.addressLocality;
  } else if (Array.isArray(address) && address.length > 0) {
    extractFromJsonLd({ address: address[0] }, out);
  }

  // Bedrooms
  if (out.bedrooms == null) {
    const beds = obj.numberOfBedrooms ?? obj.numberOfRooms;
    if (typeof beds === 'number') out.bedrooms = beds;
    else if (typeof beds === 'string') {
      const n = parseFloat(beds);
      if (!isNaN(n)) out.bedrooms = n;
    }
  }

  // Bathrooms
  if (out.bathrooms == null) {
    const baths =
      obj.numberOfBathroomsTotal ?? obj.numberOfBathrooms ?? obj.numberOfFullBathrooms;
    if (typeof baths === 'number') out.bathrooms = baths;
    else if (typeof baths === 'string') {
      const n = parseFloat(baths);
      if (!isNaN(n)) out.bathrooms = n;
    }
  }

  // Price
  if (out.price == null) {
    const offers = obj.offers;
    const offerList = Array.isArray(offers) ? offers : offers ? [offers] : [];
    for (const offer of offerList) {
      if (offer && typeof offer === 'object') {
        const o = offer as Record<string, unknown>;
        const price = o.price ?? o.lowPrice;
        if (typeof price === 'number') {
          out.price = Math.round(price);
          break;
        }
        if (typeof price === 'string') {
          const n = parsePrice(price);
          if (n != null) {
            out.price = n;
            break;
          }
        }
      }
    }
  }
}

function parsePrice(text: string): number | null {
  if (!text) return null;
  const match = text.replace(/,/g, '').match(/\$?\s*(\d{3,7})/);
  if (!match) return null;
  return parseInt(match[1], 10);
}
