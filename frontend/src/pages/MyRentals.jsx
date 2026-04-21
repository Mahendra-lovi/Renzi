import { useEffect, useState } from "react";
import api from "../services/api";

function MyRentals() {
  const [rentals, setRentals] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchRentals = async () => {
      try {
        const res = await api.get("/rentals/my-rentals");
        setRentals(res.data);
      } catch (err) {
        setMessage(err.response?.data?.message || "Failed to load rentals");
      }
    };

    fetchRentals();
  }, []);

  const updateRentalInState = (id, updater) => {
    setRentals((prev) => prev.map((r) => (r._id === id ? updater(r) : r)));
  };

  const signAgreement = async (id) => {
    try {
      setMessage("");
      const res = await api.patch(`/rentals/${id}/sign-renter`);
      updateRentalInState(id, (r) => ({ ...r, agreement: res.data.agreement }));
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to sign agreement");
    }
  };

  const returnItem = async (id) => {
    try {
      setMessage("");
      const res = await api.patch(`/rentals/return/${id}`);
      updateRentalInState(id, (r) => ({
        ...r,
        ...res.data.rental,
        agreement: res.data.agreement || r.agreement
      }));
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to return item");
    }
  };

  const cancelRental = async (id) => {
    try {
      setMessage("");
      const res = await api.patch(`/rentals/cancel/${id}`);
      updateRentalInState(id, (r) => ({ ...r, ...res.data.rental }));
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to cancel rental");
    }
  };

  const disputeRental = async (id) => {
    try {
      setMessage("");

      const incidentTypeInput = window.prompt(
        "Dispute type (not_returned/property_damage/harassment/violent_behavior/payment_issue/other)",
        "other"
      );
      if (incidentTypeInput === null) return;

      const description = window.prompt("Briefly describe the issue", "");
      if (description === null) return;

      const severityInput = window.prompt(
        "Severity (low/medium/high/critical)",
        "medium"
      );
      if (severityInput === null) return;

      const res = await api.patch(`/rentals/dispute/${id}`, {
        incidentType: incidentTypeInput,
        incidentDescription: description,
        severity: severityInput
      });

      updateRentalInState(id, (r) => ({ ...r, ...res.data.rental }));
      setMessage("Dispute raised and case file created for admin review.");
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to raise dispute");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "requested": return "#f59e0b";
      case "approved": return "#6b7280";
      case "active": return "#374151";
      case "returned": return "#6b7280";
      case "disputed": return "#991b1b";
      default: return "#000";
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>My Rentals</h1>
      {message && <p style={styles.message}>{message}</p>}

      {rentals.length === 0 && <p style={styles.empty}>No rentals yet.</p>}

      <div style={styles.grid}>
        {rentals.map((rental) => (
          <div key={rental._id} style={styles.card}>
            <img
              src={rental.item?.images?.[0] || "https://via.placeholder.com/300"}
              style={styles.image}
            />

            <h3>{rental.item?.title}</h3>
            <p style={styles.meta}>INR {rental.item?.pricePerDay}/day</p>
            <p style={styles.meta}>
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

            {rental.agreement && (
              <p style={styles.agreementMeta}>
                Agreement: {rental.agreement.status} | Owner signed: {rental.agreement.ownerSigned ? "Yes" : "No"} | You signed: {rental.agreement.renterSigned ? "Yes" : "No"}
              </p>
            )}

            <div style={styles.actions}>
              {rental.status === "approved" && rental.agreement && !rental.agreement.renterSigned && (
                <button style={styles.buttonMuted} onClick={() => signAgreement(rental._id)}>
                  Sign Agreement
                </button>
              )}

              {rental.status === "active" && (
                <button style={styles.buttonPrimary} onClick={() => returnItem(rental._id)}>
                  Return Item
                </button>
              )}

              {["requested", "approved"].includes(rental.status) && (
                <button style={styles.buttonDanger} onClick={() => cancelRental(rental._id)}>
                  Cancel
                </button>
              )}

              {["approved", "active"].includes(rental.status) && (
                <button style={styles.buttonDanger} onClick={() => disputeRental(rental._id)}>
                  Raise Dispute
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MyRentals;

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
  meta: {
    margin: "4px 0",
    color: "#4b5563",
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
  agreementMeta: {
    marginTop: 10,
    color: "#4b5563",
    fontSize: 13,
  },
  actions: {
    marginTop: 10,
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  buttonPrimary: {
    border: "none",
    borderRadius: 6,
    background: "#374151",
    color: "#fff",
    padding: "7px 10px",
    cursor: "pointer",
  },
  buttonMuted: {
    border: "none",
    borderRadius: 6,
    background: "#6b7280",
    color: "#fff",
    padding: "7px 10px",
    cursor: "pointer",
  },
  buttonDanger: {
    border: "none",
    borderRadius: 6,
    background: "#991b1b",
    color: "#fff",
    padding: "7px 10px",
    cursor: "pointer",
  },
  message: {
    marginTop: 10,
    color: "#b91c1c",
  },
};