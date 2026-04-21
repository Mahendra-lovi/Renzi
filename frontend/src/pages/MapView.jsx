import { useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { AuthContext } from "../context/auth-context";

function MapView() {
  const { user } = useContext(AuthContext);
  const [status, setStatus] = useState(() =>
    navigator.geolocation ? "Requesting your location..." : "Geolocation is not supported by this browser."
  );
  const [location, setLocation] = useState({ lat: null, lng: null, city: "" });
  const [mapZoom, setMapZoom] = useState(15);

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setLocation((prev) => ({ ...prev, lat, lng }));
        setMapZoom(15);

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
          );
          if (res.ok) {
            const data = await res.json();
            const city =
              data?.address?.city ||
              data?.address?.town ||
              data?.address?.village ||
              data?.address?.state_district ||
              data?.display_name ||
              "";

            setLocation((prev) => ({ ...prev, city }));
          }
        } catch {
          // Keep coordinates even if reverse lookup fails.
        }

        setStatus("Showing your current position on the map.");
        window.setTimeout(() => {
          setMapZoom(12);
        }, 650);
      },
      () => {
        setStatus("Location permission denied. Enable location to show your map position.");
      }
    );
  }, []);

  const markerIcon = useMemo(() => {
    const name = String(user?.name || user?.email || "You").trim();
    const initials = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "Y";

    return L.divIcon({
      className: "",
      html: `
        <div style="display:flex;flex-direction:column;align-items:center;gap:0;">
          <div style="width:58px;height:58px;border-radius:50%;background:linear-gradient(180deg,#ffffff 0%,#f3f4f6 100%);border:3px solid #111827;box-shadow:0 14px 30px rgba(17,24,39,.22);display:flex;align-items:center;justify-content:center;overflow:hidden;">
            <div style="width:46px;height:46px;border-radius:50%;background:linear-gradient(180deg,#4b5563 0%,#111827 100%);color:#fff;font-weight:800;font-size:16px;display:flex;align-items:center;justify-content:center;letter-spacing:.4px;">${initials}</div>
          </div>
          <div style="width:0;height:0;border-left:11px solid transparent;border-right:11px solid transparent;border-top:16px solid #111827;margin-top:-2px;"></div>
        </div>
      `,
      iconSize: [58, 74],
      iconAnchor: [29, 68],
      popupAnchor: [0, -60],
    });
  }, [user?.email, user?.name]);

  const mapCenter = useMemo(() => {
    if (location.lat == null || location.lng == null) {
      return [20, 0];
    }

    return [Number(location.lat), Number(location.lng)];
  }, [location.lat, location.lng]);

  const hasCoordinates = location.lat != null && location.lng != null;

  const zoomLabel = mapZoom >= 14 ? "Local region" : mapZoom >= 11 ? "City view" : "World view";

  function MapZoomController({ center, zoom }) {
    const map = useMap();

    useEffect(() => {
      map.setView(center, zoom, { animate: true, duration: 1.1 });
    }, [center, zoom, map]);

    return null;
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <p style={styles.eyebrow}>Map View</p>
            <h1 style={styles.title}>Your location on the world map</h1>
            <p style={styles.subtitle}>
              The map centers on your current position so you can see where you are in the world.
            </p>
          </div>
          <Link to="/" style={styles.backLink}>
            <span aria-hidden="true">←</span>
            <span>Return to listings</span>
          </Link>
        </div>

        <div style={styles.mapFrame}>
          <MapContainer center={mapCenter} zoom={mapZoom} style={styles.map} scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {hasCoordinates && (
              <>
                <MapZoomController center={mapCenter} zoom={mapZoom} />
                <Marker position={mapCenter} icon={markerIcon}>
                  <Popup>
                    <div style={styles.popup}>
                      <strong>{user?.name || "Your profile"}</strong>
                      <p style={styles.popupLine}>{location.city || "Current location"}</p>
                      <p style={styles.popupLine}>
                        {Number(location.lat).toFixed(5)}, {Number(location.lng).toFixed(5)}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              </>
            )}
          </MapContainer>
        </div>

        <div style={styles.infoRow}>
          <div style={styles.infoCard}>
            <span style={styles.infoLabel}>Status</span>
            <span style={styles.infoValue}>{status}</span>
          </div>
          <div style={styles.infoCard}>
            <span style={styles.infoLabel}>Map mode</span>
            <span style={styles.infoValue}>{zoomLabel}</span>
          </div>
          <div style={styles.infoCard}>
            <span style={styles.infoLabel}>Location</span>
            <span style={styles.infoValue}>
              {location.city || (location.lat != null && location.lng != null)
                ? location.city || `${Number(location.lat).toFixed(5)}, ${Number(location.lng).toFixed(5)}`
                : "Waiting for coordinates..."}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MapView;

const styles = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(1200px 420px at 50% -5%, #ffffff 0%, #f3f4f6 42%, #e5e7eb 100%)",
    padding: "24px 16px",
  },
  card: {
    maxWidth: 1120,
    margin: "0 auto",
    background: "linear-gradient(180deg, rgba(255,255,255,0.86) 0%, rgba(243,244,246,0.86) 100%)",
    border: "1px solid rgba(209,213,219,0.85)",
    borderRadius: 18,
    boxShadow: "0 16px 36px rgba(17, 24, 39, 0.08)",
    padding: 20,
    backdropFilter: "blur(16px) saturate(140%)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 16,
  },
  eyebrow: {
    margin: 0,
    color: "#6b7280",
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  title: {
    margin: "6px 0 0",
    color: "#111827",
    fontSize: 28,
  },
  subtitle: {
    margin: "8px 0 0",
    color: "#4b5563",
    fontSize: 14,
    maxWidth: 680,
  },
  backLink: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    border: "1px solid rgba(156, 163, 175, 0.8)",
    borderRadius: 999,
    background: "linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(238,242,247,0.88) 100%)",
    color: "#111827",
    textDecoration: "none",
    padding: "10px 16px",
    fontWeight: 700,
    boxShadow: "0 10px 22px rgba(17,24,39,0.1), inset 0 1px 0 rgba(255,255,255,0.28)",
  },
  mapFrame: {
    border: "1px solid rgba(209,213,219,0.9)",
    borderRadius: 16,
    overflow: "hidden",
    background: "rgba(229,231,235,0.7)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.28)",
  },
  map: {
    width: "100%",
    height: 560,
  },
  infoRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
    marginTop: 16,
  },
  infoCard: {
    border: "1px solid rgba(229,231,235,0.95)",
    borderRadius: 12,
    background: "rgba(250,250,250,0.88)",
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    backdropFilter: "blur(12px)",
  },
  infoLabel: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    color: "#111827",
    fontSize: 14,
    fontWeight: 600,
  },
  popup: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minWidth: 160,
  },
  popupLine: {
    margin: 0,
    color: "#4b5563",
    fontSize: 13,
  },
};