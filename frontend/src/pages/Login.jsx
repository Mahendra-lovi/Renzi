import { useContext, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/auth-context";
import api from "../services/api";

const GOOGLE_SCRIPT_ID = "google-identity-script";
let googleInitOnce = false;

function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const googleBtnRef = useRef(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [googleReady, setGoogleReady] = useState(false);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!googleClientId || !googleBtnRef.current) return;

    const initGoogle = () => {
      if (!window.google?.accounts?.id || googleInitOnce) return;

      googleInitOnce = true;

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          try {
            setError("");
            const res = await api.post("/auth/google", { idToken: response.credential });
            login(res.data.token);
            navigate("/", { replace: true });
          } catch (err) {
            setError(err.response?.data?.message || "Google login failed");
          }
        },
      });

      googleBtnRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: "standard",
        theme: "outline",
        text: "signin_with",
        shape: "pill",
        size: "large",
        width: 260,
      });
      setGoogleReady(true);
    };

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID);

    if (existingScript) {
      initGoogle();
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initGoogle;
    document.body.appendChild(script);
  }, [googleClientId, login, navigate]);

const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");

  try {
    const res = await api.post("/auth/login", {
      email,
      password,
    });

    login(res.data.token);

    // ✅ allow isAuthenticated to update
    setTimeout(() => {
      navigate("/", { replace: true });
    }, 0);

  } catch (err) {
    setError(err.response?.data?.message || "Login failed");
  }
};


  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Welcome Back</h2>

      {error && <p style={styles.error}>{error}</p>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
          required
        />

        <button type="submit" style={styles.button}>
          Login
        </button>

        <div style={styles.forgotWrap}>
          <Link to="/forgot-password" style={styles.forgotLink}>Forgot password?</Link>
        </div>
      </form>

      <div style={styles.dividerWrap}>
        <div style={styles.divider} />
        <span style={styles.dividerText}>or</span>
        <div style={styles.divider} />
      </div>

      <section style={styles.googleSection}>
        <p style={styles.googleHeading}>Continue with Google</p>

        {!googleClientId && (
          <p style={styles.helperText}>Google sign-in is not configured yet.</p>
        )}

        {googleClientId && <div ref={googleBtnRef} style={styles.googleButtonSlot} />}

        {googleClientId && !googleReady && <p style={styles.helperText}>Loading Google sign-in...</p>}
      </section>

      <p style={styles.linkText}>
        Don’t have an account?{" "}
        <Link to="/register" style={styles.link}>
          Register
        </Link>
      </p>
    </div>
  );
}

export default Login;

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
  },
  button: {
    padding: 12,
    background: "#1e293b",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 15,
  },
  forgotWrap: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: -4,
  },
  forgotLink: {
    color: "#475569",
    textDecoration: "none",
    fontSize: 12,
    fontWeight: 600,
  },
  error: {
    color: "#dc2626",
    marginBottom: 10,
  },
  linkText: {
    marginTop: 16,
    fontSize: 14,
  },
  dividerWrap: {
    marginTop: 14,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  divider: {
    flex: 1,
    height: 1,
    background: "#e5e7eb",
  },
  dividerText: {
    color: "#94a3b8",
    fontSize: 12,
  },
  googleSection: {
    marginTop: 12,
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: "10px 12px 14px",
    background: "#f8fafc",
  },
  googleHeading: {
    margin: "0 0 10px",
    color: "#334155",
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 0.2,
  },
  helperText: {
    marginTop: 6,
    color: "#64748b",
    fontSize: 13,
  },
  googleButtonSlot: {
    marginTop: 12,
    display: "flex",
    justifyContent: "center",
  },
  link: {
    color: "#2563eb",
    textDecoration: "none",
    fontWeight: 500,
  },
};
