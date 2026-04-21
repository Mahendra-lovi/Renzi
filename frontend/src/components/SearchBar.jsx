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
            placeholder="Search title, description, or tags..."
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
    padding: 12,
    border: "1px solid #d1d5db",
    borderRadius: 12,
    background: "#eef0f3",
  },
  searchRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "start",
  },
  searchInputWrap: {
    position: "relative",
    flex: "2 1 320px",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    outline: "none",
    background: "#fcfcfd",
  },
  suggestionBox: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "calc(100% + 6px)",
    background: "#f8f9fb",
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
    background: "#f8f9fb",
    padding: "10px 12px",
    cursor: "pointer",
  },
  select: {
    flex: "1 1 200px",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    background: "#fcfcfd",
  },
  priceInput: {
    flex: "1 1 140px",
    minWidth: 120,
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    background: "#fcfcfd",
  },
  btn: {
    flex: "0 0 auto",
    padding: "10px 14px",
    cursor: "pointer",
    border: "none",
    borderRadius: 8,
    background: "#374151",
    color: "#fff",
    minWidth: 80,
  },
  searchingText: {
    display: "inline-block",
    marginTop: 8,
    color: "#4b5563",
    fontSize: 13,
  },
};