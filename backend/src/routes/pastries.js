const express = require('express');
const router = express.Router();
const aggregator = require('../services/aggregator');

// In-memory cache for results
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Generate cache key from request params
 */
function getCacheKey(pastryType, location) {
  return `${pastryType || 'croissant'}_${location || 'all'}`;
}

/**
 * GET /api/pastries/search
 * Search for pastry shops with optional filters
 *
 * Query params:
 *   - pastryType: 'croissant' | 'chocolate croissant' (default: 'croissant')
 *   - location: neighborhood or borough name (optional)
 */
router.get('/search', async (req, res, next) => {
  try {
    const { pastryType = 'croissant', location } = req.query;

    console.log(`Search request: pastryType=${pastryType}, location=${location || 'all'}`);

    // Check cache
    const cacheKey = getCacheKey(pastryType, location);
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('Returning cached results');
      return res.json({
        success: true,
        data: cached.data,
        meta: {
          pastryType,
          location: location || 'All NYC',
          totalResults: cached.data.length,
          cached: true,
          cacheAge: Math.round((Date.now() - cached.timestamp) / 1000)
        }
      });
    }

    // Fetch fresh data
    const results = await aggregator.aggregatePastryShops(pastryType, location);

    // Update cache
    cache.set(cacheKey, {
      data: results,
      timestamp: Date.now()
    });

    res.json({
      success: true,
      data: results,
      meta: {
        pastryType,
        location: location || 'All NYC',
        totalResults: results.length,
        cached: false
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pastries/filters
 * Get available filter options
 */
router.get('/filters', (req, res) => {
  const filters = aggregator.getFilterOptions();
  res.json({
    success: true,
    data: filters
  });
});

/**
 * GET /api/pastries/shop/:name
 * Get detailed info for a specific shop
 */
router.get('/shop/:name', async (req, res, next) => {
  try {
    const { name } = req.params;
    const { pastryType = 'croissant' } = req.query;

    // Search for the shop
    const results = await aggregator.aggregatePastryShops(pastryType);

    const shop = results.find(s =>
      s.name.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(s.name.toLowerCase())
    );

    if (!shop) {
      return res.status(404).json({
        success: false,
        error: 'Shop not found'
      });
    }

    res.json({
      success: true,
      data: shop
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pastries/top
 * Get top rated pastry shops
 */
router.get('/top', async (req, res, next) => {
  try {
    const { pastryType = 'croissant', limit = 5 } = req.query;

    const results = await aggregator.aggregatePastryShops(pastryType);
    const topResults = results.slice(0, parseInt(limit, 10));

    res.json({
      success: true,
      data: topResults,
      meta: {
        pastryType,
        limit: parseInt(limit, 10)
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/pastries/cache
 * Clear the cache (admin endpoint)
 */
router.delete('/cache', (req, res) => {
  cache.clear();
  res.json({
    success: true,
    message: 'Cache cleared'
  });
});

module.exports = router;
