import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/auth-context";

function Navbar({ onMenu }) {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [floating, setFloating] = useState(false);
  const rafRef = useRef(0);
  const lastFloatingRef = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      if (rafRef.current) {
        return;
      }

      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = 0;
        const nextFloating = window.scrollY > 14;

        if (nextFloating !== lastFloatingRef.current) {
          lastFloatingRef.current = nextFloating;
          setFloating(nextFloating);
        }
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, []);

  const headerStyle = {
    ...styles.header,
    ...(floating ? styles.headerFloating : styles.headerMerged),
  };

  const glowStyle = {
    ...styles.glowBand,
    ...(floating ? styles.glowBandFloating : styles.glowBandMerged),
  };

  const menuBtnStyle = {
    ...styles.menuBtn,
    ...(floating ? styles.menuBtnFloating : styles.menuBtnMerged),
  };

  const avatarStyle = {
    ...styles.avatar,
    ...(floating ? styles.avatarFloating : styles.avatarMerged),
  };

  return (
    <header style={headerStyle}>
      <div style={glowStyle} />
      <div style={styles.left}>
        <button onClick={onMenu} style={menuBtnStyle}>Menu</button>
        <h2 style={styles.brand}>Renzi Marketplace</h2>
      </div>

      <div style={styles.profileBox} onClick={() => navigate("/profile")}>
        <div style={avatarStyle}>
          {user?.profileImage ? (
            <img src={user.profileImage} alt={user?.name || "User"} style={styles.avatarImage} />
          ) : (
            user?.name?.charAt(0).toUpperCase() || "U"
          )}
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
    padding: "0 14px",
    background: "rgba(255, 255, 255, 0.72)",
    borderBottom: "1px solid rgba(209, 213, 219, 0.8)",
    backdropFilter: "blur(12px)",
    color: "#111827",
    position: "sticky",
    top: 0,
    zIndex: 900,
    boxShadow: "0 10px 28px rgba(17, 24, 39, 0.08)",
    overflow: "hidden",
    transition: "all 280ms ease",
    boxSizing: "border-box",
  },

  headerMerged: {
    width: "100%",
    margin: "0 auto",
    borderRadius: 0,
    top: 0,
  },

  headerFloating: {
    width: "min(1200px, calc(100% - 18px))",
    maxWidth: 1200,
    height: 56,
    margin: "8px auto 0",
    borderRadius: 20,
    top: 6,
    border: "1px solid rgba(209, 213, 219, 0.66)",
    boxShadow: "0 16px 38px rgba(17, 24, 39, 0.18), 0 0 34px rgba(107, 114, 128, 0.3)",
    backdropFilter: "blur(24px) saturate(155%)",
    background: "rgba(255, 255, 255, 0.48)",
    padding: "0 16px",
    transform: "translateY(2px) scale(0.98)",
  },

  glowBand: {
    position: "absolute",
    inset: "0 auto auto 0",
    height: 2,
    width: "100%",
    background: "linear-gradient(90deg, transparent 0%, #6b7280 35%, #111827 50%, #6b7280 65%, transparent 100%)",
    opacity: 0.45,
    transition: "all 280ms ease",
  },

  glowBandMerged: {
    opacity: 0.35,
  },

  glowBandFloating: {
    opacity: 1,
    height: 3,
    boxShadow: "0 0 38px rgba(107, 114, 128, 0.7)",
  },

  left: { display: "flex", alignItems: "center", gap: 10, position: "relative", zIndex: 1, minWidth: 0 },

  menuBtn: {
    background: "linear-gradient(180deg, #4b5563 0%, #1f2937 100%)",
    border: "1px solid rgba(55, 65, 81, 0.8)",
    color: "#f9fafb",
    fontSize: 14,
    padding: "7px 11px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 600,
    boxShadow: "0 10px 20px rgba(17, 24, 39, 0.18)",
    transition: "all 220ms ease",
  },

  menuBtnMerged: {
    background: "linear-gradient(180deg, #4b5563 0%, #1f2937 100%)",
    boxShadow: "0 10px 20px rgba(17, 24, 39, 0.18)",
  },

  menuBtnFloating: {
    background: "linear-gradient(180deg, rgba(75, 85, 99, 0.88) 0%, rgba(31, 41, 55, 0.88) 100%)",
    boxShadow: "0 12px 24px rgba(17, 24, 39, 0.22), inset 0 1px 0 rgba(255,255,255,0.16)",
    backdropFilter: "blur(8px)",
  },

  brand: {
    fontWeight: 800,
    margin: 0,
    fontSize: 17,
    letterSpacing: 0.2,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  profileBox: { cursor: "pointer", position: "relative", zIndex: 1 },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    border: "1px solid #9ca3af",
    background: "linear-gradient(180deg, #f9fafb 0%, #d1d5db 100%)",
    color: "#111827",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    boxShadow: "0 6px 16px rgba(17, 24, 39, 0.16)",
    transition: "all 220ms ease",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  avatarMerged: {
    background: "linear-gradient(180deg, #f9fafb 0%, #d1d5db 100%)",
    boxShadow: "0 6px 16px rgba(17, 24, 39, 0.16)",
  },

  avatarFloating: {
    background: "linear-gradient(180deg, rgba(249,250,251,0.88) 0%, rgba(209,213,219,0.88) 100%)",
    boxShadow: "0 10px 22px rgba(17, 24, 39, 0.22), inset 0 1px 0 rgba(255,255,255,0.2)",
    backdropFilter: "blur(8px)",
  },
};