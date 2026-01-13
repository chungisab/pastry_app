const axios = require('axios');

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const GOOGLE_PLACES_BASE_URL = 'https://maps.googleapis.com/maps/api/place';

// NYC bounding box coordinates
const NYC_BOUNDS = {
  north: 40.917577,
  south: 40.477399,
  east: -73.700272,
  west: -74.259090
};

// NYC center coordinates
const NYC_CENTER = {
  lat: 40.7128,
  lng: -74.0060
};

// Borough coordinates for filtering
const BOROUGH_COORDS = {
  manhattan: { lat: 40.7831, lng: -73.9712 },
  brooklyn: { lat: 40.6782, lng: -73.9442 },
  queens: { lat: 40.7282, lng: -73.7949 },
  bronx: { lat: 40.8448, lng: -73.8648 },
  'staten island': { lat: 40.5795, lng: -74.1502 }
};

// Neighborhood mappings to coordinates (approximate centers)
const NEIGHBORHOOD_COORDS = {
  // Manhattan
  'upper east side': { lat: 40.7736, lng: -73.9566 },
  'upper west side': { lat: 40.7870, lng: -73.9754 },
  'midtown': { lat: 40.7549, lng: -73.9840 },
  'chelsea': { lat: 40.7465, lng: -74.0014 },
  'greenwich village': { lat: 40.7336, lng: -74.0027 },
  'soho': { lat: 40.7233, lng: -73.9961 },
  'tribeca': { lat: 40.7163, lng: -74.0086 },
  'lower east side': { lat: 40.7150, lng: -73.9843 },
  'east village': { lat: 40.7265, lng: -73.9815 },
  'harlem': { lat: 40.8116, lng: -73.9465 },
  'financial district': { lat: 40.7075, lng: -74.0113 },
  // Brooklyn
  'williamsburg': { lat: 40.7081, lng: -73.9571 },
  'dumbo': { lat: 40.7033, lng: -73.9880 },
  'park slope': { lat: 40.6710, lng: -73.9814 },
  'bushwick': { lat: 40.6944, lng: -73.9213 },
  'greenpoint': { lat: 40.7282, lng: -73.9485 },
  'cobble hill': { lat: 40.6860, lng: -73.9969 },
  'brooklyn heights': { lat: 40.6960, lng: -73.9936 },
  // Queens
  'astoria': { lat: 40.7644, lng: -73.9235 },
  'long island city': { lat: 40.7447, lng: -73.9485 },
  'flushing': { lat: 40.7654, lng: -73.8318 }
};

// Search query variations to find more bakeries
const SEARCH_QUERIES = [
  '{pastry} bakery',
  'best {pastry}',
  'French bakery {pastry}',
  '{pastry} cafe',
  'patisserie {pastry}'
];

// In-memory cache to reduce API calls
const placeCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Search for pastry shops using Google Places API
 * Enhanced version: searches across multiple neighborhoods and query variations
 * to maximize coverage within the ~40k monthly request quota
 *
 * @param {string} pastryType - Type of pastry (e.g., 'croissant', 'chocolate croissant')
 * @param {string} location - Optional neighborhood or borough filter
 * @returns {Promise<Array>} Array of shop results
 */
async function searchPastryShops(pastryType = 'croissant', location = null) {
  if (!GOOGLE_API_KEY || GOOGLE_API_KEY === 'your_google_api_key_here') {
    console.log('Google Places API key not configured, using mock data');
    return getMockGoogleData(pastryType, location);
  }

  try {
    // If specific location requested, do a focused search
    if (location) {
      return await searchSingleLocation(pastryType, location);
    }

    // For NYC-wide search, search across key neighborhoods to get more results
    // This uses more API quota but finds more unique bakeries
    const keyNeighborhoods = [
      'soho', 'tribeca', 'williamsburg', 'greenpoint', 'dumbo',
      'upper east side', 'upper west side', 'chelsea', 'east village',
      'lower east side', 'park slope', 'cobble hill', 'astoria'
    ];

    // Use 2 query variations per neighborhood to maximize coverage
    const searchPromises = [];
    const queriesPerNeighborhood = 2;

    for (const neighborhood of keyNeighborhoods) {
      for (let i = 0; i < queriesPerNeighborhood; i++) {
        const queryTemplate = SEARCH_QUERIES[i % SEARCH_QUERIES.length];
        const query = queryTemplate.replace('{pastry}', pastryType);
        searchPromises.push(searchNeighborhood(query, neighborhood));
      }
    }

    // Also do a general NYC search with multiple query variations
    for (const queryTemplate of SEARCH_QUERIES.slice(0, 3)) {
      const query = queryTemplate.replace('{pastry}', pastryType);
      searchPromises.push(searchGeneral(query));
    }

    console.log(`Executing ${searchPromises.length} searches for comprehensive coverage...`);
    const allResults = await Promise.all(searchPromises);

    // Flatten and deduplicate results by place_id
    const uniquePlaces = new Map();
    for (const results of allResults) {
      for (const place of results) {
        if (!uniquePlaces.has(place.place_id)) {
          uniquePlaces.set(place.place_id, place);
        }
      }
    }

    const places = Array.from(uniquePlaces.values());
    console.log(`Found ${places.length} unique bakeries`);

    // Get detailed info for top 30 places (uses 30 API calls)
    const detailedResults = await Promise.all(
      places.slice(0, 30).map(place => getPlaceDetails(place.place_id))
    );

    return detailedResults.filter(Boolean).map(formatPlaceResult);
  } catch (error) {
    console.error('Error fetching from Google Places:', error.message);
    return getMockGoogleData(pastryType, location);
  }
}

/**
 * Search a single neighborhood
 */
async function searchNeighborhood(query, neighborhood) {
  const cacheKey = `search:${query}:${neighborhood}`;
  const cached = placeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const coords = NEIGHBORHOOD_COORDS[neighborhood.toLowerCase()] || NYC_CENTER;
    const response = await axios.get(`${GOOGLE_PLACES_BASE_URL}/textsearch/json`, {
      params: {
        query: `${query} in ${neighborhood} New York`,
        location: `${coords.lat},${coords.lng}`,
        radius: 2500,
        type: 'bakery',
        key: GOOGLE_API_KEY
      }
    });

    const results = response.data.status === 'OK' ? response.data.results : [];
    placeCache.set(cacheKey, { data: results, timestamp: Date.now() });
    return results;
  } catch (error) {
    console.error(`Error searching ${neighborhood}:`, error.message);
    return [];
  }
}

/**
 * General NYC-wide search
 */
async function searchGeneral(query) {
  const cacheKey = `search:general:${query}`;
  const cached = placeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const response = await axios.get(`${GOOGLE_PLACES_BASE_URL}/textsearch/json`, {
      params: {
        query: `${query} in New York City`,
        location: `${NYC_CENTER.lat},${NYC_CENTER.lng}`,
        radius: 15000,
        type: 'bakery',
        key: GOOGLE_API_KEY
      }
    });

    const results = response.data.status === 'OK' ? response.data.results : [];
    placeCache.set(cacheKey, { data: results, timestamp: Date.now() });
    return results;
  } catch (error) {
    console.error('Error in general search:', error.message);
    return [];
  }
}

/**
 * Search a single specific location (for filtered searches)
 */
async function searchSingleLocation(pastryType, location) {
  const locationLower = location.toLowerCase();
  let searchLocation = NYC_CENTER;
  let radius = 15000;

  if (BOROUGH_COORDS[locationLower]) {
    searchLocation = BOROUGH_COORDS[locationLower];
    radius = 8000;
  } else if (NEIGHBORHOOD_COORDS[locationLower]) {
    searchLocation = NEIGHBORHOOD_COORDS[locationLower];
    radius = 2500;
  }

  // Use multiple query variations even for single location
  const searchPromises = SEARCH_QUERIES.slice(0, 3).map(async (queryTemplate) => {
    const query = queryTemplate.replace('{pastry}', pastryType);
    try {
      const response = await axios.get(`${GOOGLE_PLACES_BASE_URL}/textsearch/json`, {
        params: {
          query: `${query} in ${location} New York`,
          location: `${searchLocation.lat},${searchLocation.lng}`,
          radius: radius,
          type: 'bakery',
          key: GOOGLE_API_KEY
        }
      });
      return response.data.status === 'OK' ? response.data.results : [];
    } catch (error) {
      return [];
    }
  });

  const allResults = await Promise.all(searchPromises);

  // Deduplicate
  const uniquePlaces = new Map();
  for (const results of allResults) {
    for (const place of results) {
      if (!uniquePlaces.has(place.place_id)) {
        uniquePlaces.set(place.place_id, place);
      }
    }
  }

  const places = Array.from(uniquePlaces.values());

  // Get details for top 15 places
  const detailedResults = await Promise.all(
    places.slice(0, 15).map(place => getPlaceDetails(place.place_id))
  );

  return detailedResults.filter(Boolean).map(formatPlaceResult);
}

/**
 * Format a place result from the API
 */
function formatPlaceResult(place) {
  return {
    source: 'google',
    placeId: place.place_id,
    name: place.name,
    address: place.formatted_address,
    location: place.geometry?.location,
    rating: place.rating || 0,
    reviewCount: place.user_ratings_total || 0,
    priceLevel: place.price_level,
    isOpen: place.opening_hours?.open_now,
    photos: place.photos?.slice(0, 3).map(p =>
      `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${p.photo_reference}&key=${GOOGLE_API_KEY}`
    ) || [],
    reviews: (place.reviews || []).slice(0, 5).map(review => ({
      author: review.author_name,
      rating: review.rating,
      text: review.text,
      time: review.relative_time_description,
      profilePhoto: review.profile_photo_url
    })),
    url: place.url,
    website: place.website
  };
}

/**
 * Get detailed place information including reviews
 */
async function getPlaceDetails(placeId) {
  try {
    const response = await axios.get(`${GOOGLE_PLACES_BASE_URL}/details/json`, {
      params: {
        place_id: placeId,
        fields: 'place_id,name,formatted_address,geometry,rating,user_ratings_total,price_level,opening_hours,photos,reviews,url,website',
        key: GOOGLE_API_KEY
      }
    });

    if (response.data.status === 'OK') {
      return response.data.result;
    }
    return null;
  } catch (error) {
    console.error('Error fetching place details:', error.message);
    return null;
  }
}

/**
 * Generate mock data for development/demo when API key is not available
 * Reviews are pastry-specific to enable proper scoring
 */
function getMockGoogleData(pastryType, location) {
  // All shops with reviews for different pastry types
  const mockShops = [
    {
      source: 'google',
      placeId: 'mock_google_1',
      name: 'Dominique Ansel Bakery',
      address: '189 Spring St, New York, NY 10012',
      location: { lat: 40.7245, lng: -73.9994 },
      rating: 4.6,
      reviewCount: 4521,
      priceLevel: 2,
      isOpen: true,
      neighborhood: 'SoHo',
      borough: 'Manhattan',
      photos: [],
      reviews: [
        // Plain croissant reviews
        { author: 'Sarah M.', rating: 5, text: 'The butter croissant here is absolutely divine! Flaky, buttery perfection. Best plain croissant in NYC.', time: '2 weeks ago' },
        { author: 'John D.', rating: 5, text: 'Their classic croissant is incredible - shatteringly crisp outside, soft and layered inside.', time: '1 month ago' },
        // Chocolate croissant reviews
        { author: 'Emily R.', rating: 5, text: 'The pain au chocolat is heavenly - rich dark chocolate wrapped in perfect laminated dough.', time: '3 weeks ago' },
        { author: 'Kevin L.', rating: 5, text: 'Best chocolate croissant I have ever had. The chocolate is perfectly melted inside.', time: '2 weeks ago' },
        // Almond croissant reviews
        { author: 'Maria G.', rating: 5, text: 'The almond croissant is incredible - filled with fresh almond cream and perfectly toasted.', time: '1 week ago' }
      ]
    },
    {
      source: 'google',
      placeId: 'mock_google_2',
      name: 'Balthazar Bakery',
      address: '80 Spring St, New York, NY 10012',
      location: { lat: 40.7225, lng: -73.9973 },
      rating: 4.5,
      reviewCount: 3892,
      priceLevel: 2,
      isOpen: true,
      neighborhood: 'SoHo',
      borough: 'Manhattan',
      photos: [],
      reviews: [
        // Plain croissant reviews
        { author: 'Mike T.', rating: 5, text: 'Classic French butter croissant that transports you to Paris. Perfectly flaky.', time: '1 week ago' },
        { author: 'Lisa K.', rating: 4, text: 'The plain croissant is consistently good. My go-to morning treat.', time: '2 weeks ago' },
        // Chocolate croissant reviews
        { author: 'David W.', rating: 4, text: 'Good pain au chocolat but the chocolate could be darker. Still delicious though.', time: '3 weeks ago' },
        // Almond croissant reviews
        { author: 'Sophie B.', rating: 5, text: 'The almond croissant is outstanding - generous frangipane filling and perfectly caramelized.', time: '1 week ago' }
      ]
    },
    {
      source: 'google',
      placeId: 'mock_google_3',
      name: 'Bien Cuit',
      address: '120 Smith St, Brooklyn, NY 11201',
      location: { lat: 40.6867, lng: -73.9897 },
      rating: 4.7,
      reviewCount: 1823,
      priceLevel: 2,
      isOpen: true,
      neighborhood: 'Cobble Hill',
      borough: 'Brooklyn',
      photos: [],
      reviews: [
        // Plain croissant reviews
        { author: 'Anna P.', rating: 5, text: 'Their butter croissant is a work of art. Perfect layers, incredible flavor from the long fermentation.', time: '3 days ago' },
        { author: 'Robert H.', rating: 5, text: 'Best plain croissant in Brooklyn! The 3-day lamination process makes all the difference.', time: '1 week ago' },
        // Chocolate croissant reviews
        { author: 'Claire M.', rating: 5, text: 'The pain au chocolat uses Valrhona chocolate - rich, not too sweet, absolutely perfect.', time: '5 days ago' },
        { author: 'James K.', rating: 5, text: 'Chocolate croissant is phenomenal. The chocolate stays gooey inside while the pastry is crisp.', time: '2 weeks ago' },
        // Almond croissant reviews
        { author: 'Nina R.', rating: 4, text: 'The almond croissant is good but quite sweet. Beautiful presentation though.', time: '1 week ago' }
      ]
    },
    {
      source: 'google',
      placeId: 'mock_google_4',
      name: 'Arcade Bakery',
      address: '220 Church St, New York, NY 10013',
      location: { lat: 40.7165, lng: -74.0055 },
      rating: 4.8,
      reviewCount: 987,
      priceLevel: 2,
      isOpen: true,
      neighborhood: 'Tribeca',
      borough: 'Manhattan',
      photos: [],
      reviews: [
        // Plain croissant reviews
        { author: 'Chris L.', rating: 5, text: 'Hidden gem in Tribeca. The plain croissant is perfection - shatteringly crisp, deeply buttery.', time: '5 days ago' },
        { author: 'Diana S.', rating: 5, text: 'The butter croissant here rivals anything in Paris. Incredible lamination.', time: '2 weeks ago' },
        // Chocolate croissant reviews
        { author: 'Paul N.', rating: 5, text: 'The chocolate croissant is outstanding - dark chocolate, not overly sweet, perfect texture.', time: '1 week ago' },
        // Almond croissant reviews
        { author: 'Rebecca T.', rating: 5, text: 'Almond croissant is amazing - generous almond cream filling, beautiful toasted almonds on top.', time: '3 days ago' }
      ]
    },
    {
      source: 'google',
      placeId: 'mock_google_5',
      name: 'Almondine Bakery',
      address: '85 Water St, Brooklyn, NY 11201',
      location: { lat: 40.7033, lng: -73.9880 },
      rating: 4.6,
      reviewCount: 2156,
      priceLevel: 2,
      isOpen: true,
      neighborhood: 'DUMBO',
      borough: 'Brooklyn',
      photos: [],
      reviews: [
        // Plain croissant reviews
        { author: 'Tom W.', rating: 5, text: 'Authentic French bakery in DUMBO. The butter croissant is amazing - so flaky!', time: '1 week ago' },
        { author: 'Rachel G.', rating: 4, text: 'Great plain croissant with a view of the bridge. Lovely breakfast spot.', time: '3 weeks ago' },
        // Chocolate croissant reviews
        { author: 'Henry L.', rating: 5, text: 'The pain au chocolat is excellent - two generous chocolate batons, perfectly baked.', time: '4 days ago' },
        { author: 'Susan K.', rating: 4, text: 'Good chocolate croissant, though I wish it had more chocolate. Still tasty!', time: '2 weeks ago' },
        // Almond croissant reviews
        { author: 'Frank M.', rating: 5, text: 'The almond croissant is divine - fresh almond paste, not too sweet, perfectly toasted.', time: '1 week ago' }
      ]
    },
    {
      source: 'google',
      placeId: 'mock_google_6',
      name: 'Maison Kayser',
      address: '1294 Third Ave, New York, NY 10021',
      location: { lat: 40.7698, lng: -73.9582 },
      rating: 4.4,
      reviewCount: 1567,
      priceLevel: 2,
      isOpen: true,
      neighborhood: 'Upper East Side',
      borough: 'Manhattan',
      photos: [],
      reviews: [
        // Plain croissant reviews
        { author: 'Julie F.', rating: 4, text: 'Reliable French bakery chain. Plain croissant is always fresh and buttery.', time: '4 days ago' },
        { author: 'Mark B.', rating: 4, text: 'Good butter croissant, consistent quality across locations.', time: '1 week ago' },
        // Chocolate croissant reviews
        { author: 'Linda P.', rating: 4, text: 'The pain au chocolat is decent - good for a chain bakery.', time: '2 weeks ago' },
        // Almond croissant reviews
        { author: 'Greg S.', rating: 3, text: 'Almond croissant was disappointing - too much sugar, not enough almond flavor.', time: '1 week ago' }
      ]
    },
    {
      source: 'google',
      placeId: 'mock_google_7',
      name: 'Bourke Street Bakery',
      address: '68 Franklin St, Brooklyn, NY 11222',
      location: { lat: 40.7282, lng: -73.9485 },
      rating: 4.5,
      reviewCount: 892,
      priceLevel: 2,
      isOpen: true,
      neighborhood: 'Greenpoint',
      borough: 'Brooklyn',
      photos: [],
      reviews: [
        // Plain croissant reviews
        { author: 'Nicole A.', rating: 5, text: 'Australian bakery with incredible plain croissant - crispy, buttery, perfect.', time: '6 days ago' },
        { author: 'Steven C.', rating: 4, text: 'Great butter croissant in a hip neighborhood. Love this spot.', time: '2 weeks ago' },
        // Chocolate croissant reviews
        { author: 'Amy T.', rating: 3, text: 'The chocolate croissant was mediocre - a bit dry and the chocolate was underwhelming.', time: '1 week ago' },
        // Almond croissant reviews
        { author: 'Peter L.', rating: 5, text: 'The almond croissant is phenomenal - rich almond cream, perfectly flaky pastry.', time: '4 days ago' }
      ]
    },
    {
      source: 'google',
      placeId: 'mock_google_8',
      name: 'Supermoon Bakehouse',
      address: '120 Rivington St, New York, NY 10002',
      location: { lat: 40.7196, lng: -73.9852 },
      rating: 4.7,
      reviewCount: 1234,
      priceLevel: 2,
      isOpen: true,
      neighborhood: 'Lower East Side',
      borough: 'Manhattan',
      photos: [],
      reviews: [
        // Plain croissant reviews
        { author: 'Amy L.', rating: 5, text: 'Their plain butter croissant is exceptional - honeycomb interior, shattering crust.', time: '3 days ago' },
        { author: 'Ben K.', rating: 5, text: 'Incredible croissant technique. The plain one is a must-try before their fancy flavors.', time: '1 week ago' },
        // Chocolate croissant reviews
        { author: 'Mia S.', rating: 4, text: 'The chocolate croissant is good but their specialty cruffins are better.', time: '5 days ago' },
        // Almond croissant reviews
        { author: 'Jake R.', rating: 5, text: 'Best almond croissant in the city! Twice-baked with house-made almond cream.', time: '2 weeks ago' }
      ]
    },
    {
      source: 'google',
      placeId: 'mock_google_9',
      name: 'Patisserie Chanson',
      address: '20 W 23rd St, New York, NY 10010',
      location: { lat: 40.7421, lng: -73.9907 },
      rating: 4.4,
      reviewCount: 1456,
      priceLevel: 2,
      isOpen: true,
      neighborhood: 'Flatiron',
      borough: 'Manhattan',
      photos: [],
      reviews: [
        // Plain croissant reviews
        { author: 'Victoria L.', rating: 4, text: 'Elegant patisserie with a solid butter croissant. Nice flaky layers.', time: '1 week ago' },
        // Chocolate croissant reviews
        { author: 'Michael C.', rating: 5, text: 'The pain au chocolat is beautiful and delicious - dark chocolate, perfect pastry.', time: '2 weeks ago' },
        // Almond croissant reviews
        { author: 'Emma W.', rating: 5, text: 'The almond croissant is stunning - filled with rich frangipane, topped with sliced almonds.', time: '4 days ago' }
      ]
    },
    {
      source: 'google',
      placeId: 'mock_google_10',
      name: 'Lafayette Grand Cafe',
      address: '380 Lafayette St, New York, NY 10003',
      location: { lat: 40.7267, lng: -73.9926 },
      rating: 4.3,
      reviewCount: 3421,
      priceLevel: 3,
      isOpen: true,
      neighborhood: 'NoHo',
      borough: 'Manhattan',
      photos: [],
      reviews: [
        // Plain croissant reviews
        { author: 'Stephanie R.', rating: 4, text: 'Beautiful space with a good butter croissant. Great for brunch.', time: '1 week ago' },
        // Chocolate croissant reviews
        { author: 'Daniel M.', rating: 5, text: 'The chocolate croissant is excellent - properly made with quality chocolate.', time: '2 weeks ago' },
        // Almond croissant reviews
        { author: 'Olivia H.', rating: 4, text: 'Nice almond croissant though a bit pricey for the size.', time: '3 weeks ago' }
      ]
    }
  ];

  // Filter by location if specified
  if (location) {
    const locationLower = location.toLowerCase();
    return mockShops.filter(shop =>
      shop.neighborhood?.toLowerCase().includes(locationLower) ||
      shop.borough?.toLowerCase().includes(locationLower) ||
      shop.address.toLowerCase().includes(locationLower)
    );
  }

  return mockShops;
}

module.exports = {
  searchPastryShops,
  getPlaceDetails,
  BOROUGH_COORDS,
  NEIGHBORHOOD_COORDS
};
