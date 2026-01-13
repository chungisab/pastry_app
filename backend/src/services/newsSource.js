const axios = require('axios');

/**
 * News and editorial source aggregator
 * Searches food publications for pastry mentions
 *
 * LOOKBACK PERIOD: 2 years (Jan 2023 - present)
 *
 * FREE TIER LIMITATIONS FOR REAL IMPLEMENTATION:
 *
 * Google Places API:
 *   - $200 free credit/month (~40,000 requests)
 *   - Only returns 5 most recent reviews per place (no date filter)
 *
 * Yelp Fusion API:
 *   - 500 requests/day free
 *   - Only 3 reviews per business on free tier
 *   - No date filtering available
 *
 * News/Editorial (options for real implementation):
 *   - Web scraping with Cheerio/Puppeteer (free, but check ToS)
 *   - Google Custom Search API: 100 queries/day free
 *   - Archive.org for historical articles (free)
 *   - Direct RSS feeds from publications (free)
 *   - NewsAPI.org: 100 requests/day, but only 1 month lookback on free tier
 *
 * RECOMMENDED: Use web scraping for "best of" lists which are updated annually
 * and typically reference the same top bakeries year after year.
 */

// Publications to search
const PUBLICATIONS = [
  { name: 'Eater NY', domain: 'ny.eater.com' },
  { name: 'Time Out New York', domain: 'timeout.com/newyork' },
  { name: 'The Infatuation', domain: 'theinfatuation.com' },
  { name: 'New York Times Food', domain: 'nytimes.com/section/food' },
  { name: 'Grub Street', domain: 'grubstreet.com' },
  { name: 'New York Magazine', domain: 'nymag.com' },
  { name: 'Gothamist', domain: 'gothamist.com' },
  { name: 'Serious Eats', domain: 'seriouseats.com' }
];

// 2-year lookback window
const LOOKBACK_YEARS = 2;
const EARLIEST_DATE = '2023-01-01';

/**
 * Search for pastry mentions in news/editorial sources
 */
async function searchPastryMentions(pastryType = 'croissant', location = null) {
  console.log(`Searching news sources for: ${pastryType} (lookback: ${LOOKBACK_YEARS} years)`);
  return getMockEditorialData(pastryType, location);
}

/**
 * Editorial data covering 2 years (2023-2025)
 * Includes annual "best of" lists, reviews, and features
 */
function getMockEditorialData(pastryType, location) {
  const editorialMentions = {
    'croissant': [
      // 2025
      {
        shopName: 'Arcade Bakery',
        source: 'eater',
        publication: 'Eater NY',
        rating: 5,
        excerpt: 'The croissant at Arcade Bakery is a thing of beauty - shatteringly crisp exterior giving way to impossibly tender, buttery layers. It\'s the platonic ideal of what a plain croissant should be.',
        url: 'https://ny.eater.com/maps/best-croissants-nyc-2025',
        date: '2025-01-08',
        pastryType: 'croissant'
      },
      // 2024
      {
        shopName: 'Bien Cuit',
        source: 'nytimes',
        publication: 'New York Times',
        rating: 5,
        excerpt: 'Bien Cuit\'s butter croissant is exceptional - the result of a meticulous 3-day lamination process. Each bite delivers perfect flakiness and deep, caramelized flavor.',
        url: 'https://nytimes.com/2024/11/20/dining/best-bakeries-nyc',
        date: '2024-11-20',
        pastryType: 'croissant'
      },
      {
        shopName: 'Supermoon Bakehouse',
        source: 'grubstreet',
        publication: 'Grub Street',
        rating: 4.5,
        excerpt: 'While known for creative flavors, Supermoon\'s plain croissant deserves attention - a masterclass in technique with a honeycomb interior and shattering crust.',
        url: 'https://grubstreet.com/2024/10/nyc-croissant-guide',
        date: '2024-10-05',
        pastryType: 'croissant'
      },
      {
        shopName: 'Dominique Ansel Bakery',
        source: 'timeout',
        publication: 'Time Out New York',
        rating: 4.5,
        excerpt: 'Yes, the Cronut made him famous, but don\'t overlook the classic croissant - perfectly laminated with a golden, lacquered exterior.',
        url: 'https://timeout.com/newyork/restaurants/best-croissants-nyc',
        date: '2024-09-12',
        pastryType: 'croissant'
      },
      {
        shopName: 'Arcade Bakery',
        source: 'seriouseats',
        publication: 'Serious Eats',
        rating: 5,
        excerpt: 'After testing croissants across all five boroughs, Arcade Bakery\'s butter croissant stands out for its technical perfection and incredible flavor.',
        url: 'https://seriouseats.com/best-croissants-new-york-city',
        date: '2024-06-15',
        pastryType: 'croissant'
      },
      {
        shopName: 'Balthazar Bakery',
        source: 'infatuation',
        publication: 'The Infatuation',
        rating: 4,
        excerpt: 'The Balthazar croissant is a New York classic - reliable, buttery, and exactly what you want with your morning coffee.',
        url: 'https://theinfatuation.com/new-york/guides/best-bakeries-nyc',
        date: '2024-03-28',
        pastryType: 'croissant'
      },
      // 2023
      {
        shopName: 'Bien Cuit',
        source: 'eater',
        publication: 'Eater NY',
        rating: 5,
        excerpt: 'Year after year, Bien Cuit\'s croissant remains the gold standard in Brooklyn. The long fermentation creates unmatched depth of flavor.',
        url: 'https://ny.eater.com/maps/best-croissants-nyc-2023',
        date: '2023-12-10',
        pastryType: 'croissant'
      },
      {
        shopName: 'Arcade Bakery',
        source: 'nytimes',
        publication: 'New York Times',
        rating: 5,
        excerpt: 'Hidden in a Tribeca office lobby, Arcade Bakery produces what many consider the city\'s finest plain croissant.',
        url: 'https://nytimes.com/2023/09/15/dining/arcade-bakery-tribeca',
        date: '2023-09-15',
        pastryType: 'croissant'
      },
      {
        shopName: 'Dominique Ansel Bakery',
        source: 'gothamist',
        publication: 'Gothamist',
        rating: 4.5,
        excerpt: 'A decade after the Cronut craze, Dominique Ansel\'s classic butter croissant remains a must-try for any pastry lover.',
        url: 'https://gothamist.com/food/best-croissants-nyc-2023',
        date: '2023-05-20',
        pastryType: 'croissant'
      },
      {
        shopName: 'Almondine Bakery',
        source: 'timeout',
        publication: 'Time Out New York',
        rating: 4.5,
        excerpt: 'This DUMBO institution has been serving perfect French croissants for over 15 years. Consistency is their superpower.',
        url: 'https://timeout.com/newyork/restaurants/best-bakeries-brooklyn',
        date: '2023-03-08',
        pastryType: 'croissant'
      }
    ],
    'chocolate croissant': [
      // 2025
      {
        shopName: 'Bien Cuit',
        source: 'eater',
        publication: 'Eater NY',
        rating: 5,
        excerpt: 'The pain au chocolat at Bien Cuit uses high-quality Valrhona chocolate batons that stay perfectly molten. The contrast between crispy, caramelized pastry and rich chocolate is sublime.',
        url: 'https://ny.eater.com/maps/best-chocolate-croissants-nyc-2025',
        date: '2025-01-05',
        pastryType: 'chocolate croissant'
      },
      // 2024
      {
        shopName: 'Dominique Ansel Bakery',
        source: 'nytimes',
        publication: 'New York Times',
        rating: 5,
        excerpt: 'Ansel\'s chocolate croissant features two generous bars of dark chocolate wrapped in impeccably laminated dough - a textbook example of the form.',
        url: 'https://nytimes.com/2024/11/15/dining/chocolate-croissants-nyc',
        date: '2024-11-15',
        pastryType: 'chocolate croissant'
      },
      {
        shopName: 'Almondine Bakery',
        source: 'timeout',
        publication: 'Time Out New York',
        rating: 4.5,
        excerpt: 'This DUMBO gem serves a pain au chocolat that would make Parisians jealous - dark chocolate oozes from layers of buttery, flaky pastry.',
        url: 'https://timeout.com/newyork/restaurants/best-pain-au-chocolat-nyc',
        date: '2024-10-20',
        pastryType: 'chocolate croissant'
      },
      {
        shopName: 'Arcade Bakery',
        source: 'grubstreet',
        publication: 'Grub Street',
        rating: 4.5,
        excerpt: 'The chocolate croissant at Arcade is deeply satisfying - not too sweet, with quality chocolate and that signature shatteringly crisp exterior.',
        url: 'https://grubstreet.com/2024/09/best-pastries-nyc',
        date: '2024-09-30',
        pastryType: 'chocolate croissant'
      },
      {
        shopName: 'Bien Cuit',
        source: 'seriouseats',
        publication: 'Serious Eats',
        rating: 5,
        excerpt: 'For our money, the best pain au chocolat in NYC. The Valrhona chocolate and slow-fermented dough create something transcendent.',
        url: 'https://seriouseats.com/best-chocolate-croissants-nyc',
        date: '2024-07-22',
        pastryType: 'chocolate croissant'
      },
      {
        shopName: 'Maison Kayser',
        source: 'infatuation',
        publication: 'The Infatuation',
        rating: 4,
        excerpt: 'A dependable pain au chocolat you can find across the city. The chocolate-to-pastry ratio is spot on, and it\'s always fresh.',
        url: 'https://theinfatuation.com/new-york/reviews/maison-kayser',
        date: '2024-04-15',
        pastryType: 'chocolate croissant'
      },
      {
        shopName: 'Lafayette Grand Cafe',
        source: 'nymag',
        publication: 'New York Magazine',
        rating: 4,
        excerpt: 'Lafayette\'s chocolate croissant is everything you\'d expect from this French brasserie - elegant, properly made, and deeply chocolatey.',
        url: 'https://nymag.com/listings/restaurant/lafayette',
        date: '2024-02-22',
        pastryType: 'chocolate croissant'
      },
      // 2023
      {
        shopName: 'Dominique Ansel Bakery',
        source: 'eater',
        publication: 'Eater NY',
        rating: 5,
        excerpt: 'The pain au chocolat at Dominique Ansel remains a benchmark - rich Valrhona chocolate in perfectly laminated, buttery dough.',
        url: 'https://ny.eater.com/maps/best-chocolate-croissants-2023',
        date: '2023-11-18',
        pastryType: 'chocolate croissant'
      },
      {
        shopName: 'Bien Cuit',
        source: 'nytimes',
        publication: 'New York Times',
        rating: 5,
        excerpt: 'In a city full of excellent pastries, Bien Cuit\'s pain au chocolat stands apart for its commitment to quality ingredients and traditional technique.',
        url: 'https://nytimes.com/2023/08/10/dining/bien-cuit-brooklyn',
        date: '2023-08-10',
        pastryType: 'chocolate croissant'
      },
      {
        shopName: 'Arcade Bakery',
        source: 'gothamist',
        publication: 'Gothamist',
        rating: 4.5,
        excerpt: 'The chocolate croissant at this hidden Tribeca spot uses high-quality dark chocolate that balances perfectly with the buttery pastry.',
        url: 'https://gothamist.com/food/hidden-gem-bakeries-nyc',
        date: '2023-04-25',
        pastryType: 'chocolate croissant'
      },
      {
        shopName: 'Almondine Bakery',
        source: 'timeout',
        publication: 'Time Out New York',
        rating: 4.5,
        excerpt: 'Almondine has been quietly serving some of Brooklyn\'s best pain au chocolat for years. The chocolate is always perfectly melted inside.',
        url: 'https://timeout.com/newyork/restaurants/best-brooklyn-bakeries-2023',
        date: '2023-02-14',
        pastryType: 'chocolate croissant'
      }
    ],
    'almond croissant': [
      // 2025
      {
        shopName: 'Dominique Ansel Bakery',
        source: 'eater',
        publication: 'Eater NY',
        rating: 5,
        excerpt: 'The almond croissant here is a revelation - filled with homemade almond cream, topped with sliced almonds and powdered sugar. Rich but not cloying.',
        url: 'https://ny.eater.com/maps/best-almond-croissants-2025',
        date: '2025-01-02',
        pastryType: 'almond croissant'
      },
      // 2024
      {
        shopName: 'Arcade Bakery',
        source: 'timeout',
        publication: 'Time Out New York',
        rating: 5,
        excerpt: 'Arcade\'s almond croissant is generously filled with frangipane and crowned with toasted almonds. The texture contrast is exceptional.',
        url: 'https://timeout.com/newyork/restaurants/best-almond-croissants-nyc',
        date: '2024-10-10',
        pastryType: 'almond croissant'
      },
      {
        shopName: 'Balthazar Bakery',
        source: 'grubstreet',
        publication: 'Grub Street',
        rating: 4.5,
        excerpt: 'A classic almond croissant done right - the almond paste filling is house-made and you can taste the difference.',
        url: 'https://grubstreet.com/2024/09/almond-croissants-nyc',
        date: '2024-09-18',
        pastryType: 'almond croissant'
      },
      {
        shopName: 'Bien Cuit',
        source: 'nytimes',
        publication: 'New York Times',
        rating: 4.5,
        excerpt: 'Bien Cuit takes the twice-baked approach with their almond croissant, soaking day-old croissants in almond syrup before filling and rebaking.',
        url: 'https://nytimes.com/2024/08/05/dining/almond-croissants',
        date: '2024-08-05',
        pastryType: 'almond croissant'
      },
      {
        shopName: 'Supermoon Bakehouse',
        source: 'seriouseats',
        publication: 'Serious Eats',
        rating: 5,
        excerpt: 'The twice-baked almond croissant at Supermoon is indulgent perfection - house-made almond cream with a hint of amaretto.',
        url: 'https://seriouseats.com/almond-croissants-new-york',
        date: '2024-05-30',
        pastryType: 'almond croissant'
      },
      {
        shopName: 'Patisserie Chanson',
        source: 'infatuation',
        publication: 'The Infatuation',
        rating: 4,
        excerpt: 'An elegant almond croissant that looks as good as it tastes - perfectly golden, generously filled, and not overly sweet.',
        url: 'https://theinfatuation.com/nyc/patisserie-chanson',
        date: '2024-03-12',
        pastryType: 'almond croissant'
      },
      // 2023
      {
        shopName: 'Arcade Bakery',
        source: 'eater',
        publication: 'Eater NY',
        rating: 5,
        excerpt: 'The almond croissant at Arcade is worth seeking out - rich frangipane filling, crunchy toasted almonds, and that signature flaky pastry.',
        url: 'https://ny.eater.com/maps/best-almond-croissants-2023',
        date: '2023-11-05',
        pastryType: 'almond croissant'
      },
      {
        shopName: 'Dominique Ansel Bakery',
        source: 'nytimes',
        publication: 'New York Times',
        rating: 5,
        excerpt: 'Ansel\'s almond croissant showcases his mastery - perfectly balanced sweetness, generous almond cream, and impeccable technique.',
        url: 'https://nytimes.com/2023/07/20/dining/best-pastries-nyc',
        date: '2023-07-20',
        pastryType: 'almond croissant'
      },
      {
        shopName: 'Almondine Bakery',
        source: 'gothamist',
        publication: 'Gothamist',
        rating: 4.5,
        excerpt: 'Named for a reason - Almondine\'s almond croissant is a Brooklyn staple with fresh almond paste and perfect toasting.',
        url: 'https://gothamist.com/food/best-brooklyn-pastries-2023',
        date: '2023-04-15',
        pastryType: 'almond croissant'
      },
      {
        shopName: 'Balthazar Bakery',
        source: 'timeout',
        publication: 'Time Out New York',
        rating: 4.5,
        excerpt: 'The almond croissant at Balthazar is a SoHo institution - rich, satisfying, and consistently excellent year after year.',
        url: 'https://timeout.com/newyork/restaurants/best-soho-bakeries',
        date: '2023-02-28',
        pastryType: 'almond croissant'
      }
    ]
  };

  let results = editorialMentions[pastryType] || editorialMentions['croissant'];

  // Filter to only include articles within lookback period
  const cutoffDate = new Date(EARLIEST_DATE);
  results = results.filter(article => new Date(article.date) >= cutoffDate);

  // Sort by date (most recent first)
  results.sort((a, b) => new Date(b.date) - new Date(a.date));

  return results;
}

module.exports = {
  searchPastryMentions,
  PUBLICATIONS,
  LOOKBACK_YEARS,
  EARLIEST_DATE
};
