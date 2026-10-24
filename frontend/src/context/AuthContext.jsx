import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  useEffect(() => {
    let active = true;
    api
      .get("/auth/profile/")
      .then(({ data }) => {
        if (active) setUser(data);
      })
      .catch((error) => {
        if (active && error.response?.status !== 403) setConnectionError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  async function authenticate(mode, values) {
    await api.get("/auth/csrf/");
    const { data } = await api.post(`/auth/${mode}/`, values);
    setUser(data);
    setConnectionError(false);
  }
  async function logout() {
    await api.post("/auth/logout/");
    setUser(null);
  }
  return (
    <AuthContext.Provider
      value={{ user, loading, connectionError, authenticate, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
