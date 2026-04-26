import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

const actionCopy = {
  view: {
    title: "Agreement details",
    buttonLabel: "Close",
    heading: "Read the full agreement",
    description:
      "Review all terms, signatures, and timeline details. You can also download the legal PDF copy for records."
  },
  "sign-renter": {
    title: "Renter signature",
    buttonLabel: "Confirm renter signature",
    heading: "What this action will do",
    description:
      "This will record your renter signature with timestamp. After owner and renter both sign, the rental becomes eligible for activation."
  },
  "sign-owner": {
    title: "Owner signature",
    buttonLabel: "Confirm owner signature",
    heading: "What this action will do",
    description:
      "This will record your owner signature with timestamp. After both signatures are complete, you can activate the rental."
  },
  activate: {
    title: "Activate rental",
    buttonLabel: "Confirm activation",
    heading: "What this action will do",
    description:
      "This will move the rental to ACTIVE status. Both parties must already have signed the agreement before this action succeeds."
  }
};

function AgreementActionModal({
  isOpen,
  rentalId,
  actionType = "view",
  onClose,
  onConfirm,
  isActionDisabled = false,
  disabledReason = ""
}) {
  const [agreement, setAgreement] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (!isOpen || !rentalId) return;

    let mounted = true;
    const fetchAgreement = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await api.get(`/rentals/${rentalId}/agreement`);
        if (!mounted) return;
        setAgreement(res.data);
      } catch (err) {
        if (!mounted) return;
        setAgreement(null);
        setError(err.response?.data?.message || "Failed to load agreement");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    setStep(1);
    fetchAgreement();

    return () => {
      mounted = false;
    };
  }, [isOpen, rentalId]);

  const copy = useMemo(() => actionCopy[actionType] || actionCopy.view, [actionType]);

  const handleDownloadPdf = async () => {
    try {
      setError("");
      const res = await api.get(`/rentals/${rentalId}/agreement/pdf`, {
        responseType: "blob"
      });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `Renzi-Agreement-${rentalId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to download agreement PDF");
    }
  };

  const handleConfirm = async () => {
    if (!onConfirm) return;
    await onConfirm();
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>{copy.title}</h2>

        {loading ? <p style={styles.meta}>Loading agreement...</p> : null}
        {error ? <p style={styles.error}>{error}</p> : null}

        {agreement ? (
          <>
            <div style={styles.summaryGrid}>
              <div style={styles.summaryCard}>
                <span style={styles.label}>Item</span>
                <strong style={styles.value}>{agreement.item?.title || "Item"}</strong>
              </div>
              <div style={styles.summaryCard}>
                <span style={styles.label}>Status</span>
                <strong style={styles.value}>{agreement.status}</strong>
              </div>
              <div style={styles.summaryCard}>
                <span style={styles.label}>Owner Signature</span>
                <strong style={styles.value}>{agreement.ownerSigned ? "Signed" : "Pending"}</strong>
              </div>
              <div style={styles.summaryCard}>
                <span style={styles.label}>Renter Signature</span>
                <strong style={styles.value}>{agreement.renterSigned ? "Signed" : "Pending"}</strong>
              </div>
            </div>

            <div style={styles.partyBox}>
              <p style={styles.partyLine}>
                <strong>Owner:</strong> {agreement.owner?.name || agreement.owner?.email || "Owner"} ({agreement.owner?.email || "N/A"})
              </p>
              <p style={styles.partyLine}>
                <strong>Renter:</strong> {agreement.renter?.name || agreement.renter?.email || "Renter"} ({agreement.renter?.email || "N/A"})
              </p>
              <p style={styles.partyLine}>
                <strong>Period:</strong> {new Date(agreement.startDate).toDateString()} to {new Date(agreement.endDate).toDateString()}
              </p>
              <p style={styles.partyLine}>
                <strong>Total:</strong> INR {agreement.totalPrice}
              </p>
            </div>

            <div style={styles.termsBox}>
              <strong style={styles.termsTitle}>Agreement text</strong>
              <p style={styles.termsText}>{agreement.content}</p>
            </div>

            <button type="button" style={styles.pdfButton} onClick={handleDownloadPdf}>
              Download Legal PDF
            </button>

            {actionType !== "view" ? (
              step === 1 ? (
                <div style={styles.stepBox}>
                  <h3 style={styles.stepTitle}>Step 1: Opened successfully</h3>
                  <p style={styles.stepText}>
                    The agreement is now open. Click Continue to view what the next action will do before final confirmation.
                  </p>
                  <div style={styles.actions}>
                    <button type="button" style={styles.cancelBtn} onClick={onClose}>Close</button>
                    <button type="button" style={styles.primaryBtn} onClick={() => setStep(2)}>Continue</button>
                  </div>
                </div>
              ) : (
                <div style={styles.stepBox}>
                  <h3 style={styles.stepTitle}>Step 2: Action details</h3>
                  <p style={styles.stepText}><strong>{copy.heading}</strong></p>
                  <p style={styles.stepText}>{copy.description}</p>
                  {isActionDisabled ? <p style={styles.error}>{disabledReason || "This action is currently blocked."}</p> : null}
                  <div style={styles.actions}>
                    <button type="button" style={styles.cancelBtn} onClick={onClose}>Close</button>
                    <button
                      type="button"
                      style={isActionDisabled ? styles.disabledBtn : styles.primaryBtn}
                      onClick={handleConfirm}
                      disabled={isActionDisabled}
                    >
                      {copy.buttonLabel}
                    </button>
                  </div>
                </div>
              )
            ) : (
              <div style={styles.actions}>
                <button type="button" style={styles.cancelBtn} onClick={onClose}>{copy.buttonLabel}</button>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    zIndex: 1100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16
  },
  modal: {
    width: "min(780px, 100%)",
    maxHeight: "90vh",
    overflowY: "auto",
    background: "#fff",
    borderRadius: 12,
    padding: 18,
    border: "1px solid #e5e7eb",
    boxShadow: "0 20px 45px rgba(0,0,0,0.25)"
  },
  title: {
    margin: "0 0 10px",
    color: "#111827"
  },
  meta: {
    margin: "6px 0",
    color: "#4b5563"
  },
  error: {
    margin: "8px 0",
    color: "#b91c1c"
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
    gap: 8,
    marginTop: 8
  },
  summaryCard: {
    border: "1px solid #d1d5db",
    borderRadius: 8,
    padding: 8,
    background: "#f9fafb"
  },
  label: {
    display: "block",
    fontSize: 12,
    color: "#6b7280"
  },
  value: {
    color: "#111827",
    fontSize: 14
  },
  partyBox: {
    marginTop: 10,
    border: "1px solid #d1d5db",
    borderRadius: 8,
    padding: 10,
    background: "#fff"
  },
  partyLine: {
    margin: "4px 0",
    color: "#374151"
  },
  termsBox: {
    marginTop: 10,
    border: "1px solid #d1d5db",
    borderRadius: 8,
    padding: 10,
    background: "#f9fafb"
  },
  termsTitle: {
    color: "#111827"
  },
  termsText: {
    marginTop: 6,
    color: "#374151",
    whiteSpace: "pre-wrap",
    lineHeight: 1.5
  },
  pdfButton: {
    marginTop: 10,
    border: "1px solid #374151",
    background: "#fff",
    color: "#111827",
    borderRadius: 6,
    padding: "8px 12px",
    cursor: "pointer"
  },
  stepBox: {
    marginTop: 14,
    border: "1px solid #d1d5db",
    borderRadius: 8,
    padding: 12,
    background: "#fff"
  },
  stepTitle: {
    margin: "0 0 6px",
    color: "#111827"
  },
  stepText: {
    margin: "4px 0",
    color: "#374151"
  },
  actions: {
    marginTop: 12,
    display: "flex",
    justifyContent: "flex-end",
    gap: 8
  },
  cancelBtn: {
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#374151",
    borderRadius: 6,
    padding: "8px 12px",
    cursor: "pointer"
  },
  primaryBtn: {
    border: "none",
    background: "#111827",
    color: "#fff",
    borderRadius: 6,
    padding: "8px 12px",
    cursor: "pointer"
  },
  disabledBtn: {
    border: "none",
    background: "#9ca3af",
    color: "#fff",
    borderRadius: 6,
    padding: "8px 12px",
    cursor: "not-allowed"
  }
};

export default AgreementActionModal;
