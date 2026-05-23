import { useEffect, useState } from "react";
import AgreementActionModal from "../components/AgreementActionModal";
import api from "../services/api";

const loadRazorpayScript = () => new Promise((resolve) => {
  if (window.Razorpay) {
    resolve(true);
    return;
  }

  const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
  if (existingScript) {
    existingScript.addEventListener("load", () => resolve(true));
    existingScript.addEventListener("error", () => resolve(false));
    return;
  }

  const script = document.createElement("script");
  script.src = "https://checkout.razorpay.com/v1/checkout.js";
  script.async = true;
  script.onload = () => resolve(true);
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

function MyRentals() {
  const [rentals, setRentals] = useState([]);
  const [message, setMessage] = useState("");
  const [selectedRental, setSelectedRental] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState({ receipts: [], timeline: [] });
  const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(false);
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
    fetchPaymentHistory(rental._id);
    setMessage("");
  };

  const closeRentalDetails = () => {
    setSelectedRental(null);
    setPaymentHistory({ receipts: [], timeline: [] });
  };

  const fetchPaymentHistory = async (rentalId) => {
    try {
      setPaymentHistoryLoading(true);
      const res = await api.get(`/rentals/${rentalId}/payment-history`);
      setPaymentHistory({
        receipts: Array.isArray(res.data?.receipts) ? res.data.receipts : [],
        timeline: Array.isArray(res.data?.timeline) ? res.data.timeline : []
      });
    } catch {
      setPaymentHistory({ receipts: [], timeline: [] });
    } finally {
      setPaymentHistoryLoading(false);
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

  const payAdvance = async (id, method) => {
    try {
      setMessage("");
      const actionLabel = method === "cash" ? "manual cash" : "site payment";
      const confirmed = window.confirm(`Proceed with advance payment via ${actionLabel}?`);
      if (!confirmed) return;

      const res = await api.patch(`/rentals/${id}/pay-advance`, { method });
      updateRentalInState(id, (r) => ({ ...r, ...res.data.rental }));
      await fetchPaymentHistory(id);
      setMessage(res.data.message || "Advance payment updated");
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to update advance payment");
    }
  };

  const payFinalSettlement = async (id, method) => {
    try {
      setMessage("");
      const actionLabel = method === "cash" ? "manual cash" : "site payment";
      const confirmed = window.confirm(`Proceed with final settlement via ${actionLabel}?`);
      if (!confirmed) return;

      const res = await api.patch(`/rentals/${id}/pay-final`, { method });
      updateRentalInState(id, (r) => ({ ...r, ...res.data.rental }));
      await fetchPaymentHistory(id);
      setMessage(res.data.message || "Final settlement updated");
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to update final settlement");
    }
  };

  const getPaymentState = (rental) => {
    const payment = rental.payment || {};
    const advance = payment.advance || {};
    const final = payment.final || {};
    const total = Number(rental.totalPrice || 0);
    const fallbackAdvance = Math.round((total * 25) / 100);
    const fallbackFinal = Math.max(total - fallbackAdvance, 0);
    return {
      advanceAmount: Number(payment.advanceAmount ?? fallbackAdvance),
      finalAmount: Number(payment.finalAmount ?? fallbackFinal),
      advanceStatus: advance.status || "pending",
      advanceMethod: advance.method || "none",
      finalStatus: final.status || "not_due",
      finalMethod: final.method || "none"
    };
  };

  const handleGatewayPayment = async (rentalId, stage) => {
    try {
      setMessage("");
      const stageLabel = stage === "advance" ? "advance payment" : "final settlement";
      const confirmed = window.confirm(`Proceed with ${stageLabel} via secured site checkout?`);
      if (!confirmed) return;

      const orderRes = await api.post(`/rentals/${rentalId}/payment-gateway/order`, { stage });
      const order = orderRes.data?.order;
      const prefill = orderRes.data?.prefill || {};
      if (!order?.id || !order?.keyId) {
        setMessage("Unable to start gateway checkout.");
        return;
      }

      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded || !window.Razorpay) {
        setMessage("Payment SDK failed to load. Please retry.");
        return;
      }

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "Renzi",
        description: stage === "advance" ? "Advance Payment (25%)" : "Final Settlement (75%)",
        order_id: order.id,
        prefill,
        theme: { color: "#374151" },
        handler: async (response) => {
          try {
            const verifyRes = await api.post(`/rentals/${rentalId}/payment-gateway/verify`, {
              stage,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            updateRentalInState(rentalId, (r) => ({ ...r, ...verifyRes.data.rental }));
            await fetchPaymentHistory(rentalId);
            setMessage(verifyRes.data.message || "Payment completed successfully.");
          } catch (err) {
            setMessage(err.response?.data?.message || "Payment verification failed");
          }
        },
      };

      const checkout = new window.Razorpay(options);
      checkout.on("payment.failed", () => {
        setMessage("Payment was not completed. Please try again.");
      });
      checkout.open();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to initiate gateway payment");
    }
  };

  const formatDateTime = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString();
  };

  const downloadReceipt = (receipt) => {
    const fallbackId = String(receipt.paidAt || "receipt").replace(/[^a-zA-Z0-9]/g, "-");
    const filename = `renzi-receipt-${receipt.stage}-${receipt._id || fallbackId}.json`;
    const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const formatStageLabel = (status) => {
    switch (status) {
      case "paid":
        return "Paid";
      case "pending_confirmation":
        return "Waiting owner confirmation";
      case "not_due":
        return "Not due yet";
      default:
        return "Pending";
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
        Click any rental card to open full details. Rental Terms and payments open from inside rental details.
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
                Rental Terms: {rental.agreement.status} | Owner signed: {rental.agreement.ownerSigned ? "Yes" : "No"} | You signed: {rental.agreement.renterSigned ? "Yes" : "No"}
              </p>
            )}
            {(() => {
              const payment = getPaymentState(rental);
              return (
                <div style={styles.paymentBox}>
                  <p style={styles.paymentLine}>
                    <strong>Advance:</strong> INR {payment.advanceAmount} ({formatStageLabel(payment.advanceStatus)})
                  </p>
                  <p style={styles.paymentLine}>
                    <strong>Final:</strong> INR {payment.finalAmount} ({formatStageLabel(payment.finalStatus)})
                  </p>
                </div>
              );
            })()}
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

            <div style={styles.detailsContent}>
              <div style={styles.detailsLeft}>
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
                    Rental Terms: {selectedRental.agreement.status} | Owner signed: {selectedRental.agreement.ownerSigned ? "Yes" : "No"} | You signed: {selectedRental.agreement.renterSigned ? "Yes" : "No"}
                  </p>
                ) : null}

                {(() => {
                  const payment = getPaymentState(selectedRental);
                  const fallbackReceipts = selectedRental.payment?.receipts || [];
                  const fallbackTimeline = selectedRental.payment?.timeline || [];
                  const receipts = paymentHistory.receipts.length > 0 ? paymentHistory.receipts : fallbackReceipts;
                  const timeline = paymentHistory.timeline.length > 0 ? paymentHistory.timeline : fallbackTimeline;
                  return (
                    <>
                      <div style={styles.paymentBoxLarge}>
                        <p style={styles.paymentTitle}>Payment Summary</p>
                        <p style={styles.paymentLine}>
                          <strong>Advance Payment (25%):</strong> INR {payment.advanceAmount}
                        </p>
                        <p style={styles.paymentLine}>
                          Status: {formatStageLabel(payment.advanceStatus)} | Method: {payment.advanceMethod}
                        </p>
                        <p style={styles.paymentLine}>
                          <strong>Final Settlement (75%):</strong> INR {payment.finalAmount}
                        </p>
                        <p style={styles.paymentLine}>
                          Status: {formatStageLabel(payment.finalStatus)} | Method: {payment.finalMethod}
                        </p>
                      </div>

                      <div style={styles.timelineBox}>
                        <p style={styles.paymentTitle}>Receipts</p>
                        {paymentHistoryLoading ? (
                          <p style={styles.paymentLine}>Loading payment history...</p>
                        ) : receipts.length === 0 ? (
                          <p style={styles.paymentLine}>No receipts yet.</p>
                        ) : (
                          <div style={styles.timelineList}>
                            {receipts.map((receipt) => (
                              <div key={receipt._id || `${receipt.stage}-${receipt.paidAt}`} style={styles.timelineItem}>
                                <p style={styles.paymentLine}><strong>{receipt.stage === "advance" ? "Advance" : "Final"}</strong> • INR {receipt.amount}</p>
                                <p style={styles.paymentLine}>Method: {receipt.method} • Status: {receipt.status}</p>
                                <p style={styles.paymentLine}>Paid At: {formatDateTime(receipt.paidAt)}</p>
                                <button style={styles.buttonOutline} onClick={() => downloadReceipt(receipt)}>
                                  Download Receipt JSON
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <p style={{ ...styles.paymentTitle, marginTop: 12 }}>Transaction Timeline</p>
                        {timeline.length === 0 ? (
                          <p style={styles.paymentLine}>No payment events yet.</p>
                        ) : (
                          <div style={styles.timelineList}>
                            {timeline.map((event) => (
                              <div key={event._id || `${event.event}-${event.createdAt}`} style={styles.timelineItem}>
                                <p style={styles.paymentLine}><strong>{event.event}</strong></p>
                                <p style={styles.paymentLine}>
                                  Stage: {event.stage || "-"} • Method: {event.method || "-"} • Amount: INR {Number(event.amount || 0)}
                                </p>
                                <p style={styles.paymentLine}>Time: {formatDateTime(event.createdAt)}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}

                <div style={styles.actions}>
                  {selectedRental.agreement && (
                    <button style={styles.buttonOutline} onClick={() => openAgreementModal(selectedRental._id, "view")}>
                      Open Rental Terms
                    </button>
                  )}

                  {selectedRental.status === "approved" && selectedRental.agreement && !selectedRental.agreement.renterSigned && (
                    <button style={styles.buttonMuted} onClick={() => openAgreementModal(selectedRental._id, "sign-renter")}>
                      Sign Rental Terms (2-step)
                    </button>
                  )}

                  {(() => {
                    const payment = getPaymentState(selectedRental);
                    if (selectedRental.status !== "approved" || payment.advanceStatus !== "pending") return null;

                    return (
                      <>
                        <button style={styles.buttonPrimary} onClick={() => handleGatewayPayment(selectedRental._id, "advance")}>
                          Pay Advance via Site
                        </button>
                        <button style={styles.buttonMuted} onClick={() => payAdvance(selectedRental._id, "cash")}>
                          Mark Advance as Cash
                        </button>
                      </>
                    );
                  })()}

                  {(() => {
                    const payment = getPaymentState(selectedRental);
                    if (!["active", "returned"].includes(selectedRental.status)) return null;
                    if (!["pending", "not_due"].includes(payment.finalStatus)) return null;

                    return (
                      <>
                        <button style={styles.buttonPrimary} onClick={() => handleGatewayPayment(selectedRental._id, "final")}>
                          Pay Final via Site
                        </button>
                        <button style={styles.buttonMuted} onClick={() => payFinalSettlement(selectedRental._id, "cash")}>
                          Mark Final as Cash
                        </button>
                      </>
                    );
                  })()}

                  {selectedRental.status === "active" && (
                    <button style={styles.buttonPrimary} onClick={() => returnItem(selectedRental._id)}>
                      Return Item
                    </button>
                  )}

                  {selectedRental.status === "active" && (
                    <button style={styles.buttonDanger} onClick={() => openReportForm(selectedRental._id)}>
                      Issue Report
                    </button>
                  )}

                  {["requested", "approved"].includes(selectedRental.status) && (
                    <button style={styles.buttonDanger} onClick={() => cancelRental(selectedRental._id)}>
                      Cancel Rental
                    </button>
                  )}
                </div>
              </div>
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
    fontSize: 12,
    color: "#64748b",
    lineHeight: 1.5,
    padding: "10px 12px",
    background: "#f0f9ff",
    borderRadius: 8,
    border: "1px solid #bfdbfe",
  },
  paymentBox: {
    marginTop: 10,
    padding: "10px 12px",
    borderRadius: 8,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
  },
  paymentBoxLarge: {
    marginTop: 2,
    padding: "10px 12px",
    borderRadius: 10,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
  },
  paymentTitle: {
    margin: "0 0 6px",
    color: "#0f172a",
    fontWeight: 700,
    fontSize: 14,
  },
  paymentLine: {
    margin: "4px 0",
    color: "#334155",
    fontSize: 13,
  },
  timelineBox: {
    marginTop: 10,
    padding: "10px 12px",
    borderRadius: 10,
    background: "#ffffff",
    border: "1px solid #e2e8f0",
  },
  timelineList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    maxHeight: 220,
    overflowY: "auto",
  },
  timelineItem: {
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
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
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
    marginTop: "auto",
    paddingTop: 10,
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
    width: "min(700px, 95vw)",
    maxHeight: "90vh",
    background: "#fff",
    borderRadius: 12,
    border: "1px solid #d1d5db",
    boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  detailsHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "16px 18px",
    borderBottom: "1px solid #e5e7eb",
    background: "rgba(248,250,252,0.95)",
    flexShrink: 0,
  },
  detailsTitle: {
    margin: 0,
    color: "#111827",
    fontSize: 20,
    fontWeight: 700,
  },
  closeBtn: {
    border: "none",
    background: "transparent",
    color: "#6b7280",
    borderRadius: 6,
    padding: "6px 8px",
    cursor: "pointer",
    fontSize: 16,
    fontWeight: 600,
  },
  detailsContent: {
    padding: 16,
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    overflowY: "auto",
  },
  detailsLeft: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  detailsRight: {
    display: "none",
  },
  detailsImage: {
    width: "100%",
    height: 240,
    objectFit: "cover",
    borderRadius: 10,
    border: "1px solid #d1d5db"
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 12,
    fontSize: 13,
    color: "#374151",
    padding: "12px 0",
  },
  chatTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: "#1f2937",
    paddingBottom: 10,
    borderBottom: "1px solid #e5e7eb",
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