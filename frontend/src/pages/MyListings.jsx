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
    <div style={{ padding: 24 }}>
      <h1>My Listings</h1>

      {items.length === 0 && <p>You haven't created any items yet.</p>}

      <div style={styles.grid}>
        {items.map((item) => (
          <div key={item._id} style={styles.card}>
            <img
              src={item.images?.[0] || "https://via.placeholder.com/300"}
              style={styles.image}
            />
            <h3>{item.title}</h3>
            <p>₹{item.pricePerDay}/day</p>

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
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
    gap: 20,
    marginTop: 20,
  },
  card: {
    background: "#fff",
    padding: 16,
    borderRadius: 12,
    boxShadow: "0 8px 25px rgba(0,0,0,0.08)",
  },
  image: {
    width: "100%",
    height: 140,
    objectFit: "cover",
    borderRadius: 8,
  },
  deleteBtn: {
    marginTop: 10,
    background: "#ef4444",
    color: "#fff",
    border: "none",
    padding: 8,
    borderRadius: 6,
    cursor: "pointer",
  },
};