import { useEffect, useState } from "react";
import type { InventoryItem } from "../types";

type Props = {
  item: InventoryItem;
  onDelete: () => void;
  onUpdate: (payload: Partial<{ name: string; quantity: number; unitPrice: number }>) => void;
};

const LOW_STOCK_THRESHOLD = 5;

const fmt = (n: number) => n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function InventoryItemCard({ item, onDelete, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity);
  const [unitPrice, setUnitPrice] = useState(item.unitPrice);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!editing) {
      setName(item.name);
      setQuantity(item.quantity);
      setUnitPrice(item.unitPrice);
    }
  }, [item, editing]);

  function save() {
    setError("");
    if (!name.trim()) return setError("Name is required");
    if (!Number.isFinite(quantity) || quantity < 0) return setError("Invalid quantity");
    if (!Number.isFinite(unitPrice) || unitPrice < 0) return setError("Invalid unit price");
    onUpdate({ name: name.trim(), quantity, unitPrice });
    setEditing(false);
  }

  function cancel() {
    setName(item.name); setQuantity(item.quantity); setUnitPrice(item.unitPrice);
    setError(""); setEditing(false);
  }

  const isLowStock = item.quantity <= LOW_STOCK_THRESHOLD && item.quantity > 0;
  const isOutOfStock = item.quantity === 0;

  if (editing) {
    return (
      <div className="item-card">
        <div className="item-card-edit-form">
          <div className="item-card-edit-row">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Item name" />
            <input type="number" min={0} value={quantity} onChange={e => setQuantity(Number(e.target.value))} placeholder="Qty" />
            <input type="number" min={0} step="0.01" value={unitPrice} onChange={e => setUnitPrice(Number(e.target.value))} placeholder="Unit price" />
          </div>
          {error && <p style={{ color: "var(--danger)", fontSize: "0.8rem", margin: 0 }}>{error}</p>}
          <div className="item-card-actions">
            <button className="btn btn-primary btn-sm" onClick={save}>Save</button>
            <button className="btn btn-ghost btn-sm" onClick={cancel}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`item-card${isOutOfStock ? " item-card-out" : isLowStock ? " item-card-low" : ""}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div className="item-card-name">{item.name}</div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {isOutOfStock && <span className="stock-badge out">Out of stock</span>}
          {isLowStock && <span className="stock-badge low">Low stock</span>}
        </div>
      </div>

      <div className="item-card-meta">
        <span>Qty: <strong>{item.quantity.toLocaleString()}</strong></span>
        <span>Unit: <strong>₱{fmt(item.unitPrice)}</strong></span>
        <span>Total: <strong>₱{fmt(item.totalValue)}</strong></span>
      </div>

      <div className="item-card-date">
        Added {new Date(item.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
      </div>

      <div className="item-card-actions">
        <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>✏️ Edit</button>
        <button className="btn btn-danger btn-sm" onClick={onDelete}>🗑 Delete</button>
      </div>
    </div>
  );
}
