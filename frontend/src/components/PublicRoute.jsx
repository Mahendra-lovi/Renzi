import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useContext(AuthContext);

  if (loading) return null;

  // 🔓 If NOT logged in → allow access
  if (!isAuthenticated) {
    return children;
  }

  // 🔒 If logged in → go home
  return <Navigate to="/" replace />;
}

export default PublicRoute;
