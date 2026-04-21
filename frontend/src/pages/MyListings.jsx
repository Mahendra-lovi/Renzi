import { useEffect, useState } from "react";
import api from "../services/api";

function MyListings() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await api.get("/items/my-items");
        setItems(res.data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchItems();
  }, []);

const handleDelete = async (id) => {
  if (!window.confirm("Delete this item?")) return;

  try {
    await api.delete(`/items/${id}`);

    // update state locally instead of refetching
    setItems((prev) => prev.filter((item) => item._id !== id));
  } catch (err) {
    console.error(err);
  }
};

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>My Listings</h1>

      {items.length === 0 && <p style={styles.empty}>You have not created any items yet.</p>}

      <div style={styles.grid}>
        {items.map((item) => (
          <div key={item._id} style={styles.card}>
            <img
              src={item.images?.[0] || "https://via.placeholder.com/300"}
              style={styles.image}
            />
            <div style={styles.meta}>
              <h3 style={styles.itemTitle}>{item.title}</h3>
              <p style={styles.price}>INR {item.pricePerDay}/day</p>
              {item.tags?.length > 0 && (
                <div style={styles.tags}>
                  {item.tags.slice(0, 4).map((tag) => (
                    <span key={tag} style={styles.tag}>{tag}</span>
                  ))}
                </div>
              )}
            </div>

            <button
              style={styles.deleteBtn}
              onClick={() => handleDelete(item._id)}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MyListings;

const styles = {
  container: {
    padding: 24,
  },
  title: {
    marginBottom: 12,
    color: "#1f2937",
  },
  empty: {
    color: "#4b5563",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
    gap: 20,
    marginTop: 20,
  },
  card: {
    background: "#f8f9fb",
    padding: 12,
    borderRadius: 12,
    border: "1px solid #d1d5db",
    boxShadow: "0 6px 16px rgba(17,24,39,0.08)",
  },
  image: {
    width: "100%",
    height: 150,
    objectFit: "cover",
    borderRadius: 10,
  },
  meta: {
    marginTop: 10,
  },
  itemTitle: {
    margin: 0,
    color: "#111827",
  },
  price: {
    margin: "6px 0 0",
    color: "#374151",
  },
  tags: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  tag: {
    background: "#e5e7eb",
    color: "#374151",
    fontSize: 12,
    padding: "3px 8px",
    borderRadius: 999,
  },
  deleteBtn: {
    marginTop: 10,
    background: "#991b1b",
    color: "#fff",
    border: "none",
    padding: "8px 10px",
    borderRadius: 6,
    cursor: "pointer",
  },
};