import { useEffect, useState } from "react";
import api from "../services/api";

function MyListings() {
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    category: "",
    pricePerDay: "",
    condition: "Good",
    city: "",
    isAvailable: true,
    imagesText: "",
    tagsText: ""
  });

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await api.get("/items/my-items");
        setItems(res.data);
      } catch (err) {
        setMessage(err.response?.data?.message || "Failed to load listings");
      }
    };

    fetchItems();
  }, []);

  const openItemDetails = (item) => {
    setSelectedItem(item);
    setIsEditMode(false);
    setEditForm({
      title: String(item.title || ""),
      description: String(item.description || ""),
      category: String(item.category || ""),
      pricePerDay: String(item.pricePerDay || ""),
      condition: item.condition || "Good",
      city: String(item.city || ""),
      isAvailable: Boolean(item.isAvailable),
      imagesText: Array.isArray(item.images) ? item.images.join("\n") : "",
      tagsText: Array.isArray(item.tags) ? item.tags.join(", ") : ""
    });
    setMessage("");
  };

  const closeModal = () => {
    setSelectedItem(null);
    setIsEditMode(false);
    setIsSaving(false);
  };

  const updateItemInState = (updatedItem) => {
    setItems((prev) => prev.map((item) => (item._id === updatedItem._id ? updatedItem : item)));
    setSelectedItem(updatedItem);
  };

  const handleSave = async () => {
    if (!selectedItem) return;

    const parsedPrice = Number(editForm.pricePerDay);
    if (!editForm.title.trim()) {
      setMessage("Title is required");
      return;
    }

    if (!editForm.category.trim()) {
      setMessage("Category is required");
      return;
    }

    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      setMessage("Price per day must be greater than 0");
      return;
    }

    const images = editForm.imagesText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 5);

    const tags = editForm.tagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 10);

    try {
      setIsSaving(true);
      setMessage("");

      const res = await api.patch(`/items/${selectedItem._id}`, {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        category: editForm.category.trim(),
        pricePerDay: parsedPrice,
        condition: editForm.condition,
        city: editForm.city.trim(),
        isAvailable: Boolean(editForm.isAvailable),
        images,
        tags
      });

      updateItemInState(res.data.item);
      setIsEditMode(false);
      setMessage("Listing updated successfully");
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to update listing");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this item?")) return;

    try {
      await api.delete(`/items/${id}`);

      setItems((prev) => prev.filter((item) => item._id !== id));
      if (selectedItem?._id === id) {
        closeModal();
      }
      setMessage("Listing deleted");
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to delete listing");
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>My Listings</h1>
      <p style={styles.subTitle}>Click any card to open full listing details and edit with current values.</p>
      {message ? <p style={styles.message}>{message}</p> : null}

      {items.length === 0 && <p style={styles.empty}>You have not created any items yet.</p>}

      <div style={styles.grid}>
        {items.map((item) => (
          <div key={item._id} style={styles.card} onClick={() => openItemDetails(item)}>
            <img
              src={item.images?.[0] || "https://via.placeholder.com/300"}
              style={styles.image}
              alt={item.title}
            />
            <div style={styles.meta}>
              <h3 style={styles.itemTitle}>{item.title}</h3>
              <p style={styles.price}>INR {item.pricePerDay}/day</p>
              <p style={styles.metaLine}>Category: {item.category}</p>
              <p style={styles.metaLine}>Condition: {item.condition || "Good"}</p>
              {item.tags?.length > 0 && (
                <div style={styles.tags}>
                  {item.tags.slice(0, 4).map((tag) => (
                    <span key={tag} style={styles.tag}>{tag}</span>
                  ))}
                </div>
              )}
            </div>

            <button
              style={styles.deleteBtn}
              onClick={(event) => {
                event.stopPropagation();
                handleDelete(item._id);
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      {selectedItem ? (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>{selectedItem.title}</h2>
              <button style={styles.closeBtn} onClick={closeModal}>Close</button>
            </div>

            {!isEditMode ? (
              <div style={styles.detailView}>
                <img
                  src={selectedItem.images?.[0] || "https://via.placeholder.com/640x360"}
                  alt={selectedItem.title}
                  style={styles.detailImage}
                />

                <div style={styles.detailGrid}>
                  <p><strong>Title:</strong> {selectedItem.title}</p>
                  <p><strong>Price:</strong> INR {selectedItem.pricePerDay}/day</p>
                  <p><strong>Category:</strong> {selectedItem.category}</p>
                  <p><strong>Condition:</strong> {selectedItem.condition || "Good"}</p>
                  <p><strong>City:</strong> {selectedItem.city || "Not set"}</p>
                  <p><strong>Available:</strong> {selectedItem.isAvailable ? "Yes" : "No"}</p>
                </div>

                <div style={styles.descriptionBox}>
                  <strong>Description</strong>
                  <p>{selectedItem.description || "No description"}</p>
                </div>

                <div style={styles.tagsBox}>
                  <strong>Tags</strong>
                  <p>{selectedItem.tags?.length ? selectedItem.tags.join(", ") : "No tags"}</p>
                </div>

                <div style={styles.modalActions}>
                  <button style={styles.secondaryBtn} onClick={() => setIsEditMode(true)}>
                    Edit Listing
                  </button>
                  <button style={styles.deleteBtn} onClick={() => handleDelete(selectedItem._id)}>
                    Delete Listing
                  </button>
                </div>
              </div>
            ) : (
              <div style={styles.formWrap}>
                <label style={styles.field}>
                  <span>Title</span>
                  <input
                    style={styles.input}
                    value={editForm.title}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, title: event.target.value }))}
                  />
                </label>

                <label style={styles.field}>
                  <span>Description</span>
                  <textarea
                    style={styles.textarea}
                    rows={4}
                    value={editForm.description}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, description: event.target.value }))}
                  />
                </label>

                <div style={styles.rowFields}>
                  <label style={styles.field}>
                    <span>Category</span>
                    <input
                      style={styles.input}
                      value={editForm.category}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, category: event.target.value }))}
                    />
                  </label>

                  <label style={styles.field}>
                    <span>Price Per Day</span>
                    <input
                      type="number"
                      min="1"
                      style={styles.input}
                      value={editForm.pricePerDay}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, pricePerDay: event.target.value }))}
                    />
                  </label>
                </div>

                <div style={styles.rowFields}>
                  <label style={styles.field}>
                    <span>Condition</span>
                    <select
                      style={styles.input}
                      value={editForm.condition}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, condition: event.target.value }))}
                    >
                      <option value="New">New</option>
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Old">Old</option>
                    </select>
                  </label>

                  <label style={styles.field}>
                    <span>City</span>
                    <input
                      style={styles.input}
                      value={editForm.city}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, city: event.target.value }))}
                    />
                  </label>
                </div>

                <label style={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={editForm.isAvailable}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, isAvailable: event.target.checked }))}
                  />
                  <span>Listing is available</span>
                </label>

                <label style={styles.field}>
                  <span>Images (one URL per line, max 5)</span>
                  <textarea
                    style={styles.textarea}
                    rows={4}
                    value={editForm.imagesText}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, imagesText: event.target.value }))}
                  />
                </label>

                <label style={styles.field}>
                  <span>Tags (comma separated)</span>
                  <input
                    style={styles.input}
                    value={editForm.tagsText}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, tagsText: event.target.value }))}
                  />
                </label>

                <div style={styles.modalActions}>
                  <button style={styles.ghostBtn} onClick={() => setIsEditMode(false)} disabled={isSaving}>
                    Cancel Edit
                  </button>
                  <button style={styles.secondaryBtn} onClick={handleSave} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default MyListings;

const styles = {
  container: {
    padding: 24,
  },
  title: {
    marginBottom: 12,
    color: "#1f2937",
  },
  subTitle: {
    marginTop: 0,
    marginBottom: 12,
    color: "#4b5563"
  },
  message: {
    marginTop: 8,
    color: "#b91c1c"
  },
  empty: {
    color: "#4b5563",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
    gap: 20,
    marginTop: 20,
  },
  card: {
    background: "#f8f9fb",
    padding: 12,
    borderRadius: 12,
    border: "1px solid #d1d5db",
    boxShadow: "0 6px 16px rgba(17,24,39,0.08)",
    cursor: "pointer"
  },
  image: {
    width: "100%",
    height: 150,
    objectFit: "cover",
    borderRadius: 10,
  },
  meta: {
    marginTop: 10,
  },
  itemTitle: {
    margin: 0,
    color: "#111827",
  },
  price: {
    margin: "6px 0 0",
    color: "#374151",
  },
  metaLine: {
    margin: "4px 0 0",
    color: "#4b5563",
    fontSize: 13
  },
  tags: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  tag: {
    background: "#e5e7eb",
    color: "#374151",
    fontSize: 12,
    padding: "3px 8px",
    borderRadius: 999,
  },
  deleteBtn: {
    marginTop: 10,
    background: "#991b1b",
    color: "#fff",
    border: "none",
    padding: "8px 10px",
    borderRadius: 6,
    cursor: "pointer",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 16
  },
  modal: {
    width: "min(860px, 100%)",
    maxHeight: "90vh",
    overflowY: "auto",
    background: "#fff",
    borderRadius: 14,
    border: "1px solid #d1d5db",
    padding: 18,
    boxShadow: "0 24px 56px rgba(0,0,0,0.25)"
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 12
  },
  modalTitle: {
    margin: 0,
    color: "#111827"
  },
  closeBtn: {
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#374151",
    borderRadius: 6,
    padding: "7px 10px",
    cursor: "pointer"
  },
  detailView: {
    display: "flex",
    flexDirection: "column",
    gap: 12
  },
  detailImage: {
    width: "100%",
    height: 260,
    objectFit: "cover",
    borderRadius: 12,
    border: "1px solid #d1d5db"
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 8,
    color: "#374151"
  },
  descriptionBox: {
    border: "1px solid #e5e7eb",
    background: "#f9fafb",
    borderRadius: 10,
    padding: 10,
    color: "#374151"
  },
  tagsBox: {
    border: "1px solid #e5e7eb",
    background: "#fff",
    borderRadius: 10,
    padding: 10,
    color: "#374151"
  },
  formWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 10
  },
  rowFields: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 10
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    color: "#374151",
    fontSize: 13
  },
  input: {
    border: "1px solid #d1d5db",
    borderRadius: 8,
    padding: "9px 10px",
    fontSize: 14,
    outline: "none"
  },
  textarea: {
    border: "1px solid #d1d5db",
    borderRadius: 8,
    padding: "9px 10px",
    fontSize: 14,
    outline: "none",
    resize: "vertical"
  },
  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "#374151"
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
    flexWrap: "wrap"
  },
  secondaryBtn: {
    border: "none",
    background: "#374151",
    color: "#fff",
    borderRadius: 6,
    padding: "8px 12px",
    cursor: "pointer"
  },
  ghostBtn: {
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#374151",
    borderRadius: 6,
    padding: "8px 12px",
    cursor: "pointer"
  }
};