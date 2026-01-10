import React, { useState } from 'react';

function StarRating({ rating, size = 'small' }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <span className="star-rating">
      {'★'.repeat(fullStars)}
      {hasHalfStar && '½'}
      {'☆'.repeat(emptyStars)}
    </span>
  );
}

function ReviewCard({ review }) {
  return (
    <div className="review-card">
      <div className="review-header">
        <span className="review-author">{review.author}</span>
        <span className="review-rating">
          <span className="star">★</span> {review.rating}
        </span>
      </div>
      <p className="review-text">{review.text}</p>
      {review.time && (
        <p className="review-time">{review.time}</p>
      )}
    </div>
  );
}

function ShopCard({ shop }) {
  const [showReviews, setShowReviews] = useState(false);

  const getRankClass = (rank) => {
    if (rank === 1) return 'gold';
    if (rank === 2) return 'silver';
    if (rank === 3) return 'bronze';
    return '';
  };

  const getSourceData = (sourceName) => {
    return shop.sources?.find(s => s.source === sourceName);
  };

  const googleData = getSourceData('google');
  const yelpData = getSourceData('yelp');

  const totalReviews = shop.sources?.reduce((sum, s) =>
    sum + (s.reviews?.length || 0), 0
  ) || 0;

  return (
    <article className="shop-card">
      <div className="shop-header">
        <div className={`shop-rank ${getRankClass(shop.rank)}`}>
          #{shop.rank}
        </div>
        <div className="shop-info">
          <h3 className="shop-name">{shop.name}</h3>
          <p className="shop-address">{shop.address}</p>
          <div className="shop-location-tags">
            {shop.neighborhood && (
              <span className="location-tag">{shop.neighborhood}</span>
            )}
            {shop.borough && (
              <span className="location-tag">{shop.borough}</span>
            )}
          </div>
        </div>
      </div>

      <div className="shop-scores">
        <div className="score-item">
          <div className="score-label">Cumulative Score</div>
          <div className="score-value cumulative">
            {shop.cumulativeScore?.toFixed(2) || 'N/A'}
          </div>
        </div>
        <div className="score-item">
          <div className="score-label">Avg Rating</div>
          <div className="score-value">
            <span className="star">★</span> {shop.averageRating?.toFixed(1) || 'N/A'}
          </div>
        </div>
        <div className="score-item">
          <div className="score-label">Total Reviews</div>
          <div className="score-value">
            {shop.totalReviewCount?.toLocaleString() || 0}
          </div>
        </div>
        <div className="score-item">
          <div className="score-label">Sources</div>
          <div className="score-value">
            {shop.sourceCount || 0}
          </div>
        </div>
      </div>

      <div className="sources">
        <h4 className="sources-title">Ratings by Source</h4>
        <div className="source-badges">
          {googleData && (
            <div className="source-badge google">
              <span>Google Maps</span>
              <div className="source-rating">
                <span className="star">★</span>
                <span>{googleData.rating?.toFixed(1)}</span>
                <span>({googleData.reviewCount?.toLocaleString()})</span>
              </div>
            </div>
          )}
          {yelpData && (
            <div className="source-badge yelp">
              <span>Yelp</span>
              <div className="source-rating">
                <span className="star">★</span>
                <span>{yelpData.rating?.toFixed(1)}</span>
                <span>({yelpData.reviewCount?.toLocaleString()})</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {totalReviews > 0 && (
        <div className="reviews-section">
          <button
            className="reviews-toggle"
            onClick={() => setShowReviews(!showReviews)}
          >
            {showReviews ? '▼' : '▶'} {showReviews ? 'Hide' : 'Show'} Reviews ({totalReviews})
          </button>

          {showReviews && (
            <div className="reviews-container">
              {googleData?.reviews?.length > 0 && (
                <div className="reviews-source">
                  <div className="reviews-source-header google">
                    <span>📍</span> Google Maps Reviews
                  </div>
                  {googleData.reviews.map((review, idx) => (
                    <ReviewCard key={`google-${idx}`} review={review} />
                  ))}
                </div>
              )}

              {yelpData?.reviews?.length > 0 && (
                <div className="reviews-source">
                  <div className="reviews-source-header yelp">
                    <span>🔴</span> Yelp Reviews
                  </div>
                  {yelpData.reviews.map((review, idx) => (
                    <ReviewCard key={`yelp-${idx}`} review={review} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export default ShopCard;
