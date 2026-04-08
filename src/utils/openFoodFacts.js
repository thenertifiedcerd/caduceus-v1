const OPEN_FOOD_FACTS_SEARCH_URL = 'https://world.openfoodfacts.org/api/v2/search';

const OPEN_FOOD_FACTS_PROXIES = [
  null,
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
];

const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const MIN_REQUEST_INTERVAL_MS = 300;

const searchCache = new Map();
let lastRequestTimestamp = 0;

const buildSearchUrl = (params) => {
  const query = new URLSearchParams(params).toString();
  return `${OPEN_FOOD_FACTS_SEARCH_URL}?${query}`;
};

const buildCacheKey = (params) => {
  const sortedEntries = Object.entries(params).sort(([a], [b]) => a.localeCompare(b));
  return new URLSearchParams(sortedEntries).toString();
};

const delay = (ms, signal) => new Promise((resolve, reject) => {
  if (!ms || ms <= 0) {
    resolve();
    return;
  }

  const timeoutId = setTimeout(() => {
    if (signal) {
      signal.removeEventListener('abort', onAbort);
    }
    resolve();
  }, ms);

  const onAbort = () => {
    clearTimeout(timeoutId);
    reject(new DOMException('Aborted', 'AbortError'));
  };

  if (signal) {
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener('abort', onAbort, { once: true });
  }
});

export const fetchOpenFoodFactsSearch = async (params, signal) => {
  const cacheKey = buildCacheKey(params);
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL_MS) {
    return cached.data;
  }

  const now = Date.now();
  const waitMs = Math.max(0, MIN_REQUEST_INTERVAL_MS - (now - lastRequestTimestamp));
  await delay(waitMs, signal);

  const targetUrl = buildSearchUrl(params);
  let lastError = null;

  for (const proxyPrefix of OPEN_FOOD_FACTS_PROXIES) {
    const requestUrl = proxyPrefix
      ? `${proxyPrefix}${encodeURIComponent(targetUrl)}`
      : targetUrl;

    try {
      const response = await fetch(requestUrl, {
        signal,
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`OpenFoodFacts search failed: ${response.status}`);
      }

      const data = await response.json();
      searchCache.set(cacheKey, {
        timestamp: Date.now(),
        data,
      });
      return data;
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw error;
      }

      lastError = error;
    } finally {
      lastRequestTimestamp = Date.now();
    }
  }

  throw lastError || new Error('OpenFoodFacts search failed.');
};
