import React from 'react';

function Filters({
  filters,
  selectedPastryType,
  selectedBorough,
  selectedNeighborhood,
  neighborhoods,
  onPastryTypeChange,
  onBoroughChange,
  onNeighborhoodChange,
  onSearch,
  loading
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <section className="filters">
      <h2 className="filters-title">Find Your Perfect Pastry</h2>
      <form onSubmit={handleSubmit}>
        <div className="filter-row">
          <div className="filter-group">
            <label className="filter-label" htmlFor="pastryType">
              Pastry Type
            </label>
            <select
              id="pastryType"
              className="filter-select"
              value={selectedPastryType}
              onChange={(e) => onPastryTypeChange(e.target.value)}
            >
              {filters?.pastryTypes?.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              )) || (
                <>
                  <option value="croissant">Plain Croissant</option>
                  <option value="chocolate croissant">Chocolate Croissant</option>
                </>
              )}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label" htmlFor="borough">
              Borough
            </label>
            <select
              id="borough"
              className="filter-select"
              value={selectedBorough}
              onChange={(e) => onBoroughChange(e.target.value)}
            >
              <option value="">All NYC</option>
              {filters?.boroughs?.map((borough) => (
                <option key={borough.value} value={borough.value}>
                  {borough.label}
                </option>
              )) || (
                <>
                  <option value="manhattan">Manhattan</option>
                  <option value="brooklyn">Brooklyn</option>
                  <option value="queens">Queens</option>
                  <option value="bronx">Bronx</option>
                  <option value="staten island">Staten Island</option>
                </>
              )}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label" htmlFor="neighborhood">
              Neighborhood
            </label>
            <select
              id="neighborhood"
              className="filter-select"
              value={selectedNeighborhood}
              onChange={(e) => onNeighborhoodChange(e.target.value)}
              disabled={!selectedBorough || neighborhoods.length === 0}
            >
              <option value="">
                {selectedBorough ? 'All neighborhoods' : 'Select a borough first'}
              </option>
              {neighborhoods.map((hood) => (
                <option key={hood} value={hood.toLowerCase()}>
                  {hood}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="search-btn"
            disabled={loading}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>
    </section>
  );
}

export default Filters;
