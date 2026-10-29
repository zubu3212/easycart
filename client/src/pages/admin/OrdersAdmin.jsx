import { useEffect, useState } from "react";
import { api, money } from "../../api";

// Same rules as the server: Delivered and Cancelled are final.
const NEXT = {
  Pending: ["Processing", "Shipped", "Delivered", "Cancelled"],
  Processing: ["Shipped", "Delivered", "Cancelled"],
  Shipped: ["Delivered"],
  Delivered: [],
  Cancelled: [],
};

export default function OrdersAdmin() {
  const [orders, setOrders] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const load = () => api("/orders").then((d) => { setOrders(d); setLoaded(true); }).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const setStatus = async (id, status) => {
    setError("");
    try { await api(`/orders/${id}/status`, { method: "PUT", body: { status } }); }
    catch (e) { setError(e.message); }
    load();
  };

  const errorBox = error && <p className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>;
  if (!loaded) return <>{errorBox || <p className="text-slate-500">Loading...</p>}</>;
  if (orders.length === 0) return <>{errorBox}<p className="text-slate-500">No orders yet.</p></>;
  return (
    <div className="space-y-3">
      {errorBox}
      {orders.map((o) => (
        <div key={o.id} className="panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-extrabold">#{o.id.slice(-6).toUpperCase()} · {o.user?.name}</p>
              <p className="text-xs text-slate-500">{new Date(o.createdAt).toLocaleString()} · {o.user?.email}</p>
            </div>
            <select className="input !w-auto" value={o.status} disabled={NEXT[o.status].length === 0} onChange={(e) => setStatus(o.id, e.target.value)} aria-label="Order status">
              {[o.status, ...NEXT[o.status]].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <ul className="mt-3 text-sm">{o.items.map((i, k) => <li key={k}>{i.name} × {i.qty}</li>)}</ul>
          <p className="mt-2 text-sm text-slate-600">{o.shipping?.name}, {o.shipping?.phone}<br />{o.shipping?.address}</p>
          <p className="mt-2 font-extrabold">{money(o.total)} <span className="text-sm font-normal text-slate-500">· {o.paymentMethod === "cod" ? "Cash on delivery" : "Card"} · {o.isPaid ? "Paid" : "Unpaid"}</span></p>
        </div>
      ))}
    </div>
  );
}
