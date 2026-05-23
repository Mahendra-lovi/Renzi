function SearchBar({
  query,
  onQueryChange,
  suggestions,
  onSuggestionSelect,
  category,
  categories,
  onCategoryChange,
  availability,
  onAvailabilityChange,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
  onClear,
  isSearching,
}) {
  const hasFilters =
    query.trim() ||
    category ||
    availability ||
    minPrice !== "" ||
    maxPrice !== "";

  return (
    <div style={styles.wrapper}>
      <div style={styles.searchRow}>
        <div style={styles.searchInputWrap}>
          <input
            placeholder="Search title, description, or #hashtags..."
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            style={styles.input}
          />

          {suggestions.length > 0 && query.trim().length >= 2 && (
            <div style={styles.suggestionBox}>
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  style={styles.suggestionItem}
                  onClick={() => onSuggestionSelect(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          style={styles.select}
        >
          <option value="">All Categories</option>
          {categories.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select
          value={availability}
          onChange={(e) => onAvailabilityChange(e.target.value)}
          style={styles.select}
        >
          <option value="">Any Availability</option>
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
        </select>

        <input
          type="number"
          min="0"
          value={minPrice}
          placeholder="Min ₹/day"
          onChange={(e) => onMinPriceChange(e.target.value)}
          style={styles.priceInput}
        />

        <input
          type="number"
          min="0"
          value={maxPrice}
          placeholder="Max ₹/day"
          onChange={(e) => onMaxPriceChange(e.target.value)}
          style={styles.priceInput}
        />

        <button
          type="button"
          style={styles.btn}
          onClick={onClear}
          disabled={!hasFilters}
        >
          Clear
        </button>
      </div>

      {isSearching && <span style={styles.searchingText}>Updating results...</span>}
    </div>
  );
}

export default SearchBar;

const styles = {
  wrapper: {
    marginBottom: 20,
    padding: 14,
    border: "1px solid rgba(209, 213, 219, 0.85)",
    borderRadius: 16,
    background: "linear-gradient(180deg, rgba(255,255,255,0.82) 0%, rgba(243,244,246,0.82) 100%)",
    backdropFilter: "blur(16px) saturate(140%)",
    boxShadow: "0 12px 24px rgba(17,24,39,0.1)",
  },
  searchRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 10,
    alignItems: "stretch",
  },
  searchInputWrap: {
    position: "relative",
    minWidth: 0,
    gridColumn: "span 1",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    outline: "none",
    background: "rgba(252,252,253,0.95)",
    height: 42,
    boxSizing: "border-box",
  },
  suggestionBox: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "calc(100% + 6px)",
    background: "rgba(248,249,251,0.96)",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    boxShadow: "0 10px 20px rgba(0,0,0,0.08)",
    zIndex: 20,
    maxHeight: 220,
    overflowY: "auto",
  },
  suggestionItem: {
    display: "block",
    width: "100%",
    textAlign: "left",
    border: "none",
    background: "transparent",
    padding: "10px 12px",
    cursor: "pointer",
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    background: "rgba(252,252,253,0.95)",
    minHeight: 42,
    boxSizing: "border-box",
  },
  priceInput: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    background: "rgba(252,252,253,0.95)",
    minHeight: 42,
    boxSizing: "border-box",
  },
  btn: {
    alignSelf: "stretch",
    width: "auto",
    padding: "10px 14px",
    cursor: "pointer",
    border: "none",
    borderRadius: 10,
    background: "linear-gradient(180deg, #4b5563 0%, #1f2937 100%)",
    color: "#fff",
    minWidth: 88,
    minHeight: 42,
    fontWeight: 700,
  },
  searchingText: {
    display: "inline-block",
    marginTop: 8,
    color: "#4b5563",
    fontSize: 13,
  },
};