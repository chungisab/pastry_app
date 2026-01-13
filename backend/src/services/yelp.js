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
 * Reviews are pastry-specific to enable proper scoring
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
        // Plain croissant reviews
        { author: 'Jennifer L.', rating: 5, text: 'The butter croissant here changed my life! So buttery and flaky with perfect layers.', time: '2024-01-05' },
        { author: 'Kevin M.', rating: 5, text: 'Famous for the cronut but their plain croissant is equally amazing - crisp and delicious.', time: '2024-01-02' },
        // Chocolate croissant reviews
        { author: 'Samantha R.', rating: 5, text: 'The pain au chocolat is incredible - two sticks of dark chocolate in perfect pastry.', time: '2023-12-28' },
        { author: 'Brandon T.', rating: 5, text: 'Best chocolate croissant in NYC! The chocolate is perfectly melted, the pastry is flaky.', time: '2024-01-03' },
        // Almond croissant reviews
        { author: 'Nicole H.', rating: 5, text: 'The almond croissant is divine - rich almond cream, toasted almonds, not too sweet.', time: '2024-01-01' }
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
        // Plain croissant reviews
        { author: 'David W.', rating: 5, text: 'Classic NYC institution. Their butter croissant is legendary - perfectly flaky.', time: '2024-01-03' },
        { author: 'Laura B.', rating: 4, text: 'Great plain croissant paired with their amazing coffee. A SoHo classic.', time: '2023-12-30' },
        // Chocolate croissant reviews
        { author: 'Marcus L.', rating: 4, text: 'The pain au chocolat is good but a bit pricey. Chocolate could be darker.', time: '2024-01-02' },
        // Almond croissant reviews
        { author: 'Caroline M.', rating: 5, text: 'The almond croissant is outstanding - generous frangipane, perfectly toasted.', time: '2024-01-04' }
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
        // Plain croissant reviews
        { author: 'Michelle T.', rating: 5, text: 'Best plain croissant in Brooklyn! 3-day lamination makes it incredibly flaky.', time: '2024-01-04' },
        { author: 'Andrew J.', rating: 5, text: 'The butter croissant is crispy on the outside, soft inside. Heaven!', time: '2024-01-01' },
        // Chocolate croissant reviews
        { author: 'Jessica W.', rating: 5, text: 'Pain au chocolat with Valrhona chocolate - rich, perfectly balanced, amazing.', time: '2024-01-03' },
        { author: 'Tyler R.', rating: 5, text: 'The chocolate croissant is phenomenal. Gooey chocolate, shattering pastry.', time: '2023-12-29' },
        // Almond croissant reviews
        { author: 'Heather K.', rating: 4, text: 'Almond croissant is good but quite rich. Beautiful presentation.', time: '2024-01-02' }
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
        // Plain croissant reviews
        { author: 'Catherine H.', rating: 5, text: 'Hidden gem! The plain croissant is perfection - shatteringly crisp, deeply buttery.', time: '2024-01-06' },
        { author: 'James P.', rating: 5, text: 'Butter croissant is phenomenal. Best kept secret in Tribeca.', time: '2023-12-29' },
        // Chocolate croissant reviews
        { author: 'Allison F.', rating: 5, text: 'The chocolate croissant is outstanding - quality dark chocolate, perfect texture.', time: '2024-01-04' },
        // Almond croissant reviews
        { author: 'Derek M.', rating: 5, text: 'Almond croissant is incredible - rich filling, toasted almonds, perfect balance.', time: '2024-01-02' }
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
        // Plain croissant reviews
        { author: 'Emma S.', rating: 5, text: 'French bakery in DUMBO. The butter croissant is amazing - perfectly flaky!', time: '2024-01-02' },
        { author: 'Ryan K.', rating: 4, text: 'Good plain croissant, great location near the bridge.', time: '2023-12-31' },
        // Chocolate croissant reviews
        { author: 'Monica L.', rating: 5, text: 'Pain au chocolat is excellent - two generous chocolate batons, perfectly baked.', time: '2024-01-04' },
        // Almond croissant reviews
        { author: 'Ian B.', rating: 5, text: 'The almond croissant is divine - fresh almond paste, beautifully toasted.', time: '2024-01-03' }
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
        // Plain croissant reviews
        { author: 'Patricia N.', rating: 4, text: 'Solid chain bakery. Plain croissant is always fresh and buttery.', time: '2024-01-05' },
        { author: 'George F.', rating: 4, text: 'Nice butter croissant for breakfast in the UES. Consistent.', time: '2023-12-27' },
        // Chocolate croissant reviews
        { author: 'Helen S.', rating: 4, text: 'Decent pain au chocolat - good for a chain, nothing exceptional.', time: '2024-01-03' },
        // Almond croissant reviews
        { author: 'Richard M.', rating: 3, text: 'Almond croissant was disappointing - too sweet, not enough almond flavor.', time: '2024-01-01' }
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
        // Plain croissant reviews
        { author: 'Victoria L.', rating: 4, text: 'Elegant patisserie with a solid butter croissant. Nice flaky layers.', time: '2024-01-04' },
        // Chocolate croissant reviews
        { author: 'Michael C.', rating: 5, text: 'The pain au chocolat is beautiful - dark chocolate, perfect pastry.', time: '2023-12-30' },
        // Almond croissant reviews
        { author: 'Sandra P.', rating: 5, text: 'Almond croissant is stunning - rich frangipane, topped with sliced almonds.', time: '2024-01-02' }
      ]
    },
    {
      source: 'yelp',
      yelpId: 'mock_yelp_8',
      name: 'Lafayette Grand Cafe',
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
        // Plain croissant reviews
        { author: 'Stephanie R.', rating: 4, text: 'Beautiful space with a good butter croissant. Great for brunch.', time: '2024-01-03' },
        // Chocolate croissant reviews
        { author: 'Daniel M.', rating: 5, text: 'The chocolate croissant with coffee is my perfect morning. Excellent quality.', time: '2024-01-01' },
        // Almond croissant reviews
        { author: 'Christina L.', rating: 4, text: 'Nice almond croissant though a bit pricey for the size.', time: '2023-12-28' }
      ]
    },
    {
      source: 'yelp',
      yelpId: 'mock_yelp_9',
      name: 'Supermoon Bakehouse',
      address: '120 Rivington St, New York, NY 10002',
      location: { lat: 40.7196, lng: -73.9852 },
      rating: 4.6,
      reviewCount: 1876,
      priceLevel: 2,
      isClosed: false,
      categories: ['Bakeries', 'Desserts'],
      neighborhood: 'Lower East Side',
      borough: 'Manhattan',
      photos: [],
      reviews: [
        // Plain croissant reviews
        { author: 'Ashley K.', rating: 5, text: 'The plain butter croissant is exceptional - honeycomb interior, crispy crust.', time: '2024-01-05' },
        { author: 'Brandon L.', rating: 5, text: 'Incredible croissant technique. Must try the plain one before the fancy flavors.', time: '2024-01-02' },
        // Chocolate croissant reviews
        { author: 'Natalie R.', rating: 4, text: 'Chocolate croissant is good but their specialty cruffins are the star.', time: '2024-01-04' },
        // Almond croissant reviews
        { author: 'Justin W.', rating: 5, text: 'Best almond croissant in the city! Twice-baked with house-made almond cream.', time: '2024-01-01' }
      ]
    },
    {
      source: 'yelp',
      yelpId: 'mock_yelp_10',
      name: 'Bourke Street Bakery',
      address: '68 Franklin St, Brooklyn, NY 11222',
      location: { lat: 40.7282, lng: -73.9485 },
      rating: 4.4,
      reviewCount: 1234,
      priceLevel: 2,
      isClosed: false,
      categories: ['Bakeries', 'Australian', 'Coffee & Tea'],
      neighborhood: 'Greenpoint',
      borough: 'Brooklyn',
      photos: [],
      reviews: [
        // Plain croissant reviews
        { author: 'Lindsay M.', rating: 5, text: 'Australian bakery with an incredible plain croissant. Crispy and buttery.', time: '2024-01-06' },
        { author: 'Chris T.', rating: 4, text: 'Great butter croissant in a hip Greenpoint location.', time: '2024-01-03' },
        // Chocolate croissant reviews
        { author: 'Megan F.', rating: 3, text: 'Chocolate croissant was mediocre - a bit dry, chocolate underwhelming.', time: '2024-01-02' },
        // Almond croissant reviews
        { author: 'Patrick O.', rating: 5, text: 'The almond croissant is phenomenal - rich almond cream, flaky pastry.', time: '2024-01-04' }
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
