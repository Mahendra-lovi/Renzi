import { useContext } from "react";
import { AuthContext } from "../context/auth-context";
import { useNavigate } from "react-router-dom";

function Sidebar({ open, onClose }) {
  const { logout, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const go = (path) => {
    navigate(path);
    onClose();
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      {/* Overlay */}
      {open && <div onClick={onClose} style={styles.overlay} />}

      {/* Sidebar */}
      <aside
        style={{
          ...styles.sidebar,
          transform: open ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        <div style={styles.sidebarHeader}>
          <h3 style={styles.sidebarTitle}>Navigation</h3>
          <button style={styles.closeBtn} onClick={onClose}>Close</button>
        </div>

        {/* Scrollable Content */}
        <div style={styles.content}>
          <button style={styles.link} onClick={() => go("/")}>Home</button>
          <button style={styles.link} onClick={() => go("/add-item")}>Add Listing</button>
          <button style={styles.link} onClick={() => go("/my-listings")}>My Listings</button>
          <button style={styles.link} onClick={() => go("/my-rentals")}>My Rentals</button>
          <button style={styles.link} onClick={() => go("/owner-requests")}>Rental Requests</button>

          {/* ✅ ADMIN ONLY */}
          {user?.role === "admin" && (
            <button style={styles.link} onClick={() => go("/admin")}>Admin Panel</button>
          )}
        </div>

        {/* Fixed Footer */}
        <div style={styles.footer}>
          <button style={styles.logoutBtn} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(17,24,39,0.28)",
    zIndex: 999,
  },

  sidebar: {
    position: "fixed",
    top: 0,
    left: 0,
    width: 290,
    height: "100dvh",
    background: "#f9fafb",
    color: "#111827",
    padding: "16px 16px 24px",
    display: "flex",
    flexDirection: "column",
    borderRight: "1px solid #d1d5db",
    boxShadow: "8px 0 20px rgba(0,0,0,0.08)",
    zIndex: 1000,
  },

  sidebarHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  sidebarTitle: {
    margin: 0,
    fontSize: 16,
    color: "#111827",
  },

  closeBtn: {
    background: "#e5e7eb",
    border: "1px solid #d1d5db",
    color: "#111827",
    fontSize: 13,
    padding: "6px 10px",
    borderRadius: 8,
    cursor: "pointer",
  },

  content: {
    flex: 1,
    marginTop: 8,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    overflowY: "auto",
  },

  footer: {
    paddingTop: 10,
    paddingBottom: 20,
  },

  link: {
    textAlign: "left",
    border: "1px solid #d1d5db",
    background: "#f3f4f6",
    color: "#1f2937",
    borderRadius: 10,
    padding: "10px 12px",
    cursor: "pointer",
    fontSize: 15,
  },

  logoutBtn: {
    width: "100%",
    background: "#991b1b",
    border: "none",
    padding: 12,
    color: "#fff",
    borderRadius: 6,
    cursor: "pointer",
  },
};