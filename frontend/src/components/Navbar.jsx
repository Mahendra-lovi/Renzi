import { useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

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
            ←
          </button>
        )}

        <button onClick={onMenu} style={styles.menuBtn}>☰</button>
        <h2 style={styles.brand}>Renzi</h2>
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
    height: 60,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 20px",
    background: "#111827",
    color: "#fff",
  },

  left: { display: "flex", alignItems: "center", gap: 12 },

  backBtn: {
    background: "none",
    border: "none",
    color: "#fff",
    fontSize: 22,
    cursor: "pointer",
  },

  menuBtn: {
    background: "none",
    border: "none",
    color: "#fff",
    fontSize: 22,
    cursor: "pointer",
  },

  brand: { fontWeight: 700 },

  profileBox: { cursor: "pointer" },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
  },
};