import { createContext, useContext, useState, useEffect } from "react";
import api from "../../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // No token means there's nothing to load, so start as "not loading" instead
  // of flipping it inside the effect (avoids a synchronous setState-in-effect).
  const [loading, setLoading] = useState(() => !!localStorage.getItem("access_token"));

  useEffect(() => {
    if (!loading) {
      return;
    }
    api
      .get("/auth/me")
      .then((response) => setUser(response.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
    // Deliberately run once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(username, password) {
    const response = await api.post("/auth/login", { username, password });
    localStorage.setItem("access_token", response.data.access_token);
    const me = await api.get("/auth/me");
    setUser(me.data);
    return me.data;
  }

  function logout() {
    localStorage.removeItem("access_token");
    setUser(null);
  }

  async function registerAccount(payload) {
    const response = await api.post("/auth/register", payload);
    return response.data;
  }

  function hasRole(...roles) {
    return !!user && roles.includes(user.priviledge);
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, registerAccount, hasRole, isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook belongs next to its provider
export function useAuth() {
  return useContext(AuthContext);
}
