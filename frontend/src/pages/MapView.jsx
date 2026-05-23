import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { AuthContext } from "../context/auth-context";
import { LiveLocationContext } from "../context/live-location-context";
import api from "../services/api";

const statusLabelMap = {
  idle: "Waiting for login...",
  unsupported: "Geolocation is not supported by this browser.",
  "token-missing": "Login token is missing. Please login again.",
  connecting: "Connecting to realtime location channel...",
  connected: "Connected. Waiting for location updates...",
  sharing: "Live location is being shared.",
  "socket-error": "Realtime connection failed. Retrying automatically.",
  "permission-denied": "Location permission denied. Enable permission to share location.",
  "location-error": "Unable to read device location right now.",
};

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function MapZoomController({ center, zoom }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom, { animate: true, duration: 1 });
  }, [center, zoom, map]);

  return null;
}

function OwnerItemsPreview({ state }) {
  if (!state || state.loading) {
    return <p style={styles.popupLine}>Loading listed items...</p>;
  }

  if (state.error) {
    return <p style={styles.popupLine}>{state.error}</p>;
  }

  const items = Array.isArray(state.items) ? state.items : [];
  if (items.length === 0) {
    return <p style={styles.popupLine}>No available listings right now.</p>;
  }

  return (
    <div style={styles.popupItemsWrap}>
      {items.slice(0, 6).map((item) => (
        <div key={item._id} style={styles.popupItemThumb} title={item.title}>
          {item.images?.[0] ? (
            <img src={item.images[0]} alt={item.title} style={styles.popupItemThumbImg} />
          ) : (
            <span style={styles.popupItemThumbFallback}>Tool</span>
          )}
        </div>
      ))}
    </div>
  );
}

function MapView() {
  const { user } = useContext(AuthContext);
  const { myLocation, otherUsers, status, permissionRequired } = useContext(LiveLocationContext);

  const [mapZoom, setMapZoom] = useState(12);
  const [itemScope, setItemScope] = useState("nearby");
  const [radiusKm, setRadiusKm] = useState(10);
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsMessage, setItemsMessage] = useState("");
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [usersMessage, setUsersMessage] = useState("");
  const [ownerItemsByUser, setOwnerItemsByUser] = useState({});
  const didFitRef = useRef(false);

  const hasCoordinates = Number.isFinite(Number(myLocation?.lat)) && Number.isFinite(Number(myLocation?.lng));
  const resolvedCity = String(user?.city || myLocation?.city || "").trim();

  useEffect(() => {
    if (!hasCoordinates || didFitRef.current) return;

    didFitRef.current = true;
    setMapZoom(15);
    window.setTimeout(() => {
      setMapZoom(12);
    }, 650);
  }, [hasCoordinates]);

  useEffect(() => {
    let cancelled = false;

    const fetchItems = async () => {
      try {
        setItemsLoading(true);
        setItemsMessage("");

        if (itemScope === "nearby") {
          if (!hasCoordinates) {
            setItems([]);
            setItemsMessage("Waiting for your location before loading nearby items.");
            return;
          }

          const response = await api.get("/items/nearby", {
            params: {
              lat: Number(myLocation.lat),
              lng: Number(myLocation.lng),
              radiusKm,
            },
          });

          if (!cancelled) {
            setItems(Array.isArray(response.data) ? response.data : []);
          }
          return;
        }

        if (itemScope === "city") {
          if (!resolvedCity) {
            setItems([]);
            setItemsMessage("City is not available yet. Enable location or set city in profile.");
            return;
          }

          const response = await api.get("/items", {
            params: {
              city: resolvedCity,
              availability: "available",
            },
          });

          if (!cancelled) {
            setItems(Array.isArray(response.data) ? response.data : []);
          }
          return;
        }

        const response = await api.get("/items", {
          params: { availability: "available" },
        });

        if (!cancelled) {
          setItems(Array.isArray(response.data) ? response.data : []);
        }
      } catch (error) {
        if (!cancelled) {
          setItems([]);
          setItemsMessage(error?.response?.data?.message || "Failed to load item markers.");
        }
      } finally {
        if (!cancelled) {
          setItemsLoading(false);
        }
      }
    };

    fetchItems();

    return () => {
      cancelled = true;
    };
  }, [itemScope, radiusKm, hasCoordinates, myLocation.lat, myLocation.lng, resolvedCity]);

  useEffect(() => {
    let cancelled = false;

    const fetchRegisteredUsers = async () => {
      try {
        setUsersMessage("");
        const response = await api.get("/auth/users-locations");
        if (cancelled) return;
        setRegisteredUsers(Array.isArray(response.data?.users) ? response.data.users : []);
      } catch (error) {
        if (!cancelled) {
          setUsersMessage(error?.response?.data?.message || "Failed to load registered user markers.");
          setRegisteredUsers([]);
        }
      }
    };

    fetchRegisteredUsers();
    const intervalId = window.setInterval(fetchRegisteredUsers, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const loadOwnerItems = useCallback(async (ownerId) => {
    if (!ownerId) return;

    let shouldFetch = false;
    setOwnerItemsByUser((prev) => {
      if (prev[ownerId]) return prev;
      shouldFetch = true;
      return {
        ...prev,
        [ownerId]: {
          loading: true,
          error: "",
          items: [],
        },
      };
    });

    if (!shouldFetch) return;

    try {
      const response = await api.get(`/items/by-owner/${ownerId}`, {
        params: {
          limit: 6,
          availability: "available",
        },
      });

      setOwnerItemsByUser((prev) => ({
        ...prev,
        [ownerId]: {
          loading: false,
          error: "",
          items: Array.isArray(response.data) ? response.data : [],
        },
      }));
    } catch (error) {
      setOwnerItemsByUser((prev) => ({
        ...prev,
        [ownerId]: {
          loading: false,
          error: error?.response?.data?.message || "Unable to load listings.",
          items: [],
        },
      }));
    }
  }, []);

  const markerIcon = useMemo(() => {
    const name = String(user?.name || user?.email || "You").trim();
    const initials =
      name
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
          <div style="width:58px;height:58px;border-radius:50%;background:linear-gradient(180deg,#ffffff 0%,#f3f4f6 100%);border:3px solid #111827;box-shadow:0 14px 30px rgba(17,24,39,.22);display:flex;align-items:center;justify-content:center;overflow:hidden;transform:translateY(0);transition:transform .22s ease, box-shadow .22s ease;">
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

  const liveUsersById = useMemo(() => {
    const map = new Map();
    otherUsers.forEach((entry) => {
      const id = String(entry?.userId || "");
      if (!id) return;
      map.set(id, entry);
    });
    return map;
  }, [otherUsers]);

  const visibleNetworkUsers = useMemo(() => {
    const selfId = String(user?._id || "");
    return registeredUsers
      .map((entry) => {
        const id = String(entry?.userId || "");
        const liveEntry = liveUsersById.get(id);
        const lat = Number(liveEntry?.lat ?? entry?.lat);
        const lng = Number(liveEntry?.lng ?? entry?.lng);

        return {
          userId: id,
          name: String(entry?.name || liveEntry?.name || "User"),
          email: String(entry?.email || liveEntry?.email || ""),
          city: String(entry?.city || ""),
          profileImage: String(entry?.profileImage || ""),
          lat,
          lng,
          updatedAt: String(liveEntry?.updatedAt || entry?.updatedAt || ""),
          online: Boolean(liveEntry)
        };
      })
      .filter((entry) => entry.userId && entry.userId !== selfId)
      .filter((entry) => Number.isFinite(entry.lat) && Number.isFinite(entry.lng));
  }, [liveUsersById, registeredUsers, user?._id]);

  const otherUserIcons = useMemo(() => {
    const cache = new Map();
    for (const u of visibleNetworkUsers) {
      const id = String(u?.userId || "");
      if (!id || cache.has(id)) continue;

      const label = String(u?.name || u?.email || "User").trim();
      const initials =
        label
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0])
          .join("")
          .toUpperCase() || "U";

      cache.set(
        id,
        L.divIcon({
          className: "",
          html: `
            <div style="display:flex;flex-direction:column;align-items:center;gap:0;">
              <div style="width:46px;height:46px;border-radius:50%;background:linear-gradient(180deg,#ffffff 0%,#f3f4f6 100%);border:3px solid ${u.online ? "#15803d" : "#475569"};box-shadow:0 12px 24px rgba(17,24,39,.18);display:flex;align-items:center;justify-content:center;overflow:hidden;transform:translateY(0);transition:transform .22s ease, box-shadow .22s ease;">
                ${u.profileImage
                  ? `<img src="${escapeHtml(u.profileImage)}" alt="${escapeHtml(label)}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;display:block;" />`
                  : `<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(180deg,#6b7280 0%,#111827 100%);color:#fff;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center;letter-spacing:.4px;">${initials}</div>`}
              </div>
              <div style="width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;border-top:14px solid ${u.online ? "#15803d" : "#475569"};margin-top:-2px;"></div>
            </div>
          `,
          iconSize: [46, 62],
          iconAnchor: [23, 58],
          popupAnchor: [0, -52],
        })
      );
    }
    return cache;
  }, [visibleNetworkUsers]);

  const itemIcons = useMemo(() => {
    const cache = new Map();

    items.forEach((item) => {
      const id = String(item?._id || "");
      if (!id || cache.has(id)) return;

      const image = item?.images?.[0] ? escapeHtml(item.images[0]) : "";
      const title = escapeHtml(item?.title || "Tool");

      cache.set(
        id,
        L.divIcon({
          className: "",
          html: `
            <div style="display:flex;flex-direction:column;align-items:center;gap:0;">
              <div style="width:48px;height:48px;border-radius:14px;background:linear-gradient(180deg,#ecfeff 0%,#cffafe 100%);border:2px solid #0f172a;box-shadow:0 12px 24px rgba(15,23,42,.2);display:flex;align-items:center;justify-content:center;overflow:hidden;">
                ${
                  image
                    ? `<img src="${image}" alt="${title}" style="width:48px;height:48px;object-fit:cover;" />`
                    : `<span style="font-size:18px;line-height:1;">Tool</span>`
                }
              </div>
              <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:12px solid #0f172a;margin-top:-2px;"></div>
            </div>
          `,
          iconSize: [48, 62],
          iconAnchor: [24, 58],
          popupAnchor: [0, -52],
        })
      );
    });

    return cache;
  }, [items]);

  const mapCenter = useMemo(() => {
    if (!hasCoordinates) {
      return [20, 0];
    }

    return [Number(myLocation.lat), Number(myLocation.lng)];
  }, [hasCoordinates, myLocation.lat, myLocation.lng]);

  const visibleItems = useMemo(() => {
    return items
      .filter((item) => Array.isArray(item?.location?.coordinates) && item.location.coordinates.length === 2)
      .map((item) => {
        const [lng, lat] = item.location.coordinates;
        return {
          ...item,
          lat: Number(lat),
          lng: Number(lng),
        };
      })
      .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));
  }, [items]);

  const zoomLabel = mapZoom >= 14 ? "Local region" : mapZoom >= 11 ? "City view" : "World view";
  const statusText = statusLabelMap[status] || "Live location status unknown.";

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <p style={styles.eyebrow}>Map View</p>
            <h1 style={styles.title}>Live map with users and rentable items</h1>
            <p style={styles.subtitle}>
              Track people and inventory in real time. Switch between nearby, city, and global item scopes.
            </p>
          </div>
          <Link to="/" style={styles.backLink}>
            <span aria-hidden="true">&lt;-</span>
            <span>Return to listings</span>
          </Link>
        </div>

        <div style={styles.toolbar}>
          <div style={styles.segmentWrap}>
            <button
              type="button"
              style={itemScope === "nearby" ? styles.segmentButtonActive : styles.segmentButton}
              onClick={() => setItemScope("nearby")}
            >
              Nearby
            </button>
            <button
              type="button"
              style={itemScope === "city" ? styles.segmentButtonActive : styles.segmentButton}
              onClick={() => setItemScope("city")}
            >
              My city
            </button>
            <button
              type="button"
              style={itemScope === "global" ? styles.segmentButtonActive : styles.segmentButton}
              onClick={() => setItemScope("global")}
            >
              Global
            </button>
          </div>

          {itemScope === "nearby" ? (
            <label style={styles.radiusLabel}>
              Radius
              <select
                value={radiusKm}
                onChange={(event) => setRadiusKm(Number(event.target.value))}
                style={styles.radiusSelect}
              >
                {[1, 2, 5, 10, 25, 50].map((value) => (
                  <option key={value} value={value}>
                    {value} km
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <div style={styles.mapFrame}>
          <MapContainer center={mapCenter} zoom={mapZoom} style={styles.map} scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapZoomController center={mapCenter} zoom={mapZoom} />

            {hasCoordinates ? (
              <Marker position={mapCenter} icon={markerIcon}>
                <Popup>
                  <div style={styles.popup}>
                    <strong>{user?.name || "Your profile"}</strong>
                    <p style={styles.popupLine}>{resolvedCity || "Current location"}</p>
                    <p style={styles.popupLine}>
                      {Number(myLocation.lat).toFixed(5)}, {Number(myLocation.lng).toFixed(5)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ) : null}

            {visibleNetworkUsers.map((u) => {
              const ownerState = ownerItemsByUser[u.userId];
              const listingCount = ownerState?.items?.length ?? "--";

              return (
                <Marker
                  key={u.userId}
                  position={[u.lat, u.lng]}
                  icon={otherUserIcons.get(u.userId) || undefined}
                  eventHandlers={{
                    popupopen: () => loadOwnerItems(u.userId),
                  }}
                >
                  <Popup>
                    <div style={styles.popup}>
                      <strong>{u.name}</strong>
                      <p style={styles.popupLine}>{u.online ? "Online" : "Offline"}</p>
                      <p style={styles.popupLine}>Listings: {listingCount}</p>
                      {u.updatedAt ? (
                        <p style={styles.popupLine}>Updated: {new Date(u.updatedAt).toLocaleTimeString()}</p>
                      ) : null}
                      <OwnerItemsPreview state={ownerState} />
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {visibleItems.map((item) => (
              <Marker key={item._id} position={[item.lat, item.lng]} icon={itemIcons.get(item._id) || undefined}>
                <Popup>
                  <div style={styles.itemPopup}>
                    <div style={styles.itemPopupImageWrap}>
                      {item.images?.[0] ? (
                        <img src={item.images[0]} alt={item.title} style={styles.itemPopupImage} />
                      ) : (
                        <div style={styles.itemPopupFallback}>Tool</div>
                      )}
                    </div>
                    <strong style={styles.itemTitle}>{item.title}</strong>
                    <p style={styles.popupLine}>INR {item.pricePerDay}/day</p>
                    <p style={styles.popupLine}>{item.city || "Unknown city"}</p>
                    <Link to={`/items/${item._id}`} style={styles.itemPopupLink}>
                      View details
                    </Link>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <div style={styles.infoRow}>
          <div style={styles.infoCard}>
            <span style={styles.infoLabel}>Status</span>
            <span style={styles.infoValue}>{statusText}</span>
          </div>
          <div style={styles.infoCard}>
            <span style={styles.infoLabel}>Map mode</span>
            <span style={styles.infoValue}>{zoomLabel}</span>
          </div>
          <div style={styles.infoCard}>
            <span style={styles.infoLabel}>Location & data</span>
            <span style={styles.infoValue}>
              {resolvedCity || hasCoordinates
                ? resolvedCity || `${Number(myLocation.lat).toFixed(5)}, ${Number(myLocation.lng).toFixed(5)}`
                : "Waiting for coordinates..."}
            </span>
            <span style={styles.infoMeta}>
              Users: {visibleNetworkUsers.length} | Items: {visibleItems.length}
            </span>
            {itemsLoading ? <span style={styles.infoMeta}>Loading item layer...</span> : null}
            {itemsMessage ? <span style={styles.infoMeta}>{itemsMessage}</span> : null}
            {usersMessage ? <span style={styles.infoMeta}>{usersMessage}</span> : null}
            {permissionRequired ? (
              <span style={styles.infoMeta}>Location permission is required for live sharing.</span>
            ) : null}
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
    background: "radial-gradient(1400px 460px at 50% -10%, #ffffff 0%, #eef2ff 36%, #e2e8f0 100%)",
    padding: "24px 16px",
  },
  card: {
    maxWidth: 1140,
    margin: "0 auto",
    background: "linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(241,245,249,0.88) 100%)",
    border: "1px solid rgba(203,213,225,0.95)",
    borderRadius: 18,
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.1)",
    padding: 20,
    backdropFilter: "blur(16px) saturate(150%)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  eyebrow: {
    margin: 0,
    color: "#475569",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: {
    margin: "6px 0 0",
    color: "#0f172a",
    fontSize: 30,
  },
  subtitle: {
    margin: "8px 0 0",
    color: "#334155",
    fontSize: 14,
    maxWidth: 700,
  },
  toolbar: {
    marginBottom: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  segmentWrap: {
    display: "inline-flex",
    alignItems: "center",
    background: "rgba(255,255,255,0.8)",
    border: "1px solid rgba(209,213,219,0.9)",
    borderRadius: 999,
    padding: 4,
    gap: 4,
  },
  segmentButton: {
    border: "none",
    borderRadius: 999,
    padding: "8px 14px",
    background: "transparent",
    color: "#374151",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
  },
  segmentButtonActive: {
    border: "none",
    borderRadius: 999,
    padding: "8px 14px",
    background: "linear-gradient(180deg, #0f172a 0%, #111827 100%)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
    boxShadow: "0 8px 16px rgba(15,23,42,0.2)",
  },
  radiusLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    fontWeight: 700,
    color: "#374151",
  },
  radiusSelect: {
    border: "1px solid rgba(156,163,175,0.8)",
    borderRadius: 999,
    padding: "8px 12px",
    background: "#fff",
    color: "#111827",
    fontWeight: 700,
    fontSize: 13,
    outline: "none",
  },
  backLink: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    border: "1px solid rgba(148,163,184,0.7)",
    borderRadius: 999,
    background: "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(241,245,249,0.9) 100%)",
    color: "#0f172a",
    textDecoration: "none",
    padding: "10px 16px",
    fontWeight: 700,
    boxShadow: "0 10px 22px rgba(15,23,42,0.12)",
  },
  mapFrame: {
    border: "1px solid rgba(203,213,225,0.95)",
    borderRadius: 16,
    overflow: "hidden",
    background: "rgba(226,232,240,0.7)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
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
    border: "1px solid rgba(226,232,240,0.95)",
    borderRadius: 12,
    background: "rgba(248,250,252,0.9)",
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    backdropFilter: "blur(10px)",
  },
  infoLabel: {
    color: "#475569",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: 700,
  },
  infoMeta: {
    color: "#475569",
    fontSize: 12,
  },
  popup: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minWidth: 200,
  },
  popupLine: {
    margin: 0,
    color: "#475569",
    fontSize: 13,
  },
  popupItemsWrap: {
    marginTop: 8,
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 6,
  },
  popupItemThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: "hidden",
    border: "1px solid rgba(203,213,225,0.8)",
    background: "#f8fafc",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  popupItemThumbImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  popupItemThumbFallback: {
    fontSize: 10,
    fontWeight: 700,
    color: "#334155",
  },
  itemPopup: {
    minWidth: 190,
    display: "flex",
    flexDirection: "column",
    gap: 7,
  },
  itemPopupImageWrap: {
    width: "100%",
    height: 96,
    borderRadius: 10,
    overflow: "hidden",
    border: "1px solid rgba(203,213,225,0.85)",
    background: "#f1f5f9",
  },
  itemPopupImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  itemPopupFallback: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#0f172a",
    fontWeight: 800,
    fontSize: 13,
  },
  itemTitle: {
    color: "#111827",
  },
  itemPopupLink: {
    color: "#0f766e",
    fontWeight: 700,
    textDecoration: "none",
  },
};
