import { useEffect, useState } from "react";
import api from "../services/api";

function MyRentals() {
  const [rentals, setRentals] = useState([]);

  useEffect(() => {
    const fetchRentals = async () => {
      const res = await api.get("/rentals/my-rentals");
      setRentals(res.data);
    };

    fetchRentals();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case "requested": return "#f59e0b";
      case "approved": return "#3b82f6";
      case "active": return "#10b981";
      case "returned": return "#6b7280";
      default: return "#000";
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>My Rentals</h1>

      {rentals.length === 0 && <p>No rentals yet.</p>}

      <div style={styles.grid}>
        {rentals.map((rental) => (
          <div key={rental._id} style={styles.card}>
            <img
              src={rental.item?.images?.[0] || "https://via.placeholder.com/300"}
              style={styles.image}
            />

            <h3>{rental.item?.title}</h3>
            <p>₹{rental.item?.pricePerDay}/day</p>
            <p>
              {new Date(rental.startDate).toDateString()} →{" "}
              {new Date(rental.endDate).toDateString()}
            </p>

            <span
              style={{
                ...styles.status,
                background: getStatusColor(rental.status),
              }}
            >
              {rental.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MyRentals;

const styles = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))",
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
  status: {
    display: "inline-block",
    marginTop: 10,
    padding: "4px 10px",
    borderRadius: 6,
    color: "#fff",
    fontSize: 12,
    textTransform: "capitalize",
  },
};