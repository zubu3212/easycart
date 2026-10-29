import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api, money } from "../api";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();
  const [placed] = useState(!!loc.state?.placed); // remember it, then wipe it so a refresh does not show it again
  const [form, setForm] = useState({ name: user.name || "", phone: user.phone || "", address: user.address || "", password: "" });
  const [msg, setMsg] = useState(null); // { ok, text }
  const [orders, setOrders] = useState([]);
  const [ordersError, setOrdersError] = useState("");

  useEffect(() => { if (loc.state?.placed) nav(loc.pathname, { replace: true, state: null }); }, []); // eslint-disable-line
  useEffect(() => { api("/orders/mine").then(setOrders).catch((e) => setOrdersError(e.message)); }, []);

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setMsg({ ok: false, text: "Name cannot be empty" });
    if (form.password && form.password.length < 6) return setMsg({ ok: false, text: "Password must be at least 6 characters" });
    try {
      await updateProfile(form.password ? form : { name: form.name, phone: form.phone, address: form.address });
      setForm({ ...form, password: "" });
      setMsg({ ok: true, text: "Profile saved" });
    } catch (err) { setMsg({ ok: false, text: err.message }); }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <form onSubmit={save} className="panel h-fit space-y-4 p-5">
        <h1 className="text-xl font-extrabold">My profile</h1>
        <p className="text-sm text-slate-500">{user.email}</p>
        <div><label className="label">Name</label><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><label className="label">Phone</label><input className="input" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        <div><label className="label">Address</label><textarea className="input" rows="3" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
        <div><label className="label">New password (optional)</label><input className="input" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
        {msg && <p className={`text-sm font-semibold ${msg.ok ? "text-volt" : "text-red-600"}`} role="status">{msg.text}</p>}
        <button className="btn-primary w-full">Save changes</button>
      </form>

      <section>
        {placed && <p className="mb-4 rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">Order placed. We will confirm it shortly.</p>}
        <h2 className="mb-3 text-xl font-extrabold">My orders</h2>
        {ordersError && <p className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{ordersError}</p>}
        {orders.length === 0 && !ordersError ? <p className="text-slate-500">You have not placed any orders yet.</p> : (
          <div className="space-y-3">
            {orders.map((o) => (
              <div key={o.id} className="panel p-4">
                <div className="flex flex-wrap justify-between gap-2 text-sm">
                  <span className="font-semibold">#{o.id.slice(-6).toUpperCase()} · {new Date(o.createdAt).toLocaleDateString()}</span>
                  <span className="rounded-full bg-volt-soft px-3 py-0.5 font-semibold text-volt">{o.status}</span>
                </div>
                <ul className="mt-2 text-sm text-slate-700">{o.items.map((i, k) => <li key={k}>{i.name} × {i.qty}</li>)}</ul>
                <p className="mt-2 text-sm font-extrabold">{money(o.total)} <span className="font-normal text-slate-500">· {o.paymentMethod === "cod" ? "Cash on delivery" : o.isPaid ? "Paid by card" : "Card (payment pending)"}</span></p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
