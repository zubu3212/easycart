import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// fields: [name, label, type, autoComplete]
function Form({ title, fields, onSubmit, footer, button }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    // Read values straight from the form so browser autofill always works
    const vals = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true); setError("");
    try { await onSubmit(vals); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="panel mx-auto mt-6 max-w-md space-y-4 p-6">
      <h1 className="text-2xl font-extrabold">{title}</h1>
      {fields.map(([key, label, type, auto]) => (
        <div key={key}>
          <label className="label" htmlFor={key}>{label}</label>
          <input id={key} name={key} className="input" type={type} autoComplete={auto} required minLength={type === "password" && auto === "new-password" ? 6 : undefined} />
        </div>
      ))}
      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
      <button className="btn-primary w-full" disabled={busy}>{busy ? "Please wait..." : button}</button>
      <p className="text-center text-sm">{footer}</p>
    </form>
  );
}

export function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const from = useLocation().state?.from || "/";
  if (user) return <Navigate to={from} replace />;
  return (
    <Form title="Log in" button="Log in"
      fields={[["email", "Email", "email", "email"], ["password", "Password", "password", "current-password"]]}
      onSubmit={async (v) => { await login(v.email, v.password); nav(from, { replace: true }); }}
      footer={<>New here? <Link to="/register" className="font-semibold text-volt">Create an account</Link></>} />
  );
}

export function Register() {
  const { user, register } = useAuth();
  const nav = useNavigate();
  if (user) return <Navigate to="/" replace />;
  return (
    <Form title="Create your account" button="Sign up"
      fields={[["name", "Full name", "text", "name"], ["email", "Email", "email", "email"], ["password", "Password (min 6 characters)", "password", "new-password"]]}
      onSubmit={async (v) => { await register(v.name, v.email, v.password); nav("/"); }}
      footer={<>Already have an account? <Link to="/login" className="font-semibold text-volt">Log in</Link></>} />
  );
}
