const googlePlaces = require('./googlePlaces');
const yelp = require('./yelp');
const newsSource = require('./newsSource');

// Pastry type definitions with keywords for matching in reviews
const PASTRY_KEYWORDS = {
  'croissant': {
    keywords: ['croissant', 'plain croissant', 'butter croissant', 'regular croissant'],
    exclude: ['chocolate', 'almond', 'ham', 'cheese', 'everything']
  },
  'chocolate croissant': {
    keywords: ['chocolate croissant', 'pain au chocolat', 'chocolat', 'chocolate pastry'],
    exclude: []
  },
  'almond croissant': {
    keywords: ['almond croissant', 'almond pastry', 'croissant aux amandes'],
    exclude: []
  }
};

/**
 * Normalize a shop name for matching across sources
 */
function normalizeShopName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate distance between two coordinates in km
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if two shops are likely the same based on name and location
 */
function isSameShop(shop1, shop2) {
  const name1 = normalizeShopName(shop1.name);
  const name2 = normalizeShopName(shop2.name);

  const nameSimilar =
    name1.includes(name2) ||
    name2.includes(name1) ||
    name1 === name2;

  if (!nameSimilar) return false;

  if (shop1.location && shop2.location &&
    shop1.location.lat && shop2.location.lat) {
    const distance = calculateDistance(
      shop1.location.lat,
      shop1.location.lng,
      shop2.location.lat,
      shop2.location.lng
    );
    return distance < 0.2;
  }

  return nameSimilar;
}

/**
 * Check if a review mentions the specific pastry type
 */
function reviewMentionsPastry(reviewText, pastryType) {
  if (!reviewText) return false;

  const textLower = reviewText.toLowerCase();
  const pastryConfig = PASTRY_KEYWORDS[pastryType] || PASTRY_KEYWORDS['croissant'];

  // Check if any keyword is mentioned
  const hasKeyword = pastryConfig.keywords.some(keyword =>
    textLower.includes(keyword.toLowerCase())
  );

  if (!hasKeyword) return false;

  // For plain croissant, make sure it's not another type
  if (pastryType === 'croissant' && pastryConfig.exclude.length > 0) {
    const hasExcluded = pastryConfig.exclude.some(exclude =>
      textLower.includes(exclude.toLowerCase())
    );
    // If review mentions chocolate/almond etc., it might still be relevant
    // if it also mentions plain croissant specifically
    if (hasExcluded && !textLower.includes('plain') && !textLower.includes('butter croissant')) {
      return false;
    }
  }

  return true;
}

/**
 * Extract sentiment/rating hint from review text
 * Returns a modifier between -1 and 1
 */
function analyzeSentiment(reviewText) {
  if (!reviewText) return 0;

  const textLower = reviewText.toLowerCase();

  const positiveWords = [
    'amazing', 'incredible', 'perfect', 'best', 'excellent', 'fantastic',
    'delicious', 'flaky', 'buttery', 'crispy', 'heavenly', 'divine',
    'outstanding', 'wonderful', 'love', 'loved', 'favorite', 'favourite',
    'must try', 'must-try', 'highly recommend', 'phenomenal', 'authentic',
    'fresh', 'warm', 'perfectly', 'exceptional'
  ];

  const negativeWords = [
    'terrible', 'awful', 'bad', 'worst', 'disappointing', 'disappointed',
    'stale', 'dry', 'bland', 'overpriced', 'mediocre', 'skip', 'avoid',
    'not good', 'underwhelming', 'soggy', 'burnt', 'cold', 'hard',
    'tasteless', 'not worth', 'overrated'
  ];

  let score = 0;
  positiveWords.forEach(word => {
    if (textLower.includes(word)) score += 0.15;
  });
  negativeWords.forEach(word => {
    if (textLower.includes(word)) score -= 0.2;
  });

  return Math.max(-1, Math.min(1, score));
}

/**
 * Calculate pastry-specific score from reviews
 */
function calculatePastrySpecificScore(sources, pastryType) {
  let totalWeightedScore = 0;
  let totalWeight = 0;
  let relevantReviewCount = 0;

  for (const source of sources) {
    const reviews = source.reviews || [];

    // Find reviews that mention this specific pastry
    const relevantReviews = reviews.filter(r =>
      reviewMentionsPastry(r.text, pastryType)
    );

    if (relevantReviews.length > 0) {
      // Calculate score based on relevant reviews only
      for (const review of relevantReviews) {
        const baseRating = review.rating || source.rating;
        const sentimentMod = analyzeSentiment(review.text);
        const adjustedRating = Math.max(1, Math.min(5, baseRating + sentimentMod));

        totalWeightedScore += adjustedRating;
        totalWeight += 1;
        relevantReviewCount++;
      }
    } else {
      // No specific reviews - use general rating with lower weight
      // This allows shops to still appear but ranked lower than those with specific mentions
      const generalWeight = 0.3;
      totalWeightedScore += source.rating * generalWeight;
      totalWeight += generalWeight;
    }
  }

  // Add bonus for having more relevant reviews (shows consistency)
  const relevanceBonus = Math.min(0.5, relevantReviewCount * 0.05);

  const baseScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  return {
    score: Math.round((baseScore + relevanceBonus) * 100) / 100,
    relevantReviewCount
  };
}

/**
 * Filter reviews to only show ones relevant to the pastry type
 */
function filterRelevantReviews(sources, pastryType) {
  return sources.map(source => ({
    ...source,
    reviews: (source.reviews || []).filter(review =>
      reviewMentionsPastry(review.text, pastryType)
    ),
    allReviews: source.reviews // Keep original for reference
  }));
}

/**
 * Aggregate data from all sources for a pastry type
 */
async function aggregatePastryShops(pastryType = 'croissant', location = null) {
  // Normalize chocolate croissant / pain au chocolat
  const normalizedPastryType = pastryType.toLowerCase().includes('pain au chocolat')
    ? 'chocolate croissant'
    : pastryType;

  console.log(`Aggregating data for: ${normalizedPastryType}, location: ${location || 'all NYC'}`);

  // Fetch data from all sources in parallel
  const [googleResults, yelpResults, newsResults] = await Promise.all([
    googlePlaces.searchPastryShops(normalizedPastryType, location),
    yelp.searchPastryShops(normalizedPastryType, location),
    newsSource.searchPastryMentions(normalizedPastryType, location)
  ]);

  console.log(`Google: ${googleResults.length}, Yelp: ${yelpResults.length}, News: ${newsResults.length}`);

  // Map to track aggregated shops
  const aggregatedShops = new Map();

  // Process Google results
  for (const shop of googleResults) {
    const key = normalizeShopName(shop.name);
    aggregatedShops.set(key, {
      name: shop.name,
      address: shop.address,
      location: shop.location,
      neighborhood: extractNeighborhood(shop.address),
      borough: extractBorough(shop.address),
      sources: [{
        source: 'google',
        rating: shop.rating,
        reviewCount: shop.reviewCount,
        reviews: shop.reviews,
        url: shop.url,
        photos: shop.photos
      }],
      photos: shop.photos || [],
      website: shop.website
    });
  }

  // Merge Yelp results
  for (const shop of yelpResults) {
    const key = normalizeShopName(shop.name);

    if (aggregatedShops.has(key)) {
      const existing = aggregatedShops.get(key);
      existing.sources.push({
        source: 'yelp',
        rating: shop.rating,
        reviewCount: shop.reviewCount,
        reviews: shop.reviews,
        url: shop.url,
        photos: shop.photos
      });

      if (shop.photos && shop.photos.length > 0) {
        existing.photos = [...existing.photos, ...shop.photos].slice(0, 5);
      }
    } else {
      let matched = false;
      for (const [existingKey, existingShop] of aggregatedShops) {
        if (isSameShop(shop, existingShop)) {
          existingShop.sources.push({
            source: 'yelp',
            rating: shop.rating,
            reviewCount: shop.reviewCount,
            reviews: shop.reviews,
            url: shop.url,
            photos: shop.photos
          });
          matched = true;
          break;
        }
      }

      if (!matched) {
        aggregatedShops.set(key, {
          name: shop.name,
          address: shop.address,
          location: shop.location,
          neighborhood: shop.neighborhood || extractNeighborhood(shop.address),
          borough: shop.borough || extractBorough(shop.address),
          sources: [{
            source: 'yelp',
            rating: shop.rating,
            reviewCount: shop.reviewCount,
            reviews: shop.reviews,
            url: shop.url,
            photos: shop.photos
          }],
          photos: shop.photos || [],
          categories: shop.categories
        });
      }
    }
  }

  // Merge news/editorial results
  for (const mention of newsResults) {
    const key = normalizeShopName(mention.shopName);

    if (aggregatedShops.has(key)) {
      const existing = aggregatedShops.get(key);
      existing.sources.push({
        source: mention.source,
        sourceType: 'editorial',
        rating: mention.rating,
        reviewCount: 1,
        reviews: [{
          author: mention.publication,
          rating: mention.rating,
          text: mention.excerpt,
          time: mention.date,
          url: mention.url
        }],
        url: mention.url
      });
      existing.editorialMentions = (existing.editorialMentions || 0) + 1;
    } else {
      // Check fuzzy match
      for (const [existingKey, existingShop] of aggregatedShops) {
        if (existingShop.name.toLowerCase().includes(mention.shopName.toLowerCase()) ||
            mention.shopName.toLowerCase().includes(existingShop.name.toLowerCase())) {
          existingShop.sources.push({
            source: mention.source,
            sourceType: 'editorial',
            rating: mention.rating,
            reviewCount: 1,
            reviews: [{
              author: mention.publication,
              rating: mention.rating,
              text: mention.excerpt,
              time: mention.date,
              url: mention.url
            }],
            url: mention.url
          });
          existingShop.editorialMentions = (existingShop.editorialMentions || 0) + 1;
          break;
        }
      }
    }
  }

  // Convert to array and calculate pastry-specific scores
  const shops = Array.from(aggregatedShops.values()).map(shop => {
    // Filter to only relevant reviews
    const filteredSources = filterRelevantReviews(shop.sources, normalizedPastryType);

    // Calculate pastry-specific score
    const { score: pastryScore, relevantReviewCount } =
      calculatePastrySpecificScore(shop.sources, normalizedPastryType);

    // General stats
    const totalReviews = shop.sources.reduce((sum, s) => sum + s.reviewCount, 0);
    const avgRating = shop.sources.reduce((sum, s) => sum + s.rating, 0) / shop.sources.length;

    // Editorial bonus (being mentioned in publications is a strong signal)
    const editorialBonus = (shop.editorialMentions || 0) * 0.15;

    const finalScore = Math.min(5, pastryScore + editorialBonus);

    return {
      ...shop,
      sources: filteredSources, // Only show relevant reviews
      pastryScore: Math.round(finalScore * 100) / 100,
      relevantReviewCount,
      averageRating: Math.round(avgRating * 10) / 10,
      totalReviewCount: totalReviews,
      sourceCount: shop.sources.length,
      editorialMentions: shop.editorialMentions || 0
    };
  });

  // Sort by pastry-specific score (descending)
  shops.sort((a, b) => {
    // Primary: pastry score
    if (b.pastryScore !== a.pastryScore) {
      return b.pastryScore - a.pastryScore;
    }
    // Secondary: number of relevant reviews
    return b.relevantReviewCount - a.relevantReviewCount;
  });

  // Add rank
  return shops.map((shop, index) => ({
    ...shop,
    rank: index + 1
  }));
}

/**
 * Extract neighborhood from address
 */
function extractNeighborhood(address) {
  if (!address) return null;

  const neighborhoods = [
    'SoHo', 'Tribeca', 'DUMBO', 'Williamsburg', 'Greenpoint',
    'Chelsea', 'Greenwich Village', 'East Village', 'West Village',
    'Lower East Side', 'Upper East Side', 'Upper West Side',
    'Midtown', 'Harlem', 'Financial District', 'NoHo', 'NoLita',
    'Flatiron', 'Gramercy', 'Murray Hill', 'Hell\'s Kitchen',
    'Park Slope', 'Cobble Hill', 'Brooklyn Heights', 'Bushwick',
    'Astoria', 'Long Island City', 'Flushing'
  ];

  for (const hood of neighborhoods) {
    if (address.toLowerCase().includes(hood.toLowerCase())) {
      return hood;
    }
  }

  return null;
}

/**
 * Extract borough from address
 */
function extractBorough(address) {
  if (!address) return null;

  const addressLower = address.toLowerCase();

  if (addressLower.includes('brooklyn')) return 'Brooklyn';
  if (addressLower.includes('queens')) return 'Queens';
  if (addressLower.includes('bronx')) return 'Bronx';
  if (addressLower.includes('staten island')) return 'Staten Island';
  if (addressLower.includes('new york') || addressLower.includes('manhattan')) return 'Manhattan';

  const nycZipPatterns = {
    manhattan: /\b(100\d{2}|101\d{2}|102\d{2})\b/,
    brooklyn: /\b(112\d{2})\b/,
    queens: /\b(11[34]\d{2}|114\d{2}|116\d{2})\b/,
    bronx: /\b(104\d{2})\b/,
    statenIsland: /\b(103\d{2})\b/
  };

  if (nycZipPatterns.manhattan.test(address)) return 'Manhattan';
  if (nycZipPatterns.brooklyn.test(address)) return 'Brooklyn';
  if (nycZipPatterns.queens.test(address)) return 'Queens';
  if (nycZipPatterns.bronx.test(address)) return 'Bronx';
  if (nycZipPatterns.statenIsland.test(address)) return 'Staten Island';

  return null;
}

/**
 * Get available filter options
 */
function getFilterOptions() {
  return {
    pastryTypes: [
      { value: 'croissant', label: 'Plain Croissant' },
      { value: 'chocolate croissant', label: 'Chocolate Croissant / Pain au Chocolat' },
      { value: 'almond croissant', label: 'Almond Croissant' }
    ],
    boroughs: [
      { value: 'manhattan', label: 'Manhattan' },
      { value: 'brooklyn', label: 'Brooklyn' },
      { value: 'queens', label: 'Queens' },
      { value: 'bronx', label: 'Bronx' },
      { value: 'staten island', label: 'Staten Island' }
    ],
    neighborhoods: {
      manhattan: [
        'Upper East Side', 'Upper West Side', 'Midtown', 'Chelsea',
        'Greenwich Village', 'SoHo', 'Tribeca', 'Lower East Side',
        'East Village', 'Harlem', 'Financial District', 'NoHo', 'Flatiron'
      ],
      brooklyn: [
        'Williamsburg', 'DUMBO', 'Park Slope', 'Bushwick',
        'Greenpoint', 'Cobble Hill', 'Brooklyn Heights'
      ],
      queens: [
        'Astoria', 'Long Island City', 'Flushing'
      ]
    }
  };
}

module.exports = {
  aggregatePastryShops,
  getFilterOptions,
  reviewMentionsPastry,
  analyzeSentiment
};
