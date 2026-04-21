import { useContext } from "react";
import { AuthContext } from "../context/auth-context";

const getTrustBadge = (score = 0) => {
  if (score >= 85) return { label: "Gold", color: "#b45309" };
  if (score >= 70) return { label: "Trusted", color: "#374151" };
  if (score >= 55) return { label: "Verified", color: "#4b5563" };
  return { label: "New", color: "#6b7280" };
};

function Profile() {
  const { user } = useContext(AuthContext);
  const badge = getTrustBadge(user?.trustScore || 0);

  if (!user) return <h2 style={{ padding: 20 }}>Loading...</h2>;

  return (
    <div style={styles.container}>
      <h1>My Profile</h1>

      <div style={styles.card}>
        <p><strong>Name:</strong> {user.name}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Phone:</strong> {user.phone}</p>
        <p><strong>Role:</strong> {user.role}</p>
        <p><strong>Verified:</strong> {user.verified ? "Yes" : "No"}</p>
        <p><strong>Trust Score:</strong> ⭐ {user.trustScore}</p>
        <span style={{ ...styles.badge, background: badge.color }}>{badge.label}</span>
      </div>
    </div>
  );
}

export default Profile;

const styles = {
  container: { padding: 24 },
  card: {
    marginTop: 20,
    padding: 20,
    background: "#f8f9fb",
    border: "1px solid #d1d5db",
    borderRadius: 12,
    boxShadow: "0 6px 16px rgba(17,24,39,0.08)",
    maxWidth: 400,
  },
  badge: {
    display: "inline-block",
    marginTop: 10,
    color: "#fff",
    fontSize: 12,
    fontWeight: 600,
    padding: "4px 10px",
    borderRadius: 999,
  },
};