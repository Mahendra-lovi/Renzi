import { createContext, useState, useEffect } from "react";
import api from "../services/api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("renzi_token");

    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get("/auth/me")
      .then((res) => {
        // 🔒 HARD CHECK
        if (!res.data || !res.data._id) {
          throw new Error("Invalid user");
        }

        setUser(res.data);
        setIsAuthenticated(true);
      })
      .catch(() => {
        localStorage.removeItem("renzi_token");
        setIsAuthenticated(false);
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = (token) => {
    // persist token and immediately load the current user so the UI updates
    localStorage.setItem("renzi_token", token);

    // optimistic authenticated flag (so ProtectedRoute works immediately)
    setIsAuthenticated(true);

    // fetch `/auth/me` to populate `user` right away
    api
      .get("/auth/me")
      .then((res) => {
        setUser(res.data);
      })
      .catch(() => {
        // keep isAuthenticated = true (token exists) but clear user on failure
        setUser(null);
      });
  };

  const logout = () => {
    localStorage.removeItem("renzi_token");
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, user, loading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};
