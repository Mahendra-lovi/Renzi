import { useContext, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import { AuthContext } from "../context/auth-context";

const agreementClauses = [
  "The renter confirms the item will be used safely and returned in the same condition, normal wear and tear excepted.",
  "The renter agrees to follow the agreed rental period and communicate any extension or issue before the due date.",
  "Damage, loss, or misuse may result in additional charges or reported-issue handling according to marketplace policy.",
  "This signature is for booking request acknowledgement. Final rental activation still requires both owner and renter agreement signatures after approval.",
];

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(value || 0));
}

function ItemDetails() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);

  const [item, setItem] = useState(null);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [purpose, setPurpose] = useState("work");
  const [pickupPreference, setPickupPreference] = useState("pickup");
  const [notes, setNotes] = useState("");
  const [signatureName, setSignatureName] = useState("");
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [message, setMessage] = useState("");
  const [bookingState, setBookingState] = useState("idle");
  const signatureFallback = user?.name || user?.email?.split("@")[0] || "";

  useEffect(() => {
    let isMounted = true;

    api
      .get(`/items/${id}`)
      .then((res) => {
        if (!isMounted) return;
        setItem(res.data);
        setError("");
      })
      .catch((err) => {
        if (!isMounted) return;
        setItem(null);
        setError(err.response?.data?.message || "Failed to load item");
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const gallery = Array.isArray(item?.images) && item.images.filter(Boolean).length > 0
    ? item.images.filter(Boolean)
    : ["https://via.placeholder.com/1200x800?text=Renzi+Item"];

  const rentalDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return Number.isFinite(diff) && diff > 0 ? diff : 0;
  }, [startDate, endDate]);

  const estimatedTotal = useMemo(() => rentalDays * Number(item?.pricePerDay || 0), [item?.pricePerDay, rentalDays]);

  const handleRent = async () => {
    try {
      setMessage("");

      if (!startDate || !endDate) {
        setMessage("Choose both start and end dates.");
        return;
      }

      if (!agreementAccepted) {
        setMessage("Please read and sign the agreement before submitting.");
        return;
      }

      if (!(signatureName.trim() || signatureFallback)) {
        setMessage("Enter your signature name.");
        return;
      }

      if (rentalDays <= 0) {
        setMessage("End date must be after the start date.");
        return;
      }

      setBookingState("submitting");

      const res = await api.post("/rentals/request", {
        itemId: id,
        startDate,
        endDate,
        purpose,
        pickupPreference,
        notes,
        signatureName: signatureName.trim() || signatureFallback,
        agreementAccepted,
      });

      setBookingState("submitted");
      setMessage(`${res.data.message}. Your digital acknowledgement has been attached to the booking request.`);
    } catch (err) {
      setBookingState("idle");
      setMessage(err.response?.data?.message || "Request failed");
    }
  };

  if (error) return <h2 style={styles.error}>{error}</h2>;

  if (!item) return <h2 style={styles.loading}>Loading...</h2>;

  const ownerLabel = item.owner?.name || item.owner?.email || "Owner";

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.hero}>
          <div style={styles.galleryWrap}>
            <img src={gallery[0]} alt={item.title} style={styles.heroImage} />

            {gallery.length > 1 ? (
              <div style={styles.thumbRow}>
                {gallery.slice(0, 4).map((image, index) => (
                  <img key={`${image}-${index}`} src={image} alt={`${item.title} ${index + 1}`} style={styles.thumb} />
                ))}
              </div>
            ) : null}
          </div>

          <div style={styles.heroCopy}>
            <span style={styles.eyebrow}>Premium booking</span>
            <h1 style={styles.title}>{item.title}</h1>
            <p style={styles.subtitle}>{item.description || "High-quality rental listing with clear terms and digital signature."}</p>

            <div style={styles.metaRow}>
              <div style={styles.metaCard}>
                <span style={styles.metaLabel}>Price</span>
                <strong style={styles.metaValue}>₹{formatCurrency(item.pricePerDay)} / day</strong>
              </div>
              <div style={styles.metaCard}>
                <span style={styles.metaLabel}>Category</span>
                <strong style={styles.metaValue}>{item.category || "Item"}</strong>
              </div>
              <div style={styles.metaCard}>
                <span style={styles.metaLabel}>Condition</span>
                <strong style={styles.metaValue}>{item.condition || "Good"}</strong>
              </div>
            </div>

            <div style={styles.ownerBlock}>
              <span style={styles.metaLabel}>Owner</span>
              <strong style={styles.ownerValue}>{ownerLabel}</strong>
              <span style={styles.ownerSub}>{item.city || "Location not specified"}</span>
            </div>
          </div>
        </div>

        <div style={styles.columns}>
          <div style={styles.leftColumn}>
            <section style={styles.sectionCard}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>Booking details</h2>
                <p style={styles.sectionHint}>Choose your rental period and preferences before signing.</p>
              </div>

              <div style={styles.formGrid}>
                <label style={styles.field}>
                  <span style={styles.fieldLabel}>Start date</span>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={styles.input} />
                </label>
                <label style={styles.field}>
                  <span style={styles.fieldLabel}>End date</span>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={styles.input} />
                </label>
                <label style={styles.field}>
                  <span style={styles.fieldLabel}>Purpose</span>
                  <select value={purpose} onChange={(e) => setPurpose(e.target.value)} style={styles.input}>
                    <option value="work">Work</option>
                    <option value="event">Event</option>
                    <option value="home-project">Home project</option>
                    <option value="photography">Photography</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label style={styles.field}>
                  <span style={styles.fieldLabel}>Pickup preference</span>
                  <select value={pickupPreference} onChange={(e) => setPickupPreference(e.target.value)} style={styles.input}>
                    <option value="pickup">Pickup</option>
                    <option value="delivery">Delivery</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </label>
              </div>

              <label style={styles.field}>
                <span style={styles.fieldLabel}>Message to owner</span>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add a short note about how you plan to use the item, timing, or special requirements."
                  style={styles.textarea}
                />
              </label>

              <div style={styles.summaryStrip}>
                <div>
                  <span style={styles.metaLabel}>Rental days</span>
                  <strong style={styles.summaryValue}>{rentalDays || "--"}</strong>
                </div>
                <div>
                  <span style={styles.metaLabel}>Estimated total</span>
                  <strong style={styles.summaryValue}>₹{formatCurrency(estimatedTotal)}</strong>
                </div>
                <div>
                  <span style={styles.metaLabel}>Availability</span>
                  <strong style={styles.summaryValue}>{item.isAvailable ? "Available" : "Not available"}</strong>
                </div>
              </div>
            </section>

            <section style={styles.sectionCard}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>Agreement</h2>
                <p style={styles.sectionHint}>Read and acknowledge now to send the booking request. Final activation happens later only after both owner and renter sign the official agreement.</p>
              </div>

              <div style={styles.agreementPaper}>
                <div style={styles.agreementTitleRow}>
                  <span style={styles.agreementBadge}>Digital agreement</span>
                  <span style={styles.agreementMeta}>Booking preview for {item.title}</span>
                </div>

                <div style={styles.agreementTextBlock}>
                  {agreementClauses.map((clause, index) => (
                    <p key={clause} style={styles.agreementParagraph}>
                      <strong>{index + 1}.</strong> {clause}
                    </p>
                  ))}
                </div>

                <div style={styles.signatureBlock}>
                  <div>
                    <span style={styles.fieldLabel}>Typed signature</span>
                    <div style={styles.signaturePreview}>{signatureName || signatureFallback || "Type your name"}</div>
                  </div>

                  <label style={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      checked={agreementAccepted}
                      onChange={(e) => setAgreementAccepted(e.target.checked)}
                    />
                    <span>I have read and acknowledge these booking terms. I understand final activation requires both parties to sign the official agreement.</span>
                  </label>

                  <div style={styles.signatureFooter}>
                    <label style={{ ...styles.field, flex: 1 }}>
                      <span style={styles.fieldLabel}>Signature name</span>
                      <input
                        value={signatureName}
                        onChange={(e) => setSignatureName(e.target.value)}
                        placeholder="Type full name"
                        style={styles.input}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={handleRent}
                      disabled={bookingState === "submitting" || bookingState === "submitted"}
                      style={bookingState === "submitting" || bookingState === "submitted" ? styles.buttonDisabled : styles.button}
                    >
                      {bookingState === "submitting" ? "Signing & sending..." : bookingState === "submitted" ? "Submitted" : "Sign & request booking"}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {message ? <p style={styles.message}>{message}</p> : null}
          </div>

          <aside style={styles.rightColumn}>
            <section style={styles.sideCard}>
              <h3 style={styles.sideTitle}>What you get</h3>
              <ul style={styles.list}>
                <li>Professional booking summary with transparent pricing</li>
                <li>Agreement preview with digital signature acknowledgment</li>
                <li>Owner details, item images, and booking notes in one place</li>
                <li>Clear next-step flow for approval and final contract signing</li>
              </ul>
            </section>

            <section style={styles.sideCard}>
              <h3 style={styles.sideTitle}>Item details</h3>
              <div style={styles.detailRow}><span>Owner</span><strong>{ownerLabel}</strong></div>
              <div style={styles.detailRow}><span>City</span><strong>{item.city || "--"}</strong></div>
              <div style={styles.detailRow}><span>Tags</span><strong>{Array.isArray(item.tags) && item.tags.length ? item.tags.slice(0, 3).join(", ") : "--"}</strong></div>
              <div style={styles.detailRow}><span>Status</span><strong>{item.isAvailable ? "Available" : "Unavailable"}</strong></div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default ItemDetails;

const styles = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(1400px 520px at 50% -8%, #ffffff 0%, #eef2ff 36%, #dbe4f0 100%)",
    padding: "24px 16px 40px",
  },
  shell: {
    maxWidth: 1220,
    margin: "0 auto",
    background: "rgba(255,255,255,0.78)",
    border: "1px solid rgba(203,213,225,0.9)",
    borderRadius: 24,
    boxShadow: "0 24px 60px rgba(15,23,42,0.12)",
    backdropFilter: "blur(18px) saturate(150%)",
    padding: 20,
  },
  hero: {
    display: "grid",
    gridTemplateColumns: "1.2fr 0.8fr",
    gap: 18,
    alignItems: "stretch",
  },
  galleryWrap: {
    borderRadius: 20,
    overflow: "hidden",
    border: "1px solid rgba(203,213,225,0.9)",
    background: "#fff",
    boxShadow: "0 16px 34px rgba(15,23,42,0.10)",
  },
  heroImage: {
    width: "100%",
    height: 440,
    objectFit: "cover",
    display: "block",
  },
  thumbRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 8,
    padding: 10,
    background: "rgba(248,250,252,0.95)",
  },
  thumb: {
    width: "100%",
    height: 86,
    objectFit: "cover",
    borderRadius: 12,
    border: "1px solid rgba(203,213,225,0.9)",
  },
  heroCopy: {
    borderRadius: 20,
    padding: 24,
    background: "linear-gradient(180deg, rgba(15,23,42,0.97) 0%, rgba(30,41,59,0.96) 100%)",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    gap: 18,
    justifyContent: "space-between",
  },
  eyebrow: {
    margin: 0,
    color: "#93c5fd",
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    margin: 0,
    fontSize: 34,
    lineHeight: 1.06,
  },
  subtitle: {
    margin: 0,
    color: "#cbd5e1",
    fontSize: 15,
    lineHeight: 1.6,
  },
  metaRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
  },
  metaCard: {
    padding: 12,
    borderRadius: 14,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(148,163,184,0.18)",
  },
  metaLabel: {
    display: "block",
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metaValue: {
    color: "#fff",
    fontSize: 15,
  },
  ownerBlock: {
    padding: 14,
    borderRadius: 16,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(148,163,184,0.18)",
  },
  ownerValue: {
    display: "block",
    fontSize: 18,
    color: "#fff",
    marginBottom: 4,
  },
  ownerSub: {
    color: "#cbd5e1",
    fontSize: 13,
  },
  columns: {
    marginTop: 18,
    display: "grid",
    gridTemplateColumns: "1.2fr 0.55fr",
    gap: 18,
  },
  leftColumn: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  rightColumn: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  sectionCard: {
    borderRadius: 20,
    padding: 20,
    background: "rgba(255,255,255,0.94)",
    border: "1px solid rgba(203,213,225,0.9)",
    boxShadow: "0 14px 28px rgba(15,23,42,0.08)",
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: 22,
  },
  sectionHint: {
    margin: "6px 0 0",
    color: "#475569",
    fontSize: 13,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
    marginBottom: 14,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: 800,
    color: "#334155",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    width: "100%",
    border: "1px solid rgba(148,163,184,0.7)",
    borderRadius: 14,
    padding: "13px 14px",
    background: "#fff",
    color: "#0f172a",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    border: "1px solid rgba(148,163,184,0.7)",
    borderRadius: 14,
    padding: 14,
    background: "#fff",
    color: "#0f172a",
    fontSize: 14,
    outline: "none",
    resize: "vertical",
    boxSizing: "border-box",
  },
  summaryStrip: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
    border: "1px solid rgba(203,213,225,0.8)",
  },
  summaryValue: {
    display: "block",
    color: "#0f172a",
    fontSize: 18,
    marginTop: 4,
  },
  agreementPaper: {
    borderRadius: 18,
    padding: 18,
    background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
    border: "1px solid rgba(203,213,225,0.95)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
  },
  agreementTitleRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 14,
  },
  agreementBadge: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    padding: "7px 12px",
    background: "linear-gradient(180deg, #0f172a 0%, #111827 100%)",
    color: "#fff",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.3,
  },
  agreementMeta: {
    color: "#475569",
    fontSize: 13,
  },
  agreementTextBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    maxHeight: 280,
    overflowY: "auto",
    paddingRight: 6,
  },
  agreementParagraph: {
    margin: 0,
    color: "#0f172a",
    fontSize: 14,
    lineHeight: 1.65,
  },
  signatureBlock: {
    marginTop: 16,
    paddingTop: 16,
    borderTop: "1px dashed rgba(148,163,184,0.8)",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  signaturePreview: {
    minHeight: 54,
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.7)",
    background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
    color: "#111827",
    fontFamily: "cursive",
    fontSize: 24,
    letterSpacing: 0.4,
  },
  checkboxRow: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    color: "#334155",
    fontSize: 14,
    lineHeight: 1.5,
  },
  signatureFooter: {
    display: "flex",
    gap: 12,
    alignItems: "flex-end",
    flexWrap: "wrap",
  },
  button: {
    border: "none",
    borderRadius: 16,
    background: "linear-gradient(180deg, #0f172a 0%, #111827 100%)",
    color: "#fff",
    padding: "14px 18px",
    cursor: "pointer",
    fontWeight: 800,
    boxShadow: "0 14px 24px rgba(15,23,42,0.18)",
    minWidth: 210,
  },
  buttonDisabled: {
    border: "none",
    borderRadius: 16,
    background: "linear-gradient(180deg, #94a3b8 0%, #64748b 100%)",
    color: "#fff",
    padding: "14px 18px",
    cursor: "not-allowed",
    fontWeight: 800,
    minWidth: 210,
  },
  sideCard: {
    borderRadius: 20,
    padding: 18,
    background: "rgba(255,255,255,0.94)",
    border: "1px solid rgba(203,213,225,0.9)",
    boxShadow: "0 14px 28px rgba(15,23,42,0.08)",
  },
  sideTitle: {
    margin: "0 0 12px",
    color: "#0f172a",
    fontSize: 18,
  },
  list: {
    margin: 0,
    paddingLeft: 18,
    color: "#334155",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "10px 0",
    borderBottom: "1px solid rgba(226,232,240,0.9)",
    color: "#334155",
  },
  message: {
    margin: "18px 0 0",
    padding: "14px 16px",
    borderRadius: 14,
    background: "linear-gradient(180deg, #ecfdf5 0%, #d1fae5 100%)",
    border: "1px solid rgba(167,243,208,0.9)",
    color: "#065f46",
    fontWeight: 700,
  },
  loading: {
    padding: 20,
  },
  error: {
    padding: 20,
    color: "#991b1b",
  },
};