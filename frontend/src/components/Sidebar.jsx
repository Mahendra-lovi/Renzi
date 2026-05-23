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
          <button style={styles.link} onClick={() => go("/chats")}>Chats</button>
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
    background: "rgba(17,24,39,0.26)",
    backdropFilter: "blur(5px)",
    zIndex: 999,
  },

  sidebar: {
    position: "fixed",
    top: 0,
    left: 0,
    width: 290,
    height: "100dvh",
    background: "linear-gradient(180deg, rgba(255,255,255,0.84) 0%, rgba(243,244,246,0.84) 100%)",
    color: "#111827",
    padding: "16px 16px 24px",
    display: "flex",
    flexDirection: "column",
    borderRight: "1px solid rgba(209, 213, 219, 0.72)",
    boxShadow: "14px 0 30px rgba(0,0,0,0.16)",
    backdropFilter: "blur(18px) saturate(140%)",
    zIndex: 1000,
    transition: "transform 260ms ease",
  },

  sidebarHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  sidebarTitle: {
    margin: 0,
    fontSize: 17,
    color: "#111827",
    fontWeight: 800,
  },

  closeBtn: {
    background: "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(243,244,246,0.94) 100%)",
    border: "1px solid rgba(203,213,225,0.85)",
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
    border: "1px solid rgba(209,213,219,0.85)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(243,244,246,0.92) 100%)",
    color: "#1f2937",
    borderRadius: 10,
    padding: "11px 12px",
    cursor: "pointer",
    fontSize: 15,
    fontWeight: 600,
  },

  logoutBtn: {
    width: "100%",
    background: "linear-gradient(180deg, #b91c1c 0%, #7f1d1d 100%)",
    border: "none",
    padding: 12,
    color: "#fff",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
  },
};