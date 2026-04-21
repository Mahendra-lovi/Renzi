import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    city: "",
    lat: "",
    lng: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // 🔒 Frontend validation
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);

      await api.post("/auth/register", {
        ...form,
        role: "user",
      });

      // ✅ FORCE navigation
      navigate("/login", { replace: true });

    } catch (err) {
      if (!err.response) {
        setError("Server not reachable. Try again later.");
      } else {
        setError(err.response.data?.message || "Registration failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Create Account</h2>

      {error && <p style={styles.error}>{error}</p>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          name="name"
          placeholder="Full Name"
          value={form.name}
          onChange={handleChange}
          style={styles.input}
          onFocus={focus}
          onBlur={blur}
          required
        />

        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          style={styles.input}
          onFocus={focus}
          onBlur={blur}
          autoComplete="email"
          required
        />

        <input
          type="tel"
          name="phone"
          placeholder="Phone Number"
          value={form.phone}
          onChange={handleChange}
          style={styles.input}
          onFocus={focus}
          onBlur={blur}
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          style={styles.input}
          onFocus={focus}
          onBlur={blur}
          autoComplete="new-password"
          required
        />

        <input
          type="text"
          name="city"
          placeholder="City (optional but useful for nearby rentals)"
          value={form.city}
          onChange={handleChange}
          style={styles.input}
          onFocus={focus}
          onBlur={blur}
        />

        <input
          type="number"
          name="lat"
          placeholder="Latitude (optional)"
          value={form.lat}
          onChange={handleChange}
          style={styles.input}
          onFocus={focus}
          onBlur={blur}
        />

        <input
          type="number"
          name="lng"
          placeholder="Longitude (optional)"
          value={form.lng}
          onChange={handleChange}
          style={styles.input}
          onFocus={focus}
          onBlur={blur}
        />

        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? "Registering..." : "Register"}
        </button>
      </form>

      <p style={styles.linkText}>
        Already have an account?{" "}
        <Link to="/login" style={styles.link}>
          Login
        </Link>
      </p>
    </div>
  );
}

export default Register;

/* 🔹 Focus handlers */
const focus = (e) => (e.target.style.border = "1px solid #2563eb");
const blur = (e) => (e.target.style.border = "1px solid #d1d5db");

/* 🔹 Inline Styles */
const styles = {
  container: {
    maxWidth: 380,
    margin: "90px auto",
    padding: 24,
    background: "#ffffff",
    borderRadius: 10,
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
    textAlign: "center",
  },
  title: {
    marginBottom: 20,
    color: "#1e293b",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  input: {
    padding: 12,
    borderRadius: 6,
    border: "1px solid #d1d5db",
    fontSize: 14,
    outline: "none",
  },
  button: {
    padding: 12,
    background: "#1e293b",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 15,
    opacity: 1,
  },
  error: {
    color: "#dc2626",
    marginBottom: 10,
  },
  linkText: {
    marginTop: 16,
    fontSize: 14,
  },
  link: {
    color: "#2563eb",
    textDecoration: "none",
    fontWeight: 500,
  },
};
