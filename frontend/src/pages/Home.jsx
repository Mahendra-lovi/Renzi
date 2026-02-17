import { useEffect, useState } from "react";
import api from "../services/api";
import ItemCard from "../components/ItemCard";

function Home() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/items")
      .then((res) => {
        setItems(res.data);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <h2 style={{ padding: 20 }}>Loading items...</h2>;
  }

  if (items.length === 0) {
    return <h2 style={{ padding: 20 }}>No items yet 😢</h2>;
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Explore Rentals</h1>

      <div style={styles.grid}>
        {items.map((item) => (
          <ItemCard key={item._id} item={item} />
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
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 20,
  },
};