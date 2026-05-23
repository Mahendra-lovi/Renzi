import { useEffect, useState } from "react";
import AgreementActionModal from "../components/AgreementActionModal";
import api from "../services/api";

function OwnerRequests() {
  const [rentals, setRentals] = useState([]);
  const [message, setMessage] = useState("");
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
        const res = await api.get("/rentals/owner-rentals");
        setRentals(res.data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchRentals();
  }, []);

  const updateRentalInState = (id, updater) => {
    setRentals((prev) => prev.map((r) => (r._id === id ? updater(r) : r)));
  };

  const approve = async (id) => {
    try {
      setMessage("");
      const res = await api.patch(`/rentals/approve/${id}`);

      updateRentalInState(id, (r) =>
        ({ ...r, ...res.data.rental, agreement: res.data.agreement })
      );
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to approve rental");
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
      if (agreementModal.actionType === "sign-owner") {
        const res = await api.patch(`/rentals/${agreementModal.rentalId}/sign-owner`);
        updateRentalInState(agreementModal.rentalId, (r) => ({ ...r, agreement: res.data.agreement }));
        setMessage("Owner signature recorded. Rental can activate after renter also signs.");
      }

      if (agreementModal.actionType === "activate") {
        const res = await api.patch(`/rentals/activate/${agreementModal.rentalId}`);
        updateRentalInState(agreementModal.rentalId, (r) => ({
          ...r,
          ...res.data.rental,
          agreement: res.data.agreement || r.agreement
        }));
        setMessage("Rental activated successfully.");
      }

      closeAgreementModal();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to complete agreement action");
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

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Rental Requests (My Items)</h1>
      <p style={styles.subTitle}>
        Agreement actions are now guided in two steps: open first, then confirm after reading action impact.
      </p>
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

              {rental.agreement && (
                <button style={styles.openBtn} onClick={() => openAgreementModal(rental._id, "view")}>
                  Open Agreement
                </button>
              )}

              {rental.status === "approved" && rental.agreement && !rental.agreement.ownerSigned && (
                <button style={styles.signBtn} onClick={() => openAgreementModal(rental._id, "sign-owner")}>
                  Sign Agreement (2-step)
                </button>
              )}

              {rental.status === "approved" && (
                <button
                  style={styles.activateBtn}
                  onClick={() => openAgreementModal(rental._id, "activate")}
                >
                  Activate Rental (2-step)
                </button>
              )}

              {["active"].includes(rental.status) && (
                <button style={styles.reportBtn} onClick={() => openReportForm(rental._id)}>
                  Report Issue
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <AgreementActionModal
        isOpen={agreementModal.isOpen}
        rentalId={agreementModal.rentalId}
        actionType={agreementModal.actionType}
        onClose={closeAgreementModal}
        onConfirm={confirmAgreementAction}
        isActionDisabled={
          agreementModal.actionType === "activate" &&
          (
            !rentals.find((r) => r._id === agreementModal.rentalId)?.agreement?.ownerSigned ||
            !rentals.find((r) => r._id === agreementModal.rentalId)?.agreement?.renterSigned
          )
        }
        disabledReason="Activation requires both signatures. Ask renter to sign first if pending."
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
                I have already attempted to contact the renter about this issue
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

export default OwnerRequests;

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
  openBtn: {
    background: "#fff",
    color: "#111827",
    border: "1px solid #374151",
    padding: "8px 10px",
    borderRadius: 6,
    cursor: "pointer"
  },
  activateBtn: {
    background: "#374151",
    color: "#fff",
    border: "none",
    padding: "8px 10px",
    borderRadius: 6,
    cursor: "pointer",
  },
  reportBtn: {
    background: "#991b1b",
    color: "#fff",
    border: "none",
    padding: "8px 10px",
    borderRadius: 6,
    cursor: "pointer",
  },
  message: {
    marginTop: 10,
    padding: 12,
    borderRadius: 6,
    background: "#fef2f2",
    color: "#b91c1c",
    fontSize: 14,
  },
  agreementMeta: {
    color: "#4b5563",
    fontSize: 13,
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