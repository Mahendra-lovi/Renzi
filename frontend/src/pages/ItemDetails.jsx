import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../services/api";

function ItemDetails() {
  const { id } = useParams();

  const [item, setItem] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.get("/items").then((res) => {
      const found = res.data.find((i) => i._id === id);
      setItem(found);
    });
  }, [id]);

  const handleRent = async () => {
    try {
      const res = await api.post("/rentals/request", {
        itemId: id,
        startDate,
        endDate,
      });

      setMessage(res.data.message);
    } catch (err) {
      setMessage(err.response?.data?.message || "Request failed");
    }
  };

  if (!item) return <h2 style={{ padding: 20 }}>Loading...</h2>;

  return (
    <div style={styles.container}>
      <img
        src={item.images?.[0] || "https://via.placeholder.com/600x350"}
        alt={item.title}
        style={styles.image}
      />

      <div style={styles.content}>
        <h1>{item.title}</h1>
        <p style={styles.owner}>Owner: {item.owner?.email}</p>
        <p style={styles.desc}>{item.description}</p>

        <h2>₹{item.pricePerDay} / day</h2>

        <div style={styles.dateBox}>
          <input type="date" onChange={(e)=>setStartDate(e.target.value)} />
          <input type="date" onChange={(e)=>setEndDate(e.target.value)} />
        </div>

        <button style={styles.button} onClick={handleRent}>
          Request Rental
        </button>

        {message && <p style={{ marginTop: 10 }}>{message}</p>}
      </div>
    </div>
  );
}

export default ItemDetails;

const styles = {
  container: { padding: 24 },
  image: {
    width: "100%",
    maxHeight: 350,
    objectFit: "cover",
    borderRadius: 12,
  },
  content: { marginTop: 20 },
  owner: { color: "#6b7280" },
  desc: { margin: "16px 0" },
  dateBox: {
    display: "flex",
    gap: 10,
    marginTop: 10,
  },
  button: {
    marginTop: 16,
    padding: "10px 16px",
    background: "#111827",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
};