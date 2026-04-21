import { useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/auth-context";

function Navbar({ onMenu }) {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const showBack = location.pathname !== "/";

  return (
    <header style={styles.header}>
      <div style={styles.left}>
        {showBack && (
          <button onClick={() => navigate(-1)} style={styles.backBtn}>
            Back
          </button>
        )}

        <button onClick={onMenu} style={styles.menuBtn}>Menu</button>
        <h2 style={styles.brand}>Renzi Marketplace</h2>
      </div>

      <div style={styles.profileBox} onClick={() => navigate("/profile")}>
        <div style={styles.avatar}>
          {user?.name?.charAt(0).toUpperCase() || "U"}
        </div>
      </div>
    </header>
  );
}

export default Navbar;

const styles = {
  header: {
    height: 68,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
    background: "#f9fafb",
    borderBottom: "1px solid #d1d5db",
    color: "#111827",
    position: "sticky",
    top: 0,
    zIndex: 900,
  },

  left: { display: "flex", alignItems: "center", gap: 10 },

  backBtn: {
    background: "#e5e7eb",
    border: "1px solid #d1d5db",
    color: "#1f2937",
    fontSize: 14,
    padding: "8px 10px",
    borderRadius: 8,
    cursor: "pointer",
  },

  menuBtn: {
    background: "#374151",
    border: "none",
    color: "#fff",
    fontSize: 14,
    padding: "8px 12px",
    borderRadius: 8,
    cursor: "pointer",
  },

  brand: { fontWeight: 700, margin: 0, fontSize: 18 },

  profileBox: { cursor: "pointer" },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    border: "1px solid #9ca3af",
    background: "#d1d5db",
    color: "#111827",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
  },
};