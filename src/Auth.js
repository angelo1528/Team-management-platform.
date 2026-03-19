import { useState } from "react";
import { supabase } from "./supabase";

function Auth({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login");

async function handleLogin() {
    setLoading(true);
    setError("");
const { data, error } = await supabase.auth.signInWithPassword({ email: email.toLowerCase(), password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }


    let { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();


    if (!profile) {
      const { data: profileByEmail, error: emailError } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", email.toLowerCase())
        .single();


      if (profileByEmail) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ id: data.user.id, temp_id: null })
          .eq("email", email.toLowerCase());

        profile = { ...profileByEmail, id: data.user.id };
      }
    }

    if (!profile) {
      setError("No profile found. Please contact your coach.");
      setLoading(false);
      return;
    }

    onLogin(profile);
    setLoading(false);
  }
async function handleSignUp() {
    setLoading(true);
    setError("");

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", email.toLowerCase())
      .single();

    if (existingProfile) {
      setError("An account with this email already exists. Please log in.");
      setLoading(false);
      return;
    }

    const { data: teamPlayer } = await supabase
      .from("team_players")
      .select("name")
      .eq("email", email.toLowerCase())
      .single();

const { data, error } = await supabase.auth.signUp({ email: email.toLowerCase(), password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    await supabase.from("profiles").insert({
      id: data.user.id,
      email: email.toLowerCase(),
      role: teamPlayer ? "player" : "coach",
      name: teamPlayer ? teamPlayer.name : "Coach",
      temp_id: null
    });

    setError("Account created! Please log in.");
    setMode("login");
    setLoading(false);
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#f0f0f0" }}>
      <div style={{ background: "white", padding: "40px", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", width: "min(320px, 90vw)" }}>
        <h1 style={{ textAlign: "center", marginBottom: "24px", color: "#4434d3" }}>  Soccer Manager</h1>
        
        <div style={{ display: "flex", marginBottom: "24px", borderRadius: "6px", overflow: "hidden", border: "1px solid #ccc" }}>
          <button
            onClick={() => setMode("login")}
            style={{ flex: 1, padding: "10px", background: mode === "login" ? "#4434d3" : "white", color: mode === "login" ? "white" : "black", border: "none", cursor: "pointer", fontWeight: "600" }}
          >Log In</button>
          <button
            onClick={() => setMode("signup")}
            style={{ flex: 1, padding: "10px", background: mode === "signup" ? "#4434d3" : "white", color: mode === "signup" ? "white" : "black", border: "none", cursor: "pointer", fontWeight: "600" }}
          >Sign Up</button>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontWeight: "500" }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (mode === "login" ? handleLogin() : handleSignUp())}
            style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box" }}
          />
        </div>
        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontWeight: "500" }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (mode === "login" ? handleLogin() : handleSignUp())}
            style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box" }}
          />
        </div>

        {error && <p style={{ color: error.includes("created") ? "green" : "red", marginBottom: "16px", fontSize: "14px" }}>{error}</p>}

        <button
          onClick={mode === "login" ? handleLogin : handleSignUp}
          disabled={loading}
          style={{ width: "100%", padding: "12px", background: "#4434d3", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "16px" }}
        >
          {loading ? "Please wait..." : mode === "login" ? "Log In" : "Sign Up"}
        </button>

        {mode === "login" && (
          <p style={{ textAlign: "center", marginTop: "16px", fontSize: "13px", color: "#666" }}>
            New coach? <span onClick={() => setMode("signup")} style={{ color: "#4434d3", cursor: "pointer", fontWeight: "600" }}>Sign Up</span>
          </p>
        )}
      </div>
    </div>
  );
}

export default Auth;