import { useEffect, useState } from "react";
import AgreementActionModal from "../components/AgreementActionModal";
import api from "../services/api";

function MyRentals() {
  const [rentals, setRentals] = useState([]);
  const [message, setMessage] = useState("");
  const [selectedRental, setSelectedRental] = useState(null);
  const [reportingRentalId, setReportingRentalId] = useState(null);
  const [reportForm, setReportForm] = useState({
    incidentType: "other",
    severity: "medium",
    incidentDescription: "",
    ownerContacted: false
  });
  const [agreementModal, setAgreementModal] = useState({
    isOpen: false,
    rentalId: null,
    actionType: "view"
  });

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
    setSelectedRental((prev) => (prev && prev._id === id ? updater(prev) : prev));
  };

  const openRentalDetails = (rental) => {
    setSelectedRental(rental);
    setMessage("");
  };

  const closeRentalDetails = () => {
    setSelectedRental(null);
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
      setMessage("Item returned successfully.");
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to return item");
    }
  };

  const cancelRental = async (id) => {
    try {
      setMessage("");
      const res = await api.patch(`/rentals/cancel/${id}`);
      updateRentalInState(id, (r) => ({ ...r, ...res.data.rental }));
      setMessage("Rental cancelled.");
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to cancel rental");
    }
  };

  const openAgreementModal = (rentalId, actionType) => {
    setAgreementModal({
      isOpen: true,
      rentalId,
      actionType
    });
    setMessage("");
  };

  const closeAgreementModal = () => {
    setAgreementModal({
      isOpen: false,
      rentalId: null,
      actionType: "view"
    });
  };

  const confirmAgreementAction = async () => {
    if (!agreementModal.rentalId) return;

    try {
      if (agreementModal.actionType === "sign-renter") {
        const res = await api.patch(`/rentals/${agreementModal.rentalId}/sign-renter`);
        updateRentalInState(agreementModal.rentalId, (r) => ({ ...r, agreement: res.data.agreement }));
        setMessage("Renter signature recorded. Owner and renter signatures are both required before activation.");
      }
      closeAgreementModal();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to update agreement");
    }
  };

  const openReportForm = (id) => {
    setReportingRentalId(id);
    setReportForm({
      incidentType: "other",
      severity: "medium",
      incidentDescription: "",
      ownerContacted: false
    });
    setMessage("");
  };

  const closeReportForm = () => {
    setReportingRentalId(null);
    setReportForm({
      incidentType: "other",
      severity: "medium",
      incidentDescription: "",
      ownerContacted: false
    });
  };

  const submitReport = async (rentalId) => {
    try {
      setMessage("");

      if (!reportForm.incidentDescription.trim()) {
        setMessage("Please describe the issue");
        return;
      }

      const res = await api.patch(`/rentals/report-issue/${rentalId}`, {
        incidentType: reportForm.incidentType,
        severity: reportForm.severity,
        incidentDescription: reportForm.incidentDescription.trim(),
        ownerContacted: reportForm.ownerContacted
      });

      updateRentalInState(rentalId, (r) => ({ ...r, ...res.data.rental }));
      setMessage(res.data.message || "Issue reported successfully");
      closeReportForm();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to report issue");
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
      <p style={styles.subTitle}>
        Click any rental card to open full details. Agreement opens only from inside rental details.
      </p>
      {message && <p style={styles.message}>{message}</p>}

      {rentals.length === 0 && <p style={styles.empty}>No rentals yet.</p>}

      <div style={styles.grid}>
        {rentals.map((rental) => (
          <div key={rental._id} style={styles.card} onClick={() => openRentalDetails(rental)}>
            <img
              src={rental.item?.images?.[0] || "https://via.placeholder.com/300"}
              style={styles.image}
              alt={rental.item?.title || "Rental item"}
            />

            <h3>{rental.item?.title}</h3>
            <p style={styles.meta}>INR {rental.item?.pricePerDay}/day</p>
            <p style={styles.meta}>
              {new Date(rental.startDate).toDateString()} to {new Date(rental.endDate).toDateString()}
            </p>

            {(rental.purpose || rental.pickupPreference || rental.signatureName) && (
              <div style={styles.bookingMetaBox}>
                {rental.purpose && <p style={styles.bookingMeta}>Purpose: {rental.purpose}</p>}
                {rental.pickupPreference && <p style={styles.bookingMeta}>Pickup: {rental.pickupPreference}</p>}
                {rental.signatureName && <p style={styles.bookingMeta}>Booking signature: {rental.signatureName}</p>}
              </div>
            )}

            <span style={{ ...styles.status, background: getStatusColor(rental.status) }}>
              {rental.status}
            </span>

            {rental.agreement && (
              <p style={styles.agreementMeta}>
                Agreement: {rental.agreement.status} | Owner signed: {rental.agreement.ownerSigned ? "Yes" : "No"} | You signed: {rental.agreement.renterSigned ? "Yes" : "No"}
              </p>
            )}
            <p style={styles.cardHint}>Click card to view details and actions</p>
          </div>
        ))}
      </div>

      {selectedRental ? (
        <div style={styles.detailsOverlay}>
          <div style={styles.detailsModal}>
            <div style={styles.detailsHeader}>
              <h2 style={styles.detailsTitle}>{selectedRental.item?.title || "Rental details"}</h2>
              <button style={styles.closeBtn} onClick={closeRentalDetails}>Close</button>
            </div>

            <img
              src={selectedRental.item?.images?.[0] || "https://via.placeholder.com/640x360"}
              style={styles.detailsImage}
              alt={selectedRental.item?.title || "Rental item"}
            />

            <div style={styles.detailGrid}>
              <p><strong>Status:</strong> {selectedRental.status}</p>
              <p><strong>Price:</strong> INR {selectedRental.item?.pricePerDay}/day</p>
              <p><strong>Start:</strong> {new Date(selectedRental.startDate).toDateString()}</p>
              <p><strong>End:</strong> {new Date(selectedRental.endDate).toDateString()}</p>
              <p><strong>Purpose:</strong> {selectedRental.purpose || "Not set"}</p>
              <p><strong>Pickup:</strong> {selectedRental.pickupPreference || "Not set"}</p>
            </div>

            {selectedRental.agreement ? (
              <p style={styles.agreementMeta}>
                Agreement: {selectedRental.agreement.status} | Owner signed: {selectedRental.agreement.ownerSigned ? "Yes" : "No"} | You signed: {selectedRental.agreement.renterSigned ? "Yes" : "No"}
              </p>
            ) : null}

            <div style={styles.actions}>
              {selectedRental.agreement && (
                <button style={styles.buttonOutline} onClick={() => openAgreementModal(selectedRental._id, "view")}>
                  Open Agreement
                </button>
              )}

              {selectedRental.status === "approved" && selectedRental.agreement && !selectedRental.agreement.renterSigned && (
                <button style={styles.buttonMuted} onClick={() => openAgreementModal(selectedRental._id, "sign-renter")}>
                  Sign Agreement (2-step)
                </button>
              )}

              {selectedRental.status === "active" && (
                <button style={styles.buttonPrimary} onClick={() => returnItem(selectedRental._id)}>
                  Return Item
                </button>
              )}

              {["requested", "approved"].includes(selectedRental.status) && (
                <button style={styles.buttonDanger} onClick={() => cancelRental(selectedRental._id)}>
                  Cancel Rental
                </button>
              )}

              {["approved", "active"].includes(selectedRental.status) && (
                <button style={styles.buttonDanger} onClick={() => openReportForm(selectedRental._id)}>
                  Report Issue
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <AgreementActionModal
        isOpen={agreementModal.isOpen}
        rentalId={agreementModal.rentalId}
        actionType={agreementModal.actionType}
        onClose={closeAgreementModal}
        onConfirm={confirmAgreementAction}
      />

      {reportingRentalId && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>Report Issue</h2>
            <p style={styles.modalSubtitle}>Help us resolve the problem by providing details</p>

            <div style={styles.formGroup}>
              <label style={styles.label}>Issue Type</label>
              <select
                style={styles.select}
                value={reportForm.incidentType}
                onChange={(e) => setReportForm({ ...reportForm, incidentType: e.target.value })}
              >
                <option value="not_returned">Item Not Returned</option>
                <option value="property_damage">Property Damage</option>
                <option value="harassment">Harassment</option>
                <option value="violent_behavior">Violent Behavior</option>
                <option value="payment_issue">Payment Issue</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Severity</label>
              <select
                style={styles.select}
                value={reportForm.severity}
                onChange={(e) => setReportForm({ ...reportForm, severity: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Description</label>
              <textarea
                style={styles.textarea}
                placeholder="Describe what happened..."
                value={reportForm.incidentDescription}
                onChange={(e) => setReportForm({ ...reportForm, incidentDescription: e.target.value })}
              />
            </div>

            <div style={styles.checkboxGroup}>
              <input
                type="checkbox"
                id="ownerContacted"
                checked={reportForm.ownerContacted}
                onChange={(e) => setReportForm({ ...reportForm, ownerContacted: e.target.checked })}
              />
              <label htmlFor="ownerContacted" style={styles.checkboxLabel}>
                I have already attempted to contact the owner about this issue
              </label>
            </div>

            <div style={styles.modalActions}>
              <button style={styles.buttonCancel} onClick={closeReportForm}>
                Cancel
              </button>
              <button style={styles.buttonSubmit} onClick={() => submitReport(reportingRentalId)}>
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
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
  subTitle: {
    marginTop: 0,
    marginBottom: 14,
    color: "#4b5563",
    fontSize: 14
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
    cursor: "pointer",
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
  bookingMetaBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    background: "#eef2ff",
    border: "1px solid #dbeafe",
  },
  bookingMeta: {
    margin: "3px 0",
    color: "#374151",
    fontSize: 13,
  },
  actions: {
    marginTop: 10,
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  cardHint: {
    marginTop: 10,
    color: "#4b5563",
    fontSize: 12,
    fontStyle: "italic"
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
  buttonOutline: {
    border: "1px solid #374151",
    borderRadius: 6,
    background: "#fff",
    color: "#111827",
    padding: "7px 10px",
    cursor: "pointer"
  },
  detailsOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1050,
    padding: 16
  },
  detailsModal: {
    width: "min(760px, 100%)",
    maxHeight: "90vh",
    overflowY: "auto",
    background: "#fff",
    borderRadius: 12,
    border: "1px solid #d1d5db",
    boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
    padding: 18
  },
  detailsHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12
  },
  detailsTitle: {
    margin: 0,
    color: "#111827"
  },
  closeBtn: {
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#374151",
    borderRadius: 6,
    padding: "7px 10px",
    cursor: "pointer"
  },
  detailsImage: {
    width: "100%",
    height: 250,
    objectFit: "cover",
    borderRadius: 10,
    border: "1px solid #d1d5db"
  },
  detailGrid: {
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: 8,
    color: "#374151"
  },
  message: {
    marginTop: 10,
    padding: 12,
    borderRadius: 6,
    background: "#fef2f2",
    color: "#b91c1c",
    fontSize: 14,
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "#fff",
    borderRadius: 12,
    padding: 24,
    maxWidth: 500,
    width: "90%",
    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
  },
  modalTitle: {
    marginBottom: 8,
    color: "#1f2937",
    fontSize: 20,
  },
  modalSubtitle: {
    marginBottom: 24,
    color: "#6b7280",
    fontSize: 14,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    display: "block",
    marginBottom: 6,
    color: "#374151",
    fontWeight: 500,
    fontSize: 14,
  },
  select: {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 14,
    fontFamily: "inherit",
  },
  textarea: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 14,
    fontFamily: "inherit",
    minHeight: 100,
    resize: "vertical",
  },
  checkboxGroup: {
    display: "flex",
    alignItems: "flex-start",
    marginBottom: 20,
    gap: 10,
  },
  checkboxLabel: {
    color: "#374151",
    fontSize: 14,
    lineHeight: 1.5,
  },
  modalActions: {
    display: "flex",
    gap: 12,
    justifyContent: "flex-end",
  },
  buttonCancel: {
    border: "1px solid #d1d5db",
    borderRadius: 6,
    background: "#fff",
    color: "#374151",
    padding: "8px 16px",
    cursor: "pointer",
    fontSize: 14,
  },
  buttonSubmit: {
    border: "none",
    borderRadius: 6,
    background: "#374151",
    color: "#fff",
    padding: "8px 16px",
    cursor: "pointer",
    fontSize: 14,
  },
};