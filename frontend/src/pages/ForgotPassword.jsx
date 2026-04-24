import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

const RESEND_WAIT_SECONDS = 30;

function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState("request");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (step !== "verify" || cooldown <= 0) return;

    const timer = window.setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldown, step]);

  const requestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      setLoading(true);
      await api.post("/auth/forgot-password/request-otp", { email });
      setStep("verify");
      setCooldown(RESEND_WAIT_SECONDS);
      setMessage("Password reset OTP sent to your email.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send reset OTP");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    setError("");
    setMessage("");

    try {
      setResending(true);
      const res = await api.post("/auth/forgot-password/resend-otp", { email });
      setCooldown(RESEND_WAIT_SECONDS);
      setMessage(res.data?.message || "Password reset OTP resent.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend reset OTP");
    } finally {
      setResending(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (otp.trim().length !== 6) {
      setError("Enter a valid 6-digit OTP");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/auth/forgot-password/reset", {
        email,
        otp: otp.trim(),
        newPassword,
      });
      setMessage(res.data?.message || "Password reset successful.");
      setTimeout(() => navigate("/login", { replace: true }), 900);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>{step === "request" ? "Forgot Password" : "Reset Password"}</h2>

      {message && <p style={styles.message}>{message}</p>}
      {error && <p style={styles.error}>{error}</p>}

      {step === "request" ? (
        <form onSubmit={requestOtp} style={styles.form}>
          <input
            type="email"
            placeholder="Registered email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            required
          />

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Sending OTP..." : "Send Reset OTP"}
          </button>
        </form>
      ) : (
        <form onSubmit={resetPassword} style={styles.form}>
          <input type="email" value={email} style={{ ...styles.input, background: "#f8fafc" }} readOnly />

          <input
            type="text"
            placeholder="Enter 6-digit OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            style={styles.input}
            required
          />

          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={styles.input}
            required
          />

          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={styles.input}
            required
          />

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Resetting..." : "Reset Password"}
          </button>

          <button
            type="button"
            style={styles.ghostButton}
            disabled={resending || loading || cooldown > 0}
            onClick={resendOtp}
          >
            {resending
              ? "Resending OTP..."
              : cooldown > 0
                ? `Resend OTP in ${cooldown}s`
                : "Resend OTP"}
          </button>
        </form>
      )}

      <p style={styles.linkText}>
        Back to{" "}
        <Link to="/login" style={styles.link}>
          Login
        </Link>
      </p>
    </div>
  );
}

export default ForgotPassword;

const styles = {
  container: {
    maxWidth: 400,
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
    gap: 12,
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
  ghostButton: {
    padding: 12,
    background: "#ffffff",
    color: "#334155",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 14,
  },
  error: {
    color: "#dc2626",
    marginBottom: 10,
  },
  message: {
    color: "#065f46",
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
