import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function AddItem() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const MAX_IMAGE_BYTES = 900 * 1024;
  const MAX_DIMENSION = 1600;
  const pricePresets = [199, 299, 499, 799, 999, 1499];

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    pricePerDay: "",
    image: "",
    imageName: "",
    city: "",
    lat: "",
    lng: "",
  });

  const [message, setMessage] = useState("");
  const [locationMessage, setLocationMessage] = useState("");
  const [locating, setLocating] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const getDataUrlSizeBytes = (dataUrl = "") => {
    const base64 = dataUrl.split(",")[1] || "";
    return Math.ceil((base64.length * 3) / 4);
  };

  const compressImageFile = async (file) => {
    const imageObjectUrl = URL.createObjectURL(file);

    try {
      const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = imageObjectUrl;
      });

      const width = img.width;
      const height = img.height;
      const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));

      const targetWidth = Math.max(1, Math.round(width * scale));
      const targetHeight = Math.max(1, Math.round(height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Canvas is not supported in this browser.");
      }

      context.drawImage(img, 0, 0, targetWidth, targetHeight);

      let quality = 0.9;
      let output = canvas.toDataURL("image/jpeg", quality);

      while (getDataUrlSizeBytes(output) > MAX_IMAGE_BYTES && quality > 0.45) {
        quality -= 0.1;
        output = canvas.toDataURL("image/jpeg", quality);
      }

      return output;
    } finally {
      URL.revokeObjectURL(imageObjectUrl);
    }
  };

  const readSelectedImage = async (file) => {
    const reader = new FileReader();

    reader.onload = async () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result.startsWith("data:image/")) {
        setMessage("Please select a valid image file.");
        return;
      }

      let optimizedImage = result;

      try {
        optimizedImage = await compressImageFile(file);
      } catch {
        optimizedImage = result;
      }

      if (getDataUrlSizeBytes(optimizedImage) > MAX_IMAGE_BYTES) {
        setMessage("Image is too large even after compression. Please choose a smaller image.");
        return;
      }

      setForm((prev) => ({
        ...prev,
        image: optimizedImage,
        imageName: file.name || "Captured image",
      }));
      setMessage("");
    };

    reader.onerror = () => {
      setMessage("Failed to read selected image. Please try again.");
    };

    reader.readAsDataURL(file);
  };

  const handleImageInput = (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    if (!selectedFile.type.startsWith("image/")) {
      setMessage("Only image files are allowed.");
      return;
    }

    if (selectedFile.size > 12 * 1024 * 1024) {
      setMessage("Please choose an image smaller than 12MB.");
      event.target.value = "";
      return;
    }

    readSelectedImage(selectedFile);
    event.target.value = "";
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage("Geolocation is not supported by this browser.");
      return;
    }

    setLocating(true);
    setLocationMessage("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setForm((prev) => ({
          ...prev,
          lat: String(lat),
          lng: String(lng)
        }));

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
              setLocationMessage(`Location added: ${city} (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
            } else {
              setLocationMessage(`Location added: (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
            }
          } else {
            setLocationMessage(`Location added: (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
          }
        } catch {
          setLocationMessage(`Location added: (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
        }

        setLocating(false);
      },
      () => {
        setLocating(false);
        setLocationMessage("Unable to access location. Please allow location permission.");
      }
    );
  };

  const clearLocation = () => {
    setForm((prev) => ({
      ...prev,
      city: "",
      lat: "",
      lng: "",
    }));
    setLocationMessage("Location cleared.");
  };

  const clearImage = () => {
    setForm((prev) => ({
      ...prev,
      image: "",
      imageName: "",
    }));
  };

  const applyPricePreset = (value) => {
    setForm((prev) => ({
      ...prev,
      pricePerDay: String(value),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const title = form.title.trim();
    const description = form.description.trim();
    const category = form.category.trim();
    const image = form.image;
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
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.formCard}>
          <div style={styles.header}>
            <h1 style={styles.heading}>Create New Listing</h1>
            <p style={styles.subheading}>Add your item details with a clean and renter-friendly setup.</p>
          </div>

          {message && <p style={styles.message}>{message}</p>}
          {locationMessage && <p style={styles.locationMessage}>{locationMessage}</p>}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.sectionCard}>
              <label htmlFor="title" style={styles.fieldLabel}>Title</label>
              <input
                id="title"
                name="title"
                placeholder="Example: DSLR Camera Canon 200D"
                value={form.title}
                onChange={handleChange}
                required
                style={styles.textInput}
              />

              <label htmlFor="description" style={styles.fieldLabel}>Description</label>
              <textarea
                id="description"
                name="description"
                placeholder="Describe condition, accessories, and usage notes"
                value={form.description}
                onChange={handleChange}
                required
                style={styles.textArea}
              />

              <label htmlFor="category" style={styles.fieldLabel}>Category</label>
              <input
                id="category"
                name="category"
                placeholder="Example: Electronics"
                value={form.category}
                onChange={handleChange}
                required
                style={styles.textInput}
              />
            </div>

            <div style={styles.priceCard}>
              <div style={styles.priceLayout}>
                <div style={styles.priceLeftPanel}>
                  <p style={styles.pricePresetTitle}>Quick options (INR)</p>
                  <div style={styles.presetGrid}>
                    {pricePresets.map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => applyPricePreset(value)}
                        style={
                          form.pricePerDay === String(value)
                            ? { ...styles.presetBtn, ...styles.presetBtnActive }
                            : styles.presetBtn
                        }
                      >
                        Rs {value}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={styles.priceRightPanel}>
                  <label htmlFor="pricePerDay" style={styles.priceLabel}>Price per day</label>
                  <div style={styles.priceInputWrap}>
                    <span style={styles.pricePrefix}>INR</span>
                    <input
                      id="pricePerDay"
                      name="pricePerDay"
                      type="number"
                      min="1"
                      step="1"
                      inputMode="numeric"
                      placeholder="Enter daily rent"
                      value={form.pricePerDay}
                      onChange={handleChange}
                      required
                      style={styles.priceInput}
                    />
                  </div>
                  <p style={styles.helperText}>Choose a competitive daily rate for faster bookings.</p>
                </div>
              </div>
            </div>

            <div style={styles.imagePickerWrap}>
              <strong style={styles.blockTitle}>Item image</strong>
              <div style={styles.imageActions}>
                <button type="button" style={styles.locateBtn} onClick={() => cameraInputRef.current?.click()}>
                  Take Picture
                </button>
                <button type="button" style={styles.locateBtn} onClick={() => fileInputRef.current?.click()}>
                  Add From Device
                </button>
                {form.image && (
                  <button type="button" style={styles.clearBtn} onClick={clearImage}>
                    Clear Image
                  </button>
                )}
              </div>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageInput}
                style={styles.hiddenInput}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageInput}
                style={styles.hiddenInput}
              />

              {!form.image && <p style={styles.helperText}>Add one image using camera or file picker.</p>}
              {form.image && (
                <div style={styles.imagePreviewWrap}>
                  <p style={styles.locationLine}>{form.imageName || "Selected image"}</p>
                  <p style={styles.helperText}>
                    Optimized size: {(getDataUrlSizeBytes(form.image) / 1024).toFixed(0)} KB
                  </p>
                  <img src={form.image} alt="Selected item" style={styles.imagePreview} />
                </div>
              )}
            </div>

            <div style={styles.locationPanel}>
              <strong style={styles.blockTitle}>Location</strong>
              <div style={styles.locationActions}>
                <button type="button" style={styles.locateBtn} onClick={useCurrentLocation} disabled={locating}>
                  {locating ? "Locating..." : "Use Current Location"}
                </button>
                {(form.city || form.lat || form.lng) && (
                  <button type="button" style={styles.clearBtn} onClick={clearLocation}>
                    Clear Location
                  </button>
                )}
              </div>

              {(form.city || (form.lat && form.lng)) && (
                <div style={styles.locationPreview}>
                  <strong>Selected location</strong>
                  <p style={styles.locationLine}>{form.city || "City unavailable"}</p>
                  {form.lat && form.lng && (
                    <p style={styles.locationLine}>
                      {Number(form.lat).toFixed(5)}, {Number(form.lng).toFixed(5)}
                    </p>
                  )}
                </div>
              )}
            </div>

            <button style={styles.submitBtn}>Create Listing</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AddItem;

const styles = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(1200px 420px at 50% -5%, #ffffff 0%, #f3f4f6 42%, #e5e7eb 100%)",
    padding: "24px 16px",
  },
  container: {
    width: "100%",
    maxWidth: 920,
    margin: "0 auto",
  },
  formCard: {
    background: "linear-gradient(180deg, rgba(255,255,255,0.86) 0%, rgba(243,244,246,0.86) 100%)",
    border: "1px solid rgba(209,213,219,0.85)",
    borderRadius: 18,
    padding: 20,
    boxShadow: "0 16px 36px rgba(17, 24, 39, 0.08)",
    backdropFilter: "blur(16px) saturate(140%)",
  },
  header: {
    textAlign: "center",
    marginBottom: 16,
  },
  heading: {
    margin: 0,
    color: "#111827",
    fontSize: 28,
    lineHeight: 1.2,
  },
  subheading: {
    margin: "8px 0 0",
    color: "#4b5563",
    fontSize: 14,
  },
  message: {
    color: "#b91c1c",
    margin: "0 0 10px",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 8,
    padding: "10px 12px",
  },
  locationMessage: {
    color: "#065f46",
    margin: "0 0 10px",
    background: "#ecfdf5",
    border: "1px solid #a7f3d0",
    borderRadius: 8,
    padding: "10px 12px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    maxWidth: 760,
    margin: "0 auto",
  },
  sectionCard: {
    border: "1px solid rgba(229,231,235,0.95)",
    borderRadius: 10,
    padding: 12,
    background: "rgba(250,250,250,0.84)",
    backdropFilter: "blur(12px)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  fieldLabel: {
    color: "#111827",
    fontWeight: 600,
    fontSize: 14,
  },
  textInput: {
    border: "1px solid rgba(209,213,219,0.85)",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 15,
    background: "rgba(255,255,255,0.92)",
    color: "#111827",
    outline: "none",
  },
  textArea: {
    border: "1px solid rgba(209,213,219,0.85)",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 15,
    minHeight: 100,
    resize: "vertical",
    background: "rgba(255,255,255,0.92)",
    color: "#111827",
    outline: "none",
  },
  locateBtn: {
    border: "1px solid rgba(156,163,175,0.75)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(229,231,235,0.92) 100%)",
    color: "#1f2937",
    padding: "10px 12px",
    borderRadius: 8,
    cursor: "pointer",
  },
  clearBtn: {
    border: "1px solid rgba(209,213,219,0.85)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(243,244,246,0.95) 100%)",
    color: "#111827",
    padding: "10px 12px",
    borderRadius: 8,
    cursor: "pointer",
  },
  priceCard: {
    border: "1px solid rgba(229,231,235,0.95)",
    borderRadius: 10,
    padding: 12,
    background: "rgba(250,250,250,0.84)",
    backdropFilter: "blur(12px)",
  },
  priceLayout: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
  },
  priceLeftPanel: {
    flex: "1 1 220px",
    border: "1px solid rgba(229,231,235,0.95)",
    borderRadius: 8,
    background: "rgba(255,255,255,0.88)",
    padding: 10,
  },
  priceRightPanel: {
    flex: "2 1 280px",
  },
  pricePresetTitle: {
    margin: "0 0 8px",
    color: "#374151",
    fontWeight: 600,
    fontSize: 13,
  },
  presetGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 8,
  },
  presetBtn: {
    border: "1px solid rgba(209,213,219,0.85)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(243,244,246,0.92) 100%)",
    color: "#1f2937",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 13,
    cursor: "pointer",
    fontWeight: 600,
  },
  presetBtnActive: {
    border: "1px solid rgba(75,85,99,0.75)",
    background: "linear-gradient(180deg, #e5e7eb 0%, #d1d5db 100%)",
  },
  priceLabel: {
    display: "block",
    fontWeight: 600,
    color: "#111827",
    marginBottom: 8,
  },
  priceInputWrap: {
    display: "flex",
    alignItems: "center",
    border: "1px solid rgba(209,213,219,0.85)",
    borderRadius: 8,
    background: "rgba(255,255,255,0.92)",
    overflow: "hidden",
  },
  pricePrefix: {
    padding: "10px 12px",
    borderRight: "1px solid rgba(229,231,235,0.95)",
    color: "#374151",
    fontWeight: 600,
    fontSize: 13,
    letterSpacing: 0.2,
    background: "rgba(249,250,251,0.92)",
  },
  priceInput: {
    flex: 1,
    border: "none",
    outline: "none",
    padding: "10px 12px",
    fontSize: 15,
    color: "#111827",
    background: "transparent",
  },
  imagePickerWrap: {
    border: "1px solid rgba(229,231,235,0.95)",
    borderRadius: 10,
    padding: 12,
    background: "rgba(250,250,250,0.84)",
    backdropFilter: "blur(12px)",
  },
  imageActions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 8,
  },
  blockTitle: {
    color: "#111827",
    fontSize: 15,
  },
  helperText: {
    margin: "10px 0 0",
    color: "#4b5563",
    fontSize: 14,
  },
  hiddenInput: {
    display: "none",
  },
  imagePreviewWrap: {
    marginTop: 10,
  },
  imagePreview: {
    width: "100%",
    maxHeight: 220,
    objectFit: "cover",
    borderRadius: 8,
    border: "1px solid rgba(209,213,219,0.85)",
  },
  locationPanel: {
    border: "1px solid rgba(229,231,235,0.95)",
    borderRadius: 10,
    padding: 12,
    background: "rgba(250,250,250,0.84)",
    backdropFilter: "blur(12px)",
  },
  locationActions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 8,
  },
  locationPreview: {
    border: "1px solid rgba(209,213,219,0.85)",
    borderRadius: 8,
    background: "rgba(249,250,251,0.9)",
    padding: 10,
    marginTop: 10,
  },
  locationLine: {
    margin: "6px 0 0",
    color: "#111827",
  },
  submitBtn: {
    border: "none",
    background: "linear-gradient(180deg, #4b5563 0%, #1f2937 100%)",
    color: "#fff",
    padding: "12px 14px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
    marginTop: 4,
    boxShadow: "0 12px 24px rgba(17,24,39,0.18)",
  },
};