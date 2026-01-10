const googlePlaces = require('./googlePlaces');
const yelp = require('./yelp');

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
  const R = 6371; // Radius of Earth in km
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

  // Check name similarity
  const nameSimilar =
    name1.includes(name2) ||
    name2.includes(name1) ||
    name1 === name2;

  if (!nameSimilar) return false;

  // Check location proximity (within 200m)
  if (shop1.location && shop2.location &&
    shop1.location.lat && shop2.location.lat) {
    const distance = calculateDistance(
      shop1.location.lat,
      shop1.location.lng,
      shop2.location.lat,
      shop2.location.lng
    );
    return distance < 0.2; // 200 meters
  }

  // If location not available, rely on name similarity
  return nameSimilar;
}

/**
 * Calculate cumulative score from multiple sources
 */
function calculateCumulativeScore(sources) {
  if (!sources || sources.length === 0) return 0;

  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const source of sources) {
    // Weight by number of reviews (logarithmic to prevent domination)
    const reviewWeight = Math.log10(Math.max(source.reviewCount, 1) + 1);
    totalWeightedScore += source.rating * reviewWeight;
    totalWeight += reviewWeight;
  }

  return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
}

/**
 * Aggregate data from all sources for a pastry type
 * @param {string} pastryType - Type of pastry
 * @param {string} location - Optional location filter
 * @returns {Promise<Array>} Aggregated and ranked shop list
 */
async function aggregatePastryShops(pastryType = 'croissant', location = null) {
  console.log(`Aggregating data for: ${pastryType}, location: ${location || 'all NYC'}`);

  // Fetch data from all sources in parallel
  const [googleResults, yelpResults] = await Promise.all([
    googlePlaces.searchPastryShops(pastryType, location),
    yelp.searchPastryShops(pastryType, location)
  ]);

  console.log(`Google results: ${googleResults.length}, Yelp results: ${yelpResults.length}`);

  // Map to track aggregated shops
  const aggregatedShops = new Map();

  // Process Google results first
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
      // Merge with existing entry
      const existing = aggregatedShops.get(key);
      existing.sources.push({
        source: 'yelp',
        rating: shop.rating,
        reviewCount: shop.reviewCount,
        reviews: shop.reviews,
        url: shop.url,
        photos: shop.photos
      });

      // Merge photos
      if (shop.photos && shop.photos.length > 0) {
        existing.photos = [...existing.photos, ...shop.photos].slice(0, 5);
      }
    } else {
      // Check for fuzzy match based on location
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
        // Add as new entry
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

  // Convert to array and calculate cumulative scores
  const shops = Array.from(aggregatedShops.values()).map(shop => {
    const cumulativeScore = calculateCumulativeScore(shop.sources);
    const totalReviews = shop.sources.reduce((sum, s) => sum + s.reviewCount, 0);
    const avgRating = shop.sources.reduce((sum, s) => sum + s.rating, 0) / shop.sources.length;

    return {
      ...shop,
      cumulativeScore: Math.round(cumulativeScore * 100) / 100,
      averageRating: Math.round(avgRating * 10) / 10,
      totalReviewCount: totalReviews,
      sourceCount: shop.sources.length
    };
  });

  // Sort by cumulative score (descending)
  shops.sort((a, b) => b.cumulativeScore - a.cumulativeScore);

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

  // Check zip codes
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
      { value: 'chocolate croissant', label: 'Chocolate Croissant' },
      { value: 'pain au chocolat', label: 'Pain au Chocolat' },
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
  calculateCumulativeScore
};
