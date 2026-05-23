import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { AuthContext } from "./auth-context";
import { LiveLocationContext } from "./live-location-context";
import api from "../services/api";

const MOVEMENT_THRESHOLD_METERS = 25;
const UPDATE_INTERVAL_MS = 3000;

const toRad = (deg) => (deg * Math.PI) / 180;

const distanceInMeters = (a, b) => {
  if (!a || !b) return Number.POSITIVE_INFINITY;

  const earthRadius = 6371000;
  const dLat = toRad(Number(b.lat) - Number(a.lat));
  const dLng = toRad(Number(b.lng) - Number(a.lng));
  const lat1 = toRad(Number(a.lat));
  const lat2 = toRad(Number(b.lat));

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return earthRadius * c;
};

export function LiveLocationProvider({ children }) {
  const { isAuthenticated } = useContext(AuthContext);
  const [myLocation, setMyLocation] = useState({
    lat: null,
    lng: null,
    city: "",
    accuracy: null,
    updatedAt: null,
  });
  const [otherUsers, setOtherUsers] = useState([]);
  const [status, setStatus] = useState("idle");

  const socketRef = useRef(null);
  const watchIdRef = useRef(null);
  const reverseAbortRef = useRef(null);
  const lastSentRef = useRef({ ts: 0, lat: null, lng: null });
  const didLookupCityRef = useRef(false);
  const latestCityRef = useRef("");

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!navigator.geolocation) return;

    const token = localStorage.getItem("renzi_token");
    if (!token) return;

    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
    const socketUrl = String(apiBase).replace(/\/api\/?$/, "");

    const socket = io(socketUrl, { auth: { token } });
    socketRef.current = socket;

    socket.on("connect", () => {
      setStatus("connected");
    });

    socket.on("locations:sync", (payload) => {
      setOtherUsers(Array.isArray(payload?.users) ? payload.users : []);
    });

    socket.on("locations:update", (payload) => {
      setOtherUsers(Array.isArray(payload?.users) ? payload.users : []);
    });

    socket.on("connect_error", () => {
      setStatus("socket-error");
    });

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const next = {
          lat: Number(position.coords.latitude),
          lng: Number(position.coords.longitude),
          accuracy: Number(position.coords.accuracy),
          updatedAt: new Date().toISOString(),
        };

        setMyLocation((prev) => ({
          ...prev,
          ...next,
        }));

        const now = Date.now();
        const timeElapsed = now - lastSentRef.current.ts;
        const moved = distanceInMeters(
          { lat: lastSentRef.current.lat, lng: lastSentRef.current.lng },
          { lat: next.lat, lng: next.lng }
        );

        const shouldSend =
          !Number.isFinite(lastSentRef.current.lat) ||
          !Number.isFinite(lastSentRef.current.lng) ||
          timeElapsed >= UPDATE_INTERVAL_MS ||
          moved >= MOVEMENT_THRESHOLD_METERS;

        if (shouldSend) {
          socket.emit("location:update", {
            lat: next.lat,
            lng: next.lng,
            accuracy: next.accuracy,
          });

          api.patch("/auth/location", {
            lat: next.lat,
            lng: next.lng,
            city: latestCityRef.current,
          }).catch(() => {
            // Keep realtime map flow even if persistence fails transiently.
          });

          lastSentRef.current = {
            ts: now,
            lat: next.lat,
            lng: next.lng,
          };

          setStatus("sharing");
        }

        if (!didLookupCityRef.current) {
          didLookupCityRef.current = true;
          try {
            reverseAbortRef.current = new AbortController();
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${next.lat}&lon=${next.lng}&format=json`,
              { signal: reverseAbortRef.current.signal }
            );

            if (response.ok) {
              const data = await response.json();
              const city =
                data?.address?.city ||
                data?.address?.town ||
                data?.address?.village ||
                data?.address?.state_district ||
                "";

              if (city) {
                latestCityRef.current = city;
                setMyLocation((prev) => ({ ...prev, city }));

                api.patch("/auth/location", {
                  lat: next.lat,
                  lng: next.lng,
                  city,
                }).catch(() => {
                  // Best-effort city enrichment.
                });
              }
            }
          } catch {
            // Keep live coordinates even if reverse lookup fails.
          }
        }
      },
      (error) => {
        if (error?.code === 1) {
          setStatus("permission-denied");
        } else {
          setStatus("location-error");
        }

        socket.emit("location:stop");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 10000,
      }
    );

    return () => {
      if (reverseAbortRef.current) {
        try {
          reverseAbortRef.current.abort();
        } catch {
          // ignore
        }
      }

      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      socket.emit("location:stop");
      socket.disconnect();

      socketRef.current = null;
      didLookupCityRef.current = false;
      latestCityRef.current = "";
      lastSentRef.current = { ts: 0, lat: null, lng: null };
    };
  }, [isAuthenticated]);

  const value = useMemo(
    () => ({
      myLocation,
      otherUsers,
      status,
      permissionRequired: status === "permission-denied",
    }),
    [myLocation, otherUsers, status]
  );

  return <LiveLocationContext.Provider value={value}>{children}</LiveLocationContext.Provider>;
}
