import { useEffect, useState } from "react";
import api from "../services/api";
import ItemCard from "../components/ItemCard";
import SearchBar from "../components/SearchBar";

function Home() {
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
  const [nearbyItems, setNearbyItems] = useState([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyMessage, setNearbyMessage] = useState("");

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

  const findNearbyRentals = () => {
    if (!navigator.geolocation) {
      setNearbyMessage("Geolocation is not supported by this browser.");
      return;
    }

    setNearbyLoading(true);
    setNearbyMessage("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await api.get("/items/nearby", {
            params: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              radiusKm: 15,
            },
          });

          setNearbyItems(res.data);
          if (res.data.length === 0) {
            setNearbyMessage("No nearby rentals found within 15 km.");
          }
        } catch (err) {
          setNearbyMessage(err.response?.data?.message || "Failed to load nearby rentals");
        } finally {
          setNearbyLoading(false);
        }
      },
      () => {
        setNearbyLoading(false);
        setNearbyMessage("Location permission denied. Enable location to see nearby rentals.");
      }
    );
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

      <div style={styles.nearbyHeader}>
        <h2 style={styles.nearbyTitle}>Nearby Rentals</h2>
        <button style={styles.nearbyBtn} onClick={findNearbyRentals} disabled={nearbyLoading}>
          {nearbyLoading ? "Finding..." : "Find Nearby"}
        </button>
      </div>

      {nearbyMessage && <p style={styles.nearbyMessage}>{nearbyMessage}</p>}

      {nearbyItems.length > 0 && (
        <div style={styles.grid}>
          {nearbyItems.map((item) => (
            <ItemCard key={`nearby-${item._id}`} item={item} onTagClick={handleTagClick} />
          ))}
        </div>
      )}

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
    padding: 24,
  },
  heading: {
    marginBottom: 20,
  },
  status: {
    marginBottom: 16,
    color: "#4b5563"
  },
  emptyState: {
    marginBottom: 12,
    color: "#111827"
  },
  nearbyHeader: {
    marginTop: 20,
    marginBottom: 12,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  nearbyTitle: {
    margin: 0,
    color: "#1f2937",
  },
  nearbyBtn: {
    border: "none",
    borderRadius: 8,
    background: "#4b5563",
    color: "#fff",
    padding: "8px 12px",
    cursor: "pointer",
  },
  nearbyMessage: {
    marginBottom: 14,
    color: "#4b5563",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 20,
  },
};