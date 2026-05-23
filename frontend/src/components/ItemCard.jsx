import { useNavigate } from "react-router-dom";

const formatTag = (tag = "") =>
  `#${String(tag)
    .trim()
    .replace(/^#+/, "")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase())}`;

function ItemCard({ item, onTagClick }) {
  const navigate = useNavigate();

  const openDetails = () => {
    navigate(`/items/${item._id}`);
  };

  return (
    <div style={styles.card} onClick={openDetails} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && openDetails()}>
      <img
        src={
          item.images?.[0] ||
          "https://via.placeholder.com/400x250?text=No+Image"
        }
        alt={item.title}
        style={styles.image}
      />

      {item.tags?.length > 0 && (
        <div style={styles.tags}>
          {item.tags.map((tag, i) => (
            <button
              type="button"
              key={i}
              style={styles.tag}
              onClick={(event) => {
                event.stopPropagation();
                if (onTagClick) onTagClick(tag);
              }}
            >
              {formatTag(tag)}
            </button>
          ))}
        </div>
      )}

      <div style={styles.content}>
        <h3 style={styles.title}>{item.title}</h3>

        <p style={styles.desc}>
          {item.description?.slice(0, 60)}...
        </p>

        <div style={styles.footer}>
          <span style={styles.price}>₹{item.pricePerDay}/day</span>
          <span style={styles.openHint}>Open</span>
        </div>
      </div>
    </div>
  );
}

export default ItemCard;

const styles = {
  card: {
    background: "#f8f9fb",
    borderRadius: 12,
    border: "1px solid #d1d5db",
    overflow: "hidden",
    boxShadow: "0 6px 16px rgba(17,24,39,0.08)",
    transition: "0.2s",
    cursor: "pointer",
  },
  image: {
    width: "100%",
    height: 180,
    objectFit: "cover",
  },
  content: {
    padding: 16,
  },
  tags: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    padding: "12px 16px 0",
  },
  tag: {
    border: "1px solid #cbd5e1",
    background: "#e5e7eb",
    color: "#374151",
    borderRadius: 999,
    padding: "4px 10px",
    fontSize: 12,
    cursor: "pointer",
  },
  title: {
    margin: "0 0 8px",
    fontSize: 18,
    color: "#111827",
  },
  desc: {
    fontSize: 14,
    color: "#6b7280",
    minHeight: 40,
  },
  footer: {
    marginTop: 14,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  price: {
    fontWeight: 600,
    color: "#111827",
  },
  openHint: {
    color: "#4b5563",
    padding: "6px 10px",
    borderRadius: 6,
    fontSize: 13,
    border: "1px solid #d1d5db",
    background: "#fff",
  },
};