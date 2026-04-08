/**
 * SEO utilities for managing document head meta tags and structured data
 */

export const updateMetaTags = (config = {}) => {
  const {
    title = 'Caduceus - Personal Health Intelligence | Fitness Tracking & Wellness',
    description = 'Track workouts, monitor health metrics, and gain actionable insights for better fitness outcomes.',
    ogTitle = title,
    ogDescription = description,
    ogImage = 'https://caduceus-v1.web.app/favicon.svg',
    ogUrl = 'https://caduceus-v1.web.app',
    twitterCard = 'summary_large_image',
    canonical = 'https://caduceus-v1.web.app',
  } = config;

  // Update title
  document.title = title;

  // Update or create meta description
  let metaDescription = document.querySelector('meta[name="description"]');
  if (!metaDescription) {
    metaDescription = document.createElement('meta');
    metaDescription.setAttribute('name', 'description');
    document.head.appendChild(metaDescription);
  }
  metaDescription.setAttribute('content', description);

  // Update or create OG tags
  updateOrCreateMeta('og:title', ogTitle, 'property');
  updateOrCreateMeta('og:description', ogDescription, 'property');
  updateOrCreateMeta('og:image', ogImage, 'property');
  updateOrCreateMeta('og:url', ogUrl, 'property');

  // Update or create Twitter tags
  updateOrCreateMeta('twitter:title', ogTitle, 'property');
  updateOrCreateMeta('twitter:description', ogDescription, 'property');
  updateOrCreateMeta('twitter:card', twitterCard, 'property');

  // Update or create canonical
  let canonicalLink = document.querySelector('link[rel="canonical"]');
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute('href', canonical);
};

const updateOrCreateMeta = (property, content, attribute = 'name') => {
  let meta = document.querySelector(`meta[${attribute}="${property}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attribute, property);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
};

/**
 * Add JSON-LD structured data
 */
export const addStructuredData = (data) => {
  let script = document.querySelector('script[type="application/ld+json"]');
  if (!script) {
    script = document.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
};

/**
 * Organization schema
 */
export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Caduceus',
  url: 'https://caduceus-v1.web.app',
  logo: 'https://caduceus-v1.web.app/favicon.svg',
  description:
    'Personal health intelligence for training, trends, and better outcomes. Track workouts, monitor health metrics, and gain actionable insights.',
  sameAs: [],
};

/**
 * Web application schema
 */
export const webApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Caduceus',
  url: 'https://caduceus-v1.web.app',
  description:
    'Personal health intelligence platform for fitness tracking, health metrics monitoring, and wellness insights.',
  applicationCategory: 'HealthAndFitnessApplication',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
};
