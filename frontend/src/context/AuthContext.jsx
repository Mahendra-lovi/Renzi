import { useState, useEffect } from "react";
import api from "../services/api";
import { AuthContext } from "./auth-context";

export const AuthProvider = ({ children }) => {
  const [bootToken] = useState(() => localStorage.getItem("renzi_token"));

  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(bootToken));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(bootToken));

  useEffect(() => {
    if (!bootToken) return;

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
  }, [bootToken]);

  const login = (token) => {
    localStorage.setItem("renzi_token", token);
    setIsAuthenticated(true);
    setLoading(true);

    api
      .get("/auth/me")
      .then((res) => {
        setUser(res.data);
      })
      .catch(() => {
        localStorage.removeItem("renzi_token");
        setIsAuthenticated(false);
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const logout = () => {
    localStorage.removeItem("renzi_token");
    setIsAuthenticated(false);
    setUser(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, user, loading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};
