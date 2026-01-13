import React, { useState } from 'react';

function ReviewCard({ review, isEditorial = false }) {
  return (
    <div className={`review-card ${isEditorial ? 'editorial' : ''}`}>
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
      {review.url && isEditorial && (
        <a href={review.url} target="_blank" rel="noopener noreferrer" className="review-link">
          Read full article →
        </a>
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

  // Get sources by type
  const googleData = shop.sources?.find(s => s.source === 'google');
  const yelpData = shop.sources?.find(s => s.source === 'yelp');
  const editorialSources = shop.sources?.filter(s => s.sourceType === 'editorial') || [];

  // Count relevant reviews (filtered ones that mention the pastry)
  const relevantReviewCount = shop.relevantReviewCount || 0;

  // Total reviews shown (relevant ones only)
  const totalReviewsShown = shop.sources?.reduce((sum, s) =>
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
            {shop.editorialMentions > 0 && (
              <span className="location-tag editorial-tag">
                📰 {shop.editorialMentions} Press Mention{shop.editorialMentions > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="shop-scores">
        <div className="score-item">
          <div className="score-label">Pastry Score</div>
          <div className="score-value cumulative">
            {shop.pastryScore?.toFixed(2) || shop.cumulativeScore?.toFixed(2) || 'N/A'}
          </div>
        </div>
        <div className="score-item">
          <div className="score-label">Relevant Reviews</div>
          <div className="score-value">
            {relevantReviewCount}
          </div>
        </div>
        <div className="score-item">
          <div className="score-label">Avg Rating</div>
          <div className="score-value">
            <span className="star">★</span> {shop.averageRating?.toFixed(1) || 'N/A'}
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
          {editorialSources.length > 0 && (
            <div className="source-badge editorial">
              <span>Press</span>
              <div className="source-rating">
                <span>📰</span>
                <span>{editorialSources.length} article{editorialSources.length > 1 ? 's' : ''}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {totalReviewsShown > 0 && (
        <div className="reviews-section">
          <button
            className="reviews-toggle"
            onClick={() => setShowReviews(!showReviews)}
          >
            {showReviews ? '▼' : '▶'} {showReviews ? 'Hide' : 'Show'} Relevant Reviews ({totalReviewsShown})
          </button>

          {showReviews && (
            <div className="reviews-container">
              {/* Editorial/Press mentions first */}
              {editorialSources.length > 0 && (
                <div className="reviews-source">
                  <div className="reviews-source-header editorial">
                    <span>📰</span> Press & Publications
                  </div>
                  {editorialSources.map((source, idx) =>
                    source.reviews?.map((review, ridx) => (
                      <ReviewCard
                        key={`editorial-${idx}-${ridx}`}
                        review={review}
                        isEditorial={true}
                      />
                    ))
                  )}
                </div>
              )}

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

              {totalReviewsShown === 0 && (
                <p className="no-reviews">
                  No reviews specifically mentioning this pastry type.
                  The score is based on the shop's general ratings.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {totalReviewsShown === 0 && (
        <div className="no-specific-reviews">
          <p>No reviews specifically mention this pastry type. Score based on general ratings.</p>
        </div>
      )}
    </article>
  );
}

export default ShopCard;
