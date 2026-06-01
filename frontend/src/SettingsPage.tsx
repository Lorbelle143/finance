import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import Sidebar from "./Sidebar";
import Toast, { type ToastMsg } from "./components/Toast";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, authFetch, logout, updateUser } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [nameSaving, setNameSaving] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  const [toast, setToast] = useState<ToastMsg>(null);

  async function handleSaveName(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setToast({ text: "Name cannot be empty.", kind: "error" }); return; }
    setNameSaving(true);
    try {
      const res = await authFetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      updateUser({ name: name.trim() });
      setToast({ text: "Name updated successfully.", kind: "success" });
    } catch (err) {
      setToast({ text: err instanceof Error ? err.message : "Failed.", kind: "error" });
    } finally { setNameSaving(false); }
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    if (!currentPw || !newPw || !confirmPw) { setToast({ text: "All fields are required.", kind: "error" }); return; }
    if (newPw.length < 6) { setToast({ text: "New password must be at least 6 characters.", kind: "error" }); return; }
    if (newPw !== confirmPw) { setToast({ text: "Passwords do not match.", kind: "error" }); return; }
    setPwSaving(true);
    try {
      const res = await authFetch("/api/profile/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setToast({ text: "Password changed successfully.", kind: "success" });
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err) {
      setToast({ text: err instanceof Error ? err.message : "Failed.", kind: "error" });
    } finally { setPwSaving(false); }
  }

  return (
    <div className="page-shell">
      <div className="app-layout">
        <Sidebar />
        <div className="main-area">
          <div className="page-header">
            <div className="page-eyebrow">Account</div>
            <h1 className="page-title">Settings</h1>
            <p className="page-subtitle">Manage your profile and account security.</p>
          </div>

          <div className="settings-grid">
            {/* Profile */}
            <div className="settings-section">
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                <div className="avatar avatar-lg">{user?.name?.charAt(0).toUpperCase() ?? "U"}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>{user?.name}</div>
                  <div style={{ color: "var(--muted)", fontSize: "0.875rem" }}>{user?.email}</div>
                </div>
              </div>
              <h3>Update Profile</h3>
              <form className="settings-form" onSubmit={handleSaveName}>
                <div className="form-group">
                  <label className="form-label">Display Name</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input value={user?.email ?? ""} disabled style={{ opacity: 0.6, cursor: "not-allowed" }} />
                </div>
                <button type="submit" className="btn btn-primary" disabled={nameSaving}>
                  {nameSaving ? "Saving..." : "Save Changes"}
                </button>
              </form>
            </div>

            {/* Password */}
            <div className="settings-section">
              <h3>Change Password</h3>
              <form className="settings-form" onSubmit={handleChangePassword}>
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
                </div>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min. 6 characters" autoComplete="new-password" />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Repeat new password" autoComplete="new-password" />
                </div>
                <button type="submit" className="btn btn-primary" disabled={pwSaving}>
                  {pwSaving ? "Saving..." : "Change Password"}
                </button>
              </form>
            </div>

            {/* Danger zone */}
            <div className="settings-section">
              <h3>Session</h3>
              <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: 16, lineHeight: 1.6 }}>
                Logging out clears your session from this device. Your data is saved and you can log back in anytime.
              </p>
              <button className="btn btn-danger" onClick={() => { logout(); navigate("/"); }}>
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <Toast msg={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
