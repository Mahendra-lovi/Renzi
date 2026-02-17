import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function AddItem() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    pricePerDay: "",
    image: ""
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await api.post("/items", {
        title: form.title,
        description: form.description,
        category: form.category,
        pricePerDay: Number(form.pricePerDay),
        images: [form.image],
      });

      navigate("/");
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to create item");
    }
  };

  return (
    <div style={styles.container}>
      <h1>Add New Item</h1>

      {message && <p>{message}</p>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <input name="title" placeholder="Title" onChange={handleChange} required />
        <textarea name="description" placeholder="Description" onChange={handleChange} required />
        <input name="category" placeholder="Category" onChange={handleChange} required />
        <input name="pricePerDay" type="number" placeholder="Price per day" onChange={handleChange} required />
        <input name="image" placeholder="Image URL" onChange={handleChange} required />

        <button>Create Listing</button>
      </form>
    </div>
  );
}

export default AddItem;

const styles = {
  container: { padding: 24 },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    maxWidth: 400,
    marginTop: 20,
  },
};