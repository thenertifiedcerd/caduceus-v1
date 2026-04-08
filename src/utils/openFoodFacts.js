const OPEN_FOOD_FACTS_SEARCH_URL = 'https://world.openfoodfacts.org/api/v2/search';

const OPEN_FOOD_FACTS_PROXIES = [
  null,
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
];

const buildSearchUrl = (params) => {
  const query = new URLSearchParams(params).toString();
  return `${OPEN_FOOD_FACTS_SEARCH_URL}?${query}`;
};

export const fetchOpenFoodFactsSearch = async (params, signal) => {
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

      return await response.json();
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw error;
      }

      lastError = error;
    }
  }

  throw lastError || new Error('OpenFoodFacts search failed.');
};
