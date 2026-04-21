import { useEffect, useState } from "react";
import api from "../services/api";

function OwnerRequests() {
  const [rentals, setRentals] = useState([]);
  const [message, setMessage] = useState("");

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
    setMessage("");
    const res = await api.patch(`/rentals/approve/${id}`);

    setRentals(prev =>
      prev.map(r =>
        r._id === id
          ? { ...r, ...res.data.rental, agreement: res.data.agreement }
          : r
      )
    );
  } catch (err) {
    setMessage(err.response?.data?.message || "Failed to approve rental");
  }
};

const signAgreementAsOwner = async (id) => {
  try {
    setMessage("");
    const res = await api.patch(`/rentals/${id}/sign-owner`);
    setRentals((prev) =>
      prev.map((r) => (r._id === id ? { ...r, agreement: res.data.agreement } : r))
    );
  } catch (err) {
    setMessage(err.response?.data?.message || "Failed to sign agreement");
  }
};

const activate = async (id) => {
  try {
    setMessage("");
    const res = await api.patch(`/rentals/activate/${id}`);

    setRentals(prev =>
      prev.map(r =>
        r._id === id
          ? { ...r, ...res.data.rental, agreement: res.data.agreement || r.agreement }
          : r
      )
    );
  } catch (err) {
    setMessage(err.response?.data?.message || "Failed to activate rental");
  }
};

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Rental Requests (My Items)</h1>
      {message && <p style={styles.message}>{message}</p>}

      {rentals.length === 0 && <p style={styles.empty}>No requests yet.</p>}

      <div style={styles.grid}>
        {rentals.map((rental) => (
          <div key={rental._id} style={styles.card}>
            <img
              src={rental.item?.images?.[0] || "https://via.placeholder.com/300"}
              style={styles.image}
            />

            <h3 style={styles.itemTitle}>{rental.item?.title}</h3>
            <p style={styles.meta}>Renter: {rental.renter?.email}</p>
            <p style={styles.meta}>Status: {rental.status}</p>
            {rental.agreement && (
              <p style={styles.agreementMeta}>
                Agreement: {rental.agreement.status} | Owner signed: {rental.agreement.ownerSigned ? "Yes" : "No"} | Renter signed: {rental.agreement.renterSigned ? "Yes" : "No"}
              </p>
            )}

            <div style={styles.actions}>
              {rental.status === "requested" && (
                <button style={styles.approveBtn} onClick={() => approve(rental._id)}>
                  Approve
                </button>
              )}

              {rental.status === "approved" && rental.agreement && !rental.agreement.ownerSigned && (
                <button style={styles.signBtn} onClick={() => signAgreementAsOwner(rental._id)}>
                  Sign Agreement
                </button>
              )}

              {rental.status === "approved" && (
                <button
                  style={styles.activateBtn}
                  onClick={() => activate(rental._id)}
                  disabled={!(rental.agreement?.ownerSigned && rental.agreement?.renterSigned)}
                >
                  Activate Rental
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default OwnerRequests;

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
    gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))",
    gap: 20,
    marginTop: 20,
  },
  card: {
    background: "#f8f9fb",
    padding: 16,
    borderRadius: 12,
    border: "1px solid #d1d5db",
    boxShadow: "0 6px 16px rgba(17,24,39,0.08)",
  },
  image: {
    width: "100%",
    height: 140,
    objectFit: "cover",
    borderRadius: 8,
  },
  itemTitle: {
    margin: "10px 0 4px",
    color: "#111827",
  },
  meta: {
    margin: "2px 0",
    color: "#4b5563",
  },
  actions: {
    marginTop: 10,
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  approveBtn: {
    background: "#4b5563",
    color: "#fff",
    border: "none",
    padding: "8px 10px",
    borderRadius: 6,
    cursor: "pointer",
  },
  signBtn: {
    background: "#6b7280",
    color: "#fff",
    border: "none",
    padding: "8px 10px",
    borderRadius: 6,
    cursor: "pointer",
  },
  activateBtn: {
    background: "#374151",
    color: "#fff",
    border: "none",
    padding: "8px 10px",
    borderRadius: 6,
    cursor: "pointer",
  },
  message: {
    marginTop: 10,
    color: "#b91c1c",
  },
  agreementMeta: {
    color: "#4b5563",
    fontSize: 13,
  },
};