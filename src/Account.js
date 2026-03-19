import { useState } from "react";
import { supabase } from "./supabase";

function Account({ user, onLogout, onChangePage, onUpdateUser }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [message, setMessage] = useState("");

  async function saveName() {
    const { error } = await supabase
      .from("profiles")
      .update({ name })
      .eq("id", user.id);
    if (error) {
      setMessage("Failed to update name.");
    } else {
      onUpdateUser({ ...user, name });
      setMessage("Name updated!");
      setEditing(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    onLogout();
  }

  return (
    <div style={{ padding: "20px", maxWidth: "400px" }}>
      <h1>Account</h1>

      <div style={{ background: "#f9f9f9", padding: "16px", borderRadius: "8px", marginBottom: "12px" }}>
        <div style={{ marginBottom: "10px" }}>
          <strong>Name:</strong>{" "}
          {editing ? (
            <span style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveName()}
                style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #ccc" }}
              />
              <button onClick={saveName} style={{ padding: "4px 10px", background: "#4434d3", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Save</button>
              <button onClick={() => { setEditing(false); setName(user.name); }} style={{ padding: "4px 10px", background: "#ccc", border: "none", borderRadius: "4px", cursor: "pointer" }}>Cancel</button>
            </span>
          ) : (
            <span>
              {user.name}{" "}
              {user.role === "coach" && <span onClick={() => setEditing(true)} style={{ fontSize: "13px", color: "#4434d3", cursor: "pointer", marginLeft: "6px" }}>✏️ Edit</span>}
            </span>
          )}
        </div>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Role:</strong> {user.role === "coach" ? "🏆 Coach" : " Player"}</p>
        {message && <p style={{ color: "green", fontSize: "13px" }}>{message}</p>}
      </div>

      <div
        onClick={() => onChangePage("changePassword")}
        style={{ background: "#f9f9f9", padding: "16px", borderRadius: "8px", marginBottom: "12px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
        onMouseEnter={(e) => e.currentTarget.style.background = "#e8e8e8"}
        onMouseLeave={(e) => e.currentTarget.style.background = "#f9f9f9"}
      >
        <span style={{ fontWeight: "500" }}>🔒 Change Password</span>
        <span style={{ color: "#999" }}>→</span>
      </div>

      <button
        onClick={handleLogout}
        style={{ width: "100%", padding: "12px", background: "red", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "16px" }}
      >
        Log Out
      </button>
    </div>
  );
}

export default Account;