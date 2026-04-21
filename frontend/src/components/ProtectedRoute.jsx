import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/auth-context";

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useContext(AuthContext);

  if (loading) return null;

  // 🔐 If logged in → allow
  if (isAuthenticated) {
    return children;
  }

  // ❌ If not logged in → force login
  return <Navigate to="/login" replace />;
}

export default ProtectedRoute;
