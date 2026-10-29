import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { money, onImgError } from "../api";
import { useCart } from "../context/CartContext";

export default function Cart() {
  const { items, setQty, remove, total, sync, notice, clearNotice } = useCart();
  const nav = useNavigate();

  // refresh prices and stock from the server whenever the cart page opens
  useEffect(() => { sync(); }, [sync]);

  const banner = notice.length > 0 && (
    <div className="mb-4 flex items-start justify-between gap-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800" role="status">
      <ul className="space-y-1">{notice.map((m, i) => <li key={i}>{m}</li>)}</ul>
      <button className="font-bold" onClick={clearNotice} aria-label="Dismiss">✕</button>
    </div>
  );

  if (items.length === 0)
    return (
      <div className="py-20 text-center">
        {banner}
        <p className="text-lg font-semibold">Your cart is empty</p>
        <Link to="/" className="btn-primary mt-4">Browse products</Link>
      </div>
    );

  return (
    <>
      {banner}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="panel divide-y divide-line">
          {items.map((i) => (
            <div key={i.product} className="flex gap-4 p-4">
              <img src={i.image} alt="" onError={onImgError} className="h-24 w-24 rounded-md bg-paper object-cover" />
              <div className="flex-1">
                <Link to={`/product/${i.product}`} className="font-bold hover:text-volt">{i.name}</Link>
                <p className="text-sm text-slate-500">{money(i.price)} each</p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex items-center rounded-md border border-line text-sm">
                    <button className="px-2.5 py-1 font-bold" onClick={() => setQty(i.product, i.qty - 1)} aria-label="Decrease">−</button>
                    <span className="w-7 text-center font-semibold">{i.qty}</span>
                    <button className="px-2.5 py-1 font-bold" onClick={() => setQty(i.product, i.qty + 1)} aria-label="Increase">+</button>
                  </div>
                  <button className="text-sm text-red-600" onClick={() => remove(i.product)}>Remove</button>
                </div>
              </div>
              <p className="font-extrabold">{money(i.price * i.qty)}</p>
            </div>
          ))}
        </div>
        <aside className="panel h-fit p-5">
          <h2 className="text-lg font-extrabold">Order summary</h2>
          <div className="mt-4 flex justify-between text-sm"><span>Subtotal</span><span>{money(total)}</span></div>
          <div className="mt-2 flex justify-between text-sm"><span>Delivery</span><span>Free</span></div>
          <div className="mt-4 flex justify-between border-t border-line pt-4 text-lg font-extrabold"><span>Total</span><span>{money(total)}</span></div>
          <button className="btn-primary mt-5 w-full" onClick={() => nav("/checkout")}>Checkout</button>
        </aside>
      </div>
    </>
  );
}
