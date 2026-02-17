import { Link } from "react-router-dom";

function ItemCard({ item }) {
  return (
    <div style={styles.card}>
      <img
        src={
          item.images?.[0] ||
          "https://via.placeholder.com/400x250?text=No+Image"
        }
        alt={item.title}
        style={styles.image}
      />

      <div style={styles.content}>
        <h3 style={styles.title}>{item.title}</h3>

        <p style={styles.desc}>
          {item.description?.slice(0, 60)}...
        </p>

        <div style={styles.footer}>
          <span style={styles.price}>₹{item.pricePerDay}/day</span>

          <Link to={`/items/${item._id}`} style={styles.button}>
            View
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ItemCard;

const styles = {
  card: {
    background: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    boxShadow: "0 8px 25px rgba(0,0,0,0.08)",
    transition: "0.2s",
  },
  image: {
    width: "100%",
    height: 180,
    objectFit: "cover",
  },
  content: {
    padding: 16,
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
  button: {
    textDecoration: "none",
    background: "#111827",
    color: "#fff",
    padding: "6px 12px",
    borderRadius: 6,
    fontSize: 14,
  },
};