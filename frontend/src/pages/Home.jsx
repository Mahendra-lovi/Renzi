import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import ItemCard from "../components/ItemCard";
import SearchBar from "../components/SearchBar";

function Home() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [category, setCategory] = useState("");
  const [availability, setAvailability] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [categories, setCategories] = useState([]);

  const hasFilters =
    query.trim() ||
    category.trim() ||
    availability ||
    minPrice !== "" ||
    maxPrice !== "";

  const handleTagClick = (tag) => {
    setQuery(tag);
  };

  const clearFilters = () => {
    setQuery("");
    setCategory("");
    setAvailability("");
    setMinPrice("");
    setMaxPrice("");
    setSuggestions([]);
  };

  const openMapView = () => {
    navigate("/map");
  };

  useEffect(() => {
    api
      .get("/items")
      .then((res) => {
        setItems(res.data);

        const uniqueCategories = Array.from(
          new Set(
            res.data
              .map((item) => item.category)
              .filter(Boolean)
              .map((value) => value.trim())
          )
        ).sort((a, b) => a.localeCompare(b));

        setCategories(uniqueCategories);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => setLoadingInitial(false));
  }, []);

  useEffect(() => {
    if (loadingInitial) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      try {
        setLoadingSearch(true);
        const params = {};

        const trimmedQuery = query.trim();
        if (trimmedQuery) params.q = trimmedQuery;

        if (category) params.category = category;
        if (availability) params.availability = availability;
        if (minPrice !== "") params.minPrice = minPrice;
        if (maxPrice !== "") params.maxPrice = maxPrice;

        const res = await api.get("/items/search", {
          params,
          signal: controller.signal
        });

        setItems(res.data);
      } catch (err) {
        if (err.name !== "CanceledError" && err.code !== "ERR_CANCELED") {
          console.error(err);
        }
      } finally {
        setLoadingSearch(false);
      }
    }, 350);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query, category, availability, minPrice, maxPrice, loadingInitial]);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      try {
        const res = await api.get("/items/search/suggestions", {
          params: { q: trimmedQuery },
          signal: controller.signal
        });
        setSuggestions(res.data);
      } catch (err) {
        if (err.name !== "CanceledError" && err.code !== "ERR_CANCELED") {
          console.error(err);
        }
      }
    }, 220);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query]);

  if (loadingInitial) {
    return <h2 style={{ padding: 20 }}>Loading items...</h2>;
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Explore Rentals</h1>

      <SearchBar
        query={query}
        onQueryChange={setQuery}
        suggestions={suggestions}
        onSuggestionSelect={(value) => {
          setQuery(value);
          setSuggestions([]);
        }}
        category={category}
        categories={categories}
        onCategoryChange={setCategory}
        availability={availability}
        onAvailabilityChange={setAvailability}
        minPrice={minPrice}
        maxPrice={maxPrice}
        onMinPriceChange={setMinPrice}
        onMaxPriceChange={setMaxPrice}
        onClear={clearFilters}
        isSearching={loadingSearch}
      />

      <div style={styles.mapActionRow}>
        <button type="button" style={styles.mapButton} onClick={openMapView}>
          <span style={styles.mapIcon} aria-hidden="true">🗺️</span>
          <span style={styles.mapButtonText}>Open Map View</span>
        </button>
        <p style={styles.mapHint}>View listings around your current location on an interactive map.</p>
      </div>

      {loadingSearch && <p style={styles.status}>Searching...</p>}

      {!loadingSearch && items.length === 0 && (
        <h2 style={styles.emptyState}>
          {hasFilters ? "No items match your search." : "No items yet."}
        </h2>
      )}

      <div style={styles.grid}>
        {items.map((item) => (
          <ItemCard key={item._id} item={item} onTagClick={handleTagClick} />
        ))}
      </div>
    </div>
  );
}

export default Home;

const styles = {
  container: {
    padding: "10px 6px 24px",
    maxWidth: 1200,
    margin: "0 auto",
  },
  heading: {
    margin: "2px 0 18px",
    textAlign: "center",
    color: "#111827",
    fontSize: 34,
    letterSpacing: 0.2,
    textShadow: "0 1px 0 rgba(255,255,255,0.72)",
  },
  status: {
    marginBottom: 16,
    color: "#4b5563"
  },
  emptyState: {
    marginBottom: 12,
    color: "#111827"
  },
  mapActionRow: {
    marginTop: 16,
    marginBottom: 20,
    display: "flex",
    alignItems: "center",
    gap: 12,
    justifyContent: "center",
    flexDirection: "column",
    textAlign: "center",
    border: "1px solid rgba(209,213,219,0.85)",
    borderRadius: 16,
    background: "linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(243,244,246,0.8) 100%)",
    backdropFilter: "blur(16px) saturate(140%)",
    padding: "16px 14px",
    boxShadow: "0 14px 28px rgba(17,24,39,0.08), inset 0 1px 0 rgba(255,255,255,0.4)",
  },
  mapButton: {
    border: "1px solid rgba(209,213,219,0.85)",
    borderRadius: 999,
    background: "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(243,244,246,0.96) 100%)",
    color: "#111827",
    padding: "14px 18px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    boxShadow: "0 10px 24px rgba(17, 24, 39, 0.14), inset 0 1px 0 rgba(255,255,255,0.45)",
    fontWeight: 700,
  },
  mapIcon: {
    fontSize: 20,
    lineHeight: 1,
  },
  mapButtonText: {
    fontSize: 15,
  },
  mapHint: {
    margin: 0,
    color: "#4b5563",
    fontSize: 14,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 20,
    alignItems: "stretch",
  },
};