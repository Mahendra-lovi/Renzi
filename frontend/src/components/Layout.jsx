import { useEffect, useRef, useState } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

function Layout() {
  const [open, setOpen] = useState(false);
  const [backMounted, setBackMounted] = useState(false);
  const [backVisible, setBackVisible] = useState(false);
  const hideVisibleTimerRef = useRef(null);
  const hideUnmountTimerRef = useRef(null);
  const showTimerRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const showFloatingBack = location.pathname !== "/";

  useEffect(() => {
    if (hideVisibleTimerRef.current) {
      clearTimeout(hideVisibleTimerRef.current);
      hideVisibleTimerRef.current = null;
    }

    if (hideUnmountTimerRef.current) {
      clearTimeout(hideUnmountTimerRef.current);
      hideUnmountTimerRef.current = null;
    }

    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }

    if (showFloatingBack) {
      showTimerRef.current = setTimeout(() => {
        setBackMounted(true);
        requestAnimationFrame(() => setBackVisible(true));
      }, 0);
      return;
    }

    hideVisibleTimerRef.current = setTimeout(() => {
      setBackVisible(false);
    }, 0);

    hideUnmountTimerRef.current = setTimeout(() => {
      setBackMounted(false);
    }, 220);

    return () => {
      if (hideVisibleTimerRef.current) {
        clearTimeout(hideVisibleTimerRef.current);
        hideVisibleTimerRef.current = null;
      }
      if (hideUnmountTimerRef.current) {
        clearTimeout(hideUnmountTimerRef.current);
        hideUnmountTimerRef.current = null;
      }
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }
    };
  }, [showFloatingBack]);

  const floatingBackStyle = {
    ...styles.floatingBackBtn,
    opacity: backVisible ? 1 : 0,
    transform: backVisible ? "translateY(0) scale(1)" : "translateY(-8px) scale(0.98)",
    pointerEvents: backVisible ? "auto" : "none",
  };

  return (
    <>
      <Navbar onMenu={() => setOpen(true)} />
      <Sidebar open={open} onClose={() => setOpen(false)} />

      {backMounted && (
        <button type="button" onClick={() => navigate(-1)} style={floatingBackStyle}>
          <span aria-hidden="true">←</span>
          <span>Back</span>
        </button>
      )}

      <main style={styles.content}>
        <Outlet />
      </main>
    </>
  );
}

export default Layout;

const styles = {
  content: {
    padding: "24px 18px 36px",
    background: "radial-gradient(1200px 420px at 50% -5%, #ffffff 0%, #f3f4f6 42%, #e5e7eb 100%)",
    minHeight: "calc(100vh - 60px)",
  },
  floatingBackBtn: {
    position: "fixed",
    top: 76,
    left: 14,
    zIndex: 920,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    border: "1px solid rgba(156, 163, 175, 0.78)",
    borderRadius: 999,
    background: "linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(238,242,247,0.66) 100%)",
    backdropFilter: "blur(18px) saturate(150%)",
    color: "#111827",
    padding: "8px 12px",
    boxShadow: "0 12px 24px rgba(17,24,39,0.15), 0 0 24px rgba(107,114,128,0.26)",
    cursor: "pointer",
    fontWeight: 700,
    transition: "transform 220ms ease, opacity 220ms ease, box-shadow 220ms ease, background 220ms ease, backdrop-filter 220ms ease",
  },
};
