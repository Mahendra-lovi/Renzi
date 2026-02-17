import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

function Profile() {
  const { user } = useContext(AuthContext);

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
    background: "#fff",
    borderRadius: 12,
    boxShadow: "0 8px 25px rgba(0,0,0,0.08)",
    maxWidth: 400,
  },
};