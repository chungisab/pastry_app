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

/**
 * Search for pastry shops using Google Places API
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
    const searchQuery = `${pastryType} bakery`;
    let searchLocation = NYC_CENTER;
    let radius = 15000; // 15km default for NYC-wide search

    // If a specific location is provided, use its coordinates
    if (location) {
      const locationLower = location.toLowerCase();
      if (BOROUGH_COORDS[locationLower]) {
        searchLocation = BOROUGH_COORDS[locationLower];
        radius = 8000; // 8km for borough search
      } else if (NEIGHBORHOOD_COORDS[locationLower]) {
        searchLocation = NEIGHBORHOOD_COORDS[locationLower];
        radius = 2000; // 2km for neighborhood search
      }
    }

    // Text search for pastry shops
    const response = await axios.get(`${GOOGLE_PLACES_BASE_URL}/textsearch/json`, {
      params: {
        query: `${searchQuery} in New York City`,
        location: `${searchLocation.lat},${searchLocation.lng}`,
        radius: radius,
        type: 'bakery',
        key: GOOGLE_API_KEY
      }
    });

    if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', response.data.status);
      return getMockGoogleData(pastryType, location);
    }

    const places = response.data.results || [];

    // Get detailed info including reviews for top results
    const detailedResults = await Promise.all(
      places.slice(0, 10).map(place => getPlaceDetails(place.place_id))
    );

    return detailedResults.filter(Boolean).map(place => ({
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
    }));
  } catch (error) {
    console.error('Error fetching from Google Places:', error.message);
    return getMockGoogleData(pastryType, location);
  }
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
 */
function getMockGoogleData(pastryType, location) {
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
        { author: 'Sarah M.', rating: 5, text: `The ${pastryType} here is absolutely divine! Flaky, buttery perfection.`, time: '2 weeks ago' },
        { author: 'John D.', rating: 5, text: 'Best croissants in NYC hands down. Worth every penny.', time: '1 month ago' },
        { author: 'Emily R.', rating: 4, text: 'Amazing pastries but expect to wait in line.', time: '3 weeks ago' }
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
        { author: 'Mike T.', rating: 5, text: `Classic French ${pastryType}s that transport you to Paris.`, time: '1 week ago' },
        { author: 'Lisa K.', rating: 4, text: 'Consistently good quality. My go-to bakery.', time: '2 weeks ago' }
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
        { author: 'Anna P.', rating: 5, text: `Their ${pastryType} is a work of art. Perfect layers every time.`, time: '3 days ago' },
        { author: 'Robert H.', rating: 5, text: 'Brooklyn gem! The best pastries this side of the river.', time: '1 week ago' }
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
        { author: 'Chris L.', rating: 5, text: 'Hidden gem in Tribeca. Croissants are perfection.', time: '5 days ago' },
        { author: 'Diana S.', rating: 5, text: `The ${pastryType} here rivals anything in Paris.`, time: '2 weeks ago' }
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
        { author: 'Tom W.', rating: 5, text: 'Authentic French bakery in DUMBO. Amazing croissants!', time: '1 week ago' },
        { author: 'Rachel G.', rating: 4, text: 'Great pastries with a view of the bridge.', time: '3 weeks ago' }
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
        { author: 'Julie F.', rating: 4, text: 'Reliable French bakery chain. Croissants are always fresh.', time: '4 days ago' },
        { author: 'Mark B.', rating: 5, text: `Love their ${pastryType}! Perfect with coffee.`, time: '1 week ago' }
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
        { author: 'Nicole A.', rating: 5, text: 'Australian bakery with incredible pastries.', time: '6 days ago' },
        { author: 'Steven C.', rating: 4, text: 'Great croissants in a hip neighborhood.', time: '2 weeks ago' }
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
        { author: 'Amy L.', rating: 5, text: 'Creative pastries! Their cruffins are legendary.', time: '3 days ago' },
        { author: 'Ben K.', rating: 5, text: `Incredible ${pastryType}s with unique flavors.`, time: '1 week ago' }
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
