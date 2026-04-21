import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function AddItem() {
  const navigate = useNavigate();

  const isValidHttpUrl = (value = "") => {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  };

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    pricePerDay: "",
    image: "",
    city: "",
    lat: "",
    lng: "",
  });

  const [message, setMessage] = useState("");
  const [locating, setLocating] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage("Geolocation is not supported by this browser");
      return;
    }

    setLocating(true);
    setMessage("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setForm((prev) => ({
          ...prev,
          lat: String(lat),
          lng: String(lng)
        }));

        // Best-effort city lookup; if unavailable, lat/lng still gets saved.
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
              "";

            if (city) {
              setForm((prev) => ({ ...prev, city }));
            }
          }
        } catch {
          // Non-blocking fallback: coordinates are already set.
        }

        setLocating(false);
      },
      () => {
        setLocating(false);
        setMessage("Unable to access location. Please allow location permission.");
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const title = form.title.trim();
    const description = form.description.trim();
    const category = form.category.trim();
    const image = form.image.trim();
    const city = form.city.trim();
    const pricePerDay = Number(form.pricePerDay);
    const lat = form.lat === "" ? undefined : Number(form.lat);
    const lng = form.lng === "" ? undefined : Number(form.lng);

    if (!title || !description || !category || !image) {
      setMessage("Please fill all fields");
      return;
    }

    if (Number.isNaN(pricePerDay) || pricePerDay <= 0) {
      setMessage("Price per day must be greater than 0");
      return;
    }

    if (!isValidHttpUrl(image)) {
      setMessage("Image must be a valid http/https URL");
      return;
    }

    if ((form.lat !== "" && Number.isNaN(lat)) || (form.lng !== "" && Number.isNaN(lng))) {
      setMessage("Latitude and longitude must be valid numbers");
      return;
    }

    try {
      setMessage("");

      await api.post("/items", {
        title,
        description,
        category,
        pricePerDay,
        images: [image],
        city,
        lat,
        lng,
      });

      navigate("/");
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to create item");
    }
  };

  return (
    <div style={styles.container}>
      <h1>Add New Item</h1>

      {message && <p style={styles.message}>{message}</p>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <input name="title" placeholder="Title" value={form.title} onChange={handleChange} required />
        <textarea name="description" placeholder="Description" value={form.description} onChange={handleChange} required />
        <input name="category" placeholder="Category" value={form.category} onChange={handleChange} required />
        <input name="pricePerDay" type="number" placeholder="Price per day" value={form.pricePerDay} onChange={handleChange} required />
        <input name="image" placeholder="Image URL" value={form.image} onChange={handleChange} required />
        <input name="city" placeholder="City (optional)" value={form.city} onChange={handleChange} />
        <input name="lat" type="number" step="any" placeholder="Latitude (optional)" value={form.lat} onChange={handleChange} />
        <input name="lng" type="number" step="any" placeholder="Longitude (optional)" value={form.lng} onChange={handleChange} />

        <button type="button" style={styles.locateBtn} onClick={useCurrentLocation} disabled={locating}>
          {locating ? "Locating..." : "Use Current Location"}
        </button>

        <button style={styles.submitBtn}>Create Listing</button>
      </form>
    </div>
  );
}

export default AddItem;

const styles = {
  container: { padding: 24 },
  message: {
    color: "#b91c1c",
    marginTop: 10,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    maxWidth: 460,
    marginTop: 20,
  },
  locateBtn: {
    border: "1px solid #9ca3af",
    background: "#e5e7eb",
    color: "#1f2937",
    padding: "10px 12px",
    borderRadius: 8,
    cursor: "pointer",
  },
  submitBtn: {
    border: "none",
    background: "#374151",
    color: "#fff",
    padding: "10px 12px",
    borderRadius: 8,
    cursor: "pointer",
  },
};