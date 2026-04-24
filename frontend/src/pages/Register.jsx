import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { AuthContext } from "../context/auth-context";

const RESEND_WAIT_SECONDS = 30;

function Register() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");

  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("form");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [autoVerifying, setAutoVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showVerifiedToast, setShowVerifiedToast] = useState(false);
  const autoVerifyTriggeredRef = useRef(false);

  const hasConfirmInput = confirmPassword.length > 0;
  const passwordsMatch = form.password.length > 0 && form.password === confirmPassword;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (form.password !== confirmPassword) {
      setError("Password and re-enter password do not match");
      return;
    }

    try {
      setLoading(true);

      await api.post("/auth/register/request-otp", {
        ...form,
        role: "user",
      });

      setStep("verify");
      setResendCooldown(RESEND_WAIT_SECONDS);
      setMessage("OTP sent to your email. Enter it below to complete registration.");

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

  const handleVerifyOtp = useCallback(async (e) => {
    e?.preventDefault?.();
    setError("");
    setMessage("");

    if (otp.trim().length !== 6) {
      setError("Enter a valid 6-digit OTP");
      return;
    }

    try {
      setLoading(true);

      const res = await api.post("/auth/register/verify-otp", {
        email: form.email,
        otp: otp.trim(),
      });

      login(res.data.token);
      setShowVerifiedToast(true);
      setMessage("Email verified successfully. Redirecting...");
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 850);
    } catch (err) {
      setError(err.response?.data?.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  }, [form.email, login, navigate, otp]);

  useEffect(() => {
    if (step !== "verify" || resendCooldown <= 0) return;

    const timer = window.setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCooldown, step]);

  useEffect(() => {
    if (step !== "verify") {
      autoVerifyTriggeredRef.current = false;
      return;
    }

    if (otp.trim().length !== 6) {
      autoVerifyTriggeredRef.current = false;
      return;
    }

    if (loading || autoVerifying || autoVerifyTriggeredRef.current) {
      return;
    }

    autoVerifyTriggeredRef.current = true;
    setAutoVerifying(true);

    handleVerifyOtp().finally(() => {
      setAutoVerifying(false);
    });
  }, [autoVerifying, handleVerifyOtp, loading, otp, step]);

  const handleResendOtp = async () => {
    setError("");
    setMessage("");

    try {
      setResending(true);
      const res = await api.post("/auth/register/resend-otp", { email: form.email });
      setMessage(res.data?.message || "A new OTP has been sent to your email.");
      setResendCooldown(RESEND_WAIT_SECONDS);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend OTP");
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>{step === "form" ? "Create Account" : "Verify Your Email"}</h2>

      {message && <p style={styles.message}>{message}</p>}

      {error && <p style={styles.error}>{error}</p>}

      {step === "form" ? (
      <form onSubmit={handleRequestOtp} style={styles.form}>
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
          type="password"
          name="confirmPassword"
          placeholder="Re-enter Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          style={styles.input}
          onFocus={focus}
          onBlur={blur}
          autoComplete="new-password"
          required
        />

        {hasConfirmInput && (
          <p style={{
            ...styles.passwordHint,
            ...(passwordsMatch ? styles.passwordHintSuccess : styles.passwordHintError),
          }}>
            {passwordsMatch ? "Passwords match" : "Passwords do not match"}
          </p>
        )}

        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? "Sending OTP..." : "Send OTP"}
        </button>
      </form>
      ) : (
      <form onSubmit={handleVerifyOtp} style={styles.form}>
        {showVerifiedToast && (
          <div style={styles.toast}>Email verified. Signing you in...</div>
        )}

        <input
          type="email"
          value={form.email}
          style={{ ...styles.input, background: "#f8fafc" }}
          readOnly
        />

        <input
          type="text"
          name="otp"
          placeholder="Enter 6-digit OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          style={styles.input}
          onFocus={focus}
          onBlur={blur}
          required
        />

        <button type="submit" style={styles.button} disabled={loading || autoVerifying}>
          {loading || autoVerifying ? "Verifying..." : "Verify and Continue"}
        </button>

        <button
          type="button"
          style={styles.ghostButton}
          disabled={loading || resending || resendCooldown > 0}
          onClick={handleResendOtp}
        >
          {resending
            ? "Resending OTP..."
            : resendCooldown > 0
              ? `Resend OTP in ${resendCooldown}s`
              : "Resend OTP"}
        </button>

        <button
          type="button"
          style={styles.secondaryButton}
          disabled={loading}
          onClick={() => setStep("form")}
        >
          Edit details
        </button>
      </form>
      )}

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
const focus = (e) => (e.target.style.borderColor = "#2563eb");
const blur = (e) => (e.target.style.borderColor = "#d1d5db");

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
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#d1d5db",
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
  message: {
    color: "#065f46",
    marginBottom: 10,
  },
  passwordHint: {
    margin: "-6px 2px 0",
    fontSize: 12,
    textAlign: "left",
    fontWeight: 600,
  },
  passwordHintSuccess: {
    color: "#15803d",
  },
  passwordHintError: {
    color: "#b91c1c",
  },
  toast: {
    background: "#dcfce7",
    color: "#166534",
    border: "1px solid #86efac",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 13,
    fontWeight: 600,
  },
  linkText: {
    marginTop: 16,
    fontSize: 14,
  },
  secondaryButton: {
    padding: 12,
    background: "#eef2ff",
    color: "#1e293b",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 14,
  },
  ghostButton: {
    padding: 12,
    background: "#ffffff",
    color: "#334155",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 14,
  },
  link: {
    color: "#2563eb",
    textDecoration: "none",
    fontWeight: 500,
  },
};
