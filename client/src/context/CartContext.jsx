import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api } from "../api";

const Ctx = createContext();
export const useCart = () => useContext(Ctx);

const MAX_LINES = 50;

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ec_cart")) || []; } catch { return []; }
  });
  const [notice, setNotice] = useState([]);
  const ref = useRef(items);
  ref.current = items;

  useEffect(() => { try { localStorage.setItem("ec_cart", JSON.stringify(items)); } catch {} }, [items]);

  // item = { product, name, image, price, stock, qty }
  const add = (p, qty = 1) =>
    setItems((cur) => {
      if (p.stock < 1) return cur;
      const found = cur.find((i) => i.product === p.id);
      if (found) return cur.map((i) => (i.product === p.id ? { ...i, qty: Math.min(i.qty + qty, p.stock), stock: p.stock, price: p.price } : i));
      if (cur.length >= MAX_LINES) return cur;
      return [...cur, { product: p.id, name: p.name, image: p.image, price: p.price, stock: p.stock, qty: Math.min(qty, p.stock) }];
    });
  const setQty = (id, qty) =>
    setItems((cur) => cur.map((i) => (i.product === id ? { ...i, qty: Math.max(1, Math.min(qty, i.stock)) } : i)));
  const remove = (id) => setItems((cur) => cur.filter((i) => i.product !== id));
  const clear = () => { setItems([]); setNotice([]); };

  // Re-check price, stock and availability with the server (the cart only stores a snapshot).
  const sync = useCallback(async () => {
    const snapshot = ref.current;
    if (!snapshot.length) return;
    try {
      const list = await api(`/products?limit=50&ids=${encodeURIComponent(snapshot.map((i) => i.product).join(","))}`);
      const byId = new Map(list.map((p) => [p.id, p]));
      const msgs = [];
      const next = [];
      for (const i of snapshot) {
        const p = byId.get(i.product);
        if (!p) { msgs.push(`"${i.name}" is no longer available and was removed.`); continue; }
        if (p.stock < 1) { msgs.push(`"${p.name}" is out of stock and was removed.`); continue; }
        const qty = Math.min(i.qty, p.stock);
        if (qty < i.qty) msgs.push(`Only ${p.stock} left of "${p.name}", quantity lowered.`);
        if (p.price !== i.price) msgs.push(`The price of "${p.name}" changed to ৳${p.price.toLocaleString("en-US")}.`);
        next.push({ ...i, name: p.name, image: p.image, price: p.price, stock: p.stock, qty });
      }
      if (JSON.stringify(next) !== JSON.stringify(snapshot)) setItems(next);
      if (msgs.length) setNotice(msgs);
    } catch { /* offline or server down: keep the cart as it is */ }
  }, []);

  const count = items.reduce((s, i) => s + i.qty, 0);
  const total = items.reduce((s, i) => s + i.qty * i.price, 0);

  return (
    <Ctx.Provider value={{ items, add, setQty, remove, clear, sync, notice, clearNotice: () => setNotice([]), count, total }}>
      {children}
    </Ctx.Provider>
  );
}
