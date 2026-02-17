import { useEffect, useState } from "react";
import api from "../services/api";

function OwnerRequests() {
  const [rentals, setRentals] = useState([]);

  useEffect(() => {
    const fetchRentals = async () => {
      try {
        const res = await api.get("/rentals/owner-rentals");
        setRentals(res.data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchRentals();
  }, []);

const approve = async (id) => {
  try {
    const res = await api.patch(`/rentals/approve/${id}`);

    setRentals(prev =>
      prev.map(r => r._id === id ? res.data.rental : r)
    );
  } catch (err) {
    console.error(err);
  }
};

const activate = async (id) => {
  try {
    const res = await api.patch(`/rentals/activate/${id}`);

    setRentals(prev =>
      prev.map(r => r._id === id ? res.data.rental : r)
    );
  } catch (err) {
    console.error(err);
  }
};

  return (
    <div style={{ padding: 24 }}>
      <h1>Rental Requests (My Items)</h1>

      {rentals.length === 0 && <p>No requests yet.</p>}

      <div style={styles.grid}>
        {rentals.map((rental) => (
          <div key={rental._id} style={styles.card}>
            <img
              src={rental.item?.images?.[0] || "https://via.placeholder.com/300"}
              style={styles.image}
            />

            <h3>{rental.item?.title}</h3>
            <p>Renter: {rental.renter?.email}</p>
            <p>Status: {rental.status}</p>

            {rental.status === "requested" && (
              <button style={styles.approveBtn} onClick={() => approve(rental._id)}>
                Approve
              </button>
            )}

            {rental.status === "approved" && (
              <button style={styles.activateBtn} onClick={() => activate(rental._id)}>
                Activate Rental
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default OwnerRequests;

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
  approveBtn: {
    marginTop: 10,
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    padding: 8,
    borderRadius: 6,
    cursor: "pointer",
  },
  activateBtn: {
    marginTop: 10,
    background: "#10b981",
    color: "#fff",
    border: "none",
    padding: 8,
    borderRadius: 6,
    cursor: "pointer",
  },
};