import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

function Sidebar({ open, onClose }) {
  const { logout } = useContext(AuthContext);
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
    {open && <div onClick={onClose} style={styles.overlay} />}

    <aside
      style={{
        ...styles.sidebar,
        transform: open ? "translateX(0)" : "translateX(-100%)",
      }}
    >
      <button style={styles.closeBtn} onClick={onClose}>×</button>

      {/* ⭐ SCROLLABLE CONTENT */}
      <div style={styles.content}>
        <p style={styles.link} onClick={() => go("/")}>🏠 Home</p>
        <p style={styles.link} onClick={() => go("/add-item")}>➕ Add Listing</p>
        <p style={styles.link} onClick={() => go("/my-listings")}>📦 My Listings</p>
        <p style={styles.link} onClick={() => go("/my-rentals")}>📄 My Rentals</p>
        <p style={styles.link} onClick={() => go("/owner-requests")}>📥 Rental Requests</p>
      </div>

      {/* ⭐ FIXED FOOTER */}
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
    background: "rgba(0,0,0,0.3)",
    zIndex: 999,
  },

sidebar: {
  position: "fixed",
  top: 0,
  left: 0,
  width: 260,
  height: "100dvh",
  background: "#111827",
  color: "#e5e7eb",
  padding: "10px 20px 90px 20px",
  display: "flex",
  flexDirection: "column",
  zIndex: 1000,
},

  closeBtn: {
    background: "none",
    border: "none",
    color: "#fff",
    fontSize: 24,
    cursor: "pointer",
    alignSelf: "flex-end",
  },

  content: {
    flex: 1,
    marginTop: 30,
    display: "flex",
    flexDirection: "column",
    gap: 20,
    overflowY: "auto",   // ⭐ SCROLL AREA
  },

  footer: {
    paddingTop: 10,
    paddingBottom: 20,
  },

  link: {
    cursor: "pointer",
    fontSize: 16,
  },

  logoutBtn: {
    width: "100%",
    background: "#ef4444",
    border: "none",
    padding: 12,
    color: "#fff",
    borderRadius: 6,
    cursor: "pointer",
  },
};