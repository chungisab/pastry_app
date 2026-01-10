const axios = require('axios');

const YELP_API_KEY = process.env.YELP_API_KEY;
const YELP_BASE_URL = 'https://api.yelp.com/v3';

// NYC location for Yelp searches
const NYC_LOCATION = 'New York, NY';

/**
 * Search for pastry shops using Yelp API
 * @param {string} pastryType - Type of pastry (e.g., 'croissant', 'chocolate croissant')
 * @param {string} location - Optional neighborhood or borough filter
 * @returns {Promise<Array>} Array of shop results
 */
async function searchPastryShops(pastryType = 'croissant', location = null) {
  if (!YELP_API_KEY || YELP_API_KEY === 'your_yelp_api_key_here') {
    console.log('Yelp API key not configured, using mock data');
    return getMockYelpData(pastryType, location);
  }

  try {
    const searchLocation = location ? `${location}, New York, NY` : NYC_LOCATION;

    // Search for bakeries with the pastry type
    const response = await axios.get(`${YELP_BASE_URL}/businesses/search`, {
      headers: {
        Authorization: `Bearer ${YELP_API_KEY}`
      },
      params: {
        term: `${pastryType} bakery`,
        location: searchLocation,
        categories: 'bakeries,cafes,french',
        sort_by: 'rating',
        limit: 20
      }
    });

    const businesses = response.data.businesses || [];

    // Get detailed reviews for top results
    const detailedResults = await Promise.all(
      businesses.slice(0, 10).map(async business => {
        const reviews = await getBusinessReviews(business.id);
        return {
          ...business,
          detailedReviews: reviews
        };
      })
    );

    return detailedResults.map(business => ({
      source: 'yelp',
      yelpId: business.id,
      name: business.name,
      address: business.location?.display_address?.join(', ') || '',
      location: {
        lat: business.coordinates?.latitude,
        lng: business.coordinates?.longitude
      },
      rating: business.rating || 0,
      reviewCount: business.review_count || 0,
      priceLevel: business.price?.length || 0,
      isClosed: business.is_closed,
      categories: business.categories?.map(c => c.title) || [],
      photos: business.photos || [business.image_url].filter(Boolean),
      reviews: (business.detailedReviews || []).map(review => ({
        author: review.user?.name || 'Anonymous',
        rating: review.rating,
        text: review.text,
        time: review.time_created,
        profilePhoto: review.user?.image_url
      })),
      url: business.url,
      phone: business.display_phone,
      neighborhood: business.location?.city || ''
    }));
  } catch (error) {
    console.error('Error fetching from Yelp:', error.message);
    return getMockYelpData(pastryType, location);
  }
}

/**
 * Get reviews for a specific business
 */
async function getBusinessReviews(businessId) {
  try {
    const response = await axios.get(`${YELP_BASE_URL}/businesses/${businessId}/reviews`, {
      headers: {
        Authorization: `Bearer ${YELP_API_KEY}`
      },
      params: {
        limit: 5,
        sort_by: 'yelp_sort'
      }
    });

    return response.data.reviews || [];
  } catch (error) {
    console.error('Error fetching Yelp reviews:', error.message);
    return [];
  }
}

/**
 * Generate mock data for development/demo when API key is not available
 */
function getMockYelpData(pastryType, location) {
  const mockShops = [
    {
      source: 'yelp',
      yelpId: 'mock_yelp_1',
      name: 'Dominique Ansel Bakery',
      address: '189 Spring St, New York, NY 10012',
      location: { lat: 40.7245, lng: -73.9994 },
      rating: 4.5,
      reviewCount: 8234,
      priceLevel: 2,
      isClosed: false,
      categories: ['Bakeries', 'French', 'Desserts'],
      neighborhood: 'SoHo',
      borough: 'Manhattan',
      photos: [],
      reviews: [
        { author: 'Jennifer L.', rating: 5, text: `OMG the ${pastryType} here changed my life! So buttery and flaky.`, time: '2024-01-05' },
        { author: 'Kevin M.', rating: 5, text: 'Famous for the cronut but their croissants are equally amazing.', time: '2024-01-02' },
        { author: 'Samantha R.', rating: 4, text: 'Pricey but worth it for special occasions.', time: '2023-12-28' }
      ]
    },
    {
      source: 'yelp',
      yelpId: 'mock_yelp_2',
      name: 'Balthazar Bakery',
      address: '80 Spring St, New York, NY 10012',
      location: { lat: 40.7225, lng: -73.9973 },
      rating: 4.3,
      reviewCount: 5621,
      priceLevel: 2,
      isClosed: false,
      categories: ['Bakeries', 'French', 'Breakfast & Brunch'],
      neighborhood: 'SoHo',
      borough: 'Manhattan',
      photos: [],
      reviews: [
        { author: 'David W.', rating: 5, text: 'Classic NYC institution. Their croissants are legendary.', time: '2024-01-03' },
        { author: 'Laura B.', rating: 4, text: `Great ${pastryType}s paired with their amazing coffee.`, time: '2023-12-30' }
      ]
    },
    {
      source: 'yelp',
      yelpId: 'mock_yelp_3',
      name: 'Bien Cuit',
      address: '120 Smith St, Brooklyn, NY 11201',
      location: { lat: 40.6867, lng: -73.9897 },
      rating: 4.6,
      reviewCount: 2341,
      priceLevel: 2,
      isClosed: false,
      categories: ['Bakeries', 'French', 'Coffee & Tea'],
      neighborhood: 'Cobble Hill',
      borough: 'Brooklyn',
      photos: [],
      reviews: [
        { author: 'Michelle T.', rating: 5, text: 'Best bakery in Brooklyn! Their pastries are perfection.', time: '2024-01-04' },
        { author: 'Andrew J.', rating: 5, text: `The ${pastryType} is crispy on the outside, soft inside. Heaven!`, time: '2024-01-01' }
      ]
    },
    {
      source: 'yelp',
      yelpId: 'mock_yelp_4',
      name: 'Arcade Bakery',
      address: '220 Church St, New York, NY 10013',
      location: { lat: 40.7165, lng: -74.0055 },
      rating: 4.7,
      reviewCount: 1567,
      priceLevel: 2,
      isClosed: false,
      categories: ['Bakeries', 'French'],
      neighborhood: 'Tribeca',
      borough: 'Manhattan',
      photos: [],
      reviews: [
        { author: 'Catherine H.', rating: 5, text: 'Hidden in an office building lobby - such a cool spot!', time: '2024-01-06' },
        { author: 'James P.', rating: 5, text: 'Croissants are phenomenal. Best kept secret in Tribeca.', time: '2023-12-29' }
      ]
    },
    {
      source: 'yelp',
      yelpId: 'mock_yelp_5',
      name: 'Almondine Bakery',
      address: '85 Water St, Brooklyn, NY 11201',
      location: { lat: 40.7033, lng: -73.9880 },
      rating: 4.5,
      reviewCount: 1892,
      priceLevel: 2,
      isClosed: false,
      categories: ['Bakeries', 'French', 'Coffee & Tea'],
      neighborhood: 'DUMBO',
      borough: 'Brooklyn',
      photos: [],
      reviews: [
        { author: 'Emma S.', rating: 5, text: 'French bakery in the heart of DUMBO. Pastries are amazing!', time: '2024-01-02' },
        { author: 'Ryan K.', rating: 4, text: `Good ${pastryType}s, great location near the bridge.`, time: '2023-12-31' }
      ]
    },
    {
      source: 'yelp',
      yelpId: 'mock_yelp_6',
      name: 'Maison Kayser',
      address: '1294 Third Ave, New York, NY 10021',
      location: { lat: 40.7698, lng: -73.9582 },
      rating: 4.2,
      reviewCount: 2134,
      priceLevel: 2,
      isClosed: false,
      categories: ['Bakeries', 'French', 'Cafes'],
      neighborhood: 'Upper East Side',
      borough: 'Manhattan',
      photos: [],
      reviews: [
        { author: 'Patricia N.', rating: 4, text: 'Solid French bakery chain. Consistent quality every time.', time: '2024-01-05' },
        { author: 'George F.', rating: 4, text: 'Nice spot for breakfast pastries in the UES.', time: '2023-12-27' }
      ]
    },
    {
      source: 'yelp',
      yelpId: 'mock_yelp_7',
      name: 'Patisserie Chanson',
      address: '20 W 23rd St, New York, NY 10010',
      location: { lat: 40.7421, lng: -73.9907 },
      rating: 4.4,
      reviewCount: 1456,
      priceLevel: 2,
      isClosed: false,
      categories: ['Bakeries', 'French', 'Desserts'],
      neighborhood: 'Flatiron',
      borough: 'Manhattan',
      photos: [],
      reviews: [
        { author: 'Victoria L.', rating: 5, text: `Elegant patisserie with beautiful ${pastryType}s.`, time: '2024-01-04' },
        { author: 'Michael C.', rating: 4, text: 'Great desserts and pastries in a chic setting.', time: '2023-12-30' }
      ]
    },
    {
      source: 'yelp',
      yelpId: 'mock_yelp_8',
      name: 'Lafayette Grand Cafe & Bakery',
      address: '380 Lafayette St, New York, NY 10003',
      location: { lat: 40.7267, lng: -73.9926 },
      rating: 4.3,
      reviewCount: 3421,
      priceLevel: 3,
      isClosed: false,
      categories: ['Bakeries', 'French', 'Breakfast & Brunch'],
      neighborhood: 'NoHo',
      borough: 'Manhattan',
      photos: [],
      reviews: [
        { author: 'Stephanie R.', rating: 4, text: 'Beautiful space with excellent French pastries.', time: '2024-01-03' },
        { author: 'Daniel M.', rating: 5, text: `Their ${pastryType} with coffee is my perfect morning.`, time: '2024-01-01' }
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
  getBusinessReviews
};
