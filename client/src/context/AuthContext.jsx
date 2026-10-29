import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api";

const Ctx = createContext();
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ec_user")); } catch { return null; }
  });

  const save = (u) => {
    try {
      if (u) localStorage.setItem("ec_user", JSON.stringify(u));
      else localStorage.removeItem("ec_user");
    } catch {}
    setUser(u);
  };

  // api.js fires this when the server says our token is no longer valid
  useEffect(() => {
    const out = () => save(null);
    window.addEventListener("ec:logout", out);
    return () => window.removeEventListener("ec:logout", out);
  }, []);

  // On app start, check the saved login is still valid and refresh role/name/phone/address
  useEffect(() => {
    const token = user?.token;
    if (!token) return;
    api("/auth/profile").then((p) => save({ ...p, token })).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email, password) => save(await api("/auth/login", { method: "POST", body: { email, password } }));
  const register = async (name, email, password) =>
    save(await api("/auth/register", { method: "POST", body: { name, email, password } }));
  const updateProfile = async (data) => save(await api("/auth/profile", { method: "PUT", body: data }));
  const logout = () => save(null);

  return <Ctx.Provider value={{ user, login, register, logout, updateProfile }}>{children}</Ctx.Provider>;
}
