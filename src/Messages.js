import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

function Messages({ user }) {
  console.log("Messages user.id:", user?.id, "user.email:", user?.email);
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [coachId, setCoachId] = useState(null);
  const [archivedPlayers, setArchivedPlayers] = useState([]);
  const [showArchives, setShowArchives] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [lastReadTimes, setLastReadTimes] = useState({});
  const selectedPlayerRef = useRef(null);
  const coachIdRef = useRef(null);
  const coachChatRef = useRef(null);
  const playerChatRef = useRef(null);
  const lastReadTimesRef = useRef(JSON.parse(localStorage.getItem("lastReadTimes") || "{}"));

  const isCoach = user?.role === "coach";

  useEffect(() => {
    selectedPlayerRef.current = selectedPlayer;
  }, [selectedPlayer]);

  useEffect(() => {
    coachIdRef.current = coachId;
  }, [coachId]);

  useEffect(() => {
    if (isCoach) {
      fetchPlayers();
      fetchArchivedPlayers();
      fetchUnreadCounts();
    } else {
      fetchCoach();
      fetchMyMessages();
    }
  }, []);

useEffect(() => {
    if (isCoach && selectedPlayer) {
      fetchMessages(selectedPlayer.id);
      const now = new Date().toISOString();
      lastReadTimesRef.current = { ...lastReadTimesRef.current, [selectedPlayer.id]: now };
localStorage.setItem("lastReadTimes", JSON.stringify(lastReadTimesRef.current));
      setUnreadCounts(prev => ({ ...prev, [selectedPlayer.id]: 0 }));
    }
  }, [selectedPlayer]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isCoach) {
        if (selectedPlayerRef.current) {
          fetchMessages(selectedPlayerRef.current.id);
        }
        fetchUnreadCounts();
      } else {
        fetchMyMessages();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isCoach]);

  useEffect(() => {
    if (coachChatRef.current) {
      coachChatRef.current.scrollTop = coachChatRef.current.scrollHeight;
    }
    if (playerChatRef.current) {
      playerChatRef.current.scrollTop = playerChatRef.current.scrollHeight;
    }
  }, [messages]);

  async function fetchPlayers() {
    const { data: coachTeams } = await supabase
      .from("teams")
      .select("id")
      .eq("coach_id", user.id);

    if (!coachTeams || coachTeams.length === 0) {
      setPlayers([]);
      return;
    }

    const teamIds = coachTeams.map(t => t.id);
    

    const { data: teamPlayers } = await supabase
      .from("team_players")
      .select("email, name")
      .in("team_id", teamIds);

    if (!teamPlayers) { setPlayers([]); return; }

    const emails = [...new Set(teamPlayers.map(p => p.email))];

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .in("email", emails)
      .eq("archived", false);

    const seen = new Set();
    const unique = (data || []).filter(p => {
      if (seen.has(p.email)) return false;
      seen.add(p.email);
      return true;
    });
    setPlayers(unique);
  }

  async function fetchArchivedPlayers() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "player")
      .eq("archived", true);
    setArchivedPlayers(data || []);
  }



async function fetchUnreadCounts() {
    const { data } = await supabase
      .from("messages")
      .select("sender_id, created_at")
      .eq("receiver_id", user.id);
    
    const counts = {};
    (data || []).forEach(msg => {
      const lastRead = lastReadTimesRef.current[msg.sender_id] || 0;
      if (new Date(msg.created_at) > new Date(lastRead)) {
        counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1;
      }
    });
    setUnreadCounts(counts);
  }


  
  async function fetchCoach() {
    const { data: tp } = await supabase
      .from("team_players")
      .select("team_id")
      .eq("email", user.email)
      .single();
    if (!tp) return;

    const { data: team } = await supabase
      .from("teams")
      .select("coach_id")
      .eq("id", tp.team_id)
      .single();
    if (team) {
      setCoachId(team.coach_id);
      coachIdRef.current = team.coach_id;
    }
  }

  async function fetchMyMessages() {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  }

  async function fetchMessages(playerId) {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${playerId}),and(sender_id.eq.${playerId},receiver_id.eq.${user.id})`
      )
      .order("created_at", { ascending: true });
    setMessages(data || []);
  }

  async function deleteConversation(player) {
    const { error } = await supabase
      .from("messages")
      .delete()
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${player.id}),and(sender_id.eq.${player.id},receiver_id.eq.${user.id})`);
    if (!error && selectedPlayer?.id === player.id) {
      setMessages([]);
    }
    setConfirmDelete(null);
  }

  async function sendMessage() {
    if (newMessage === "") return;
    const receiverId = isCoach ? selectedPlayer?.id : coachIdRef.current;
        console.log("sendMessage receiverId:", receiverId, "sender:", user.id);
    if (!receiverId) return;
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: receiverId,
      content: newMessage
    });
    if (!error) {
      setNewMessage("");
      if (isCoach && selectedPlayer) fetchMessages(selectedPlayer.id);
      else fetchMyMessages();
    }
  }

  async function sendToAll() {
    if (newMessage === "") return;
    for (const player of players) {
      await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: player.id,
        content: `[TO ALL] ${newMessage}`
      });
    }
    setNewMessage("");
    if (selectedPlayer) fetchMessages(selectedPlayer.id);
  }

  if (!isCoach) {
    return (
      <div style={{ padding: "20px", maxWidth: "700px" }}>
        <h1>Messages</h1>
        <div ref={playerChatRef} style={{ height: "400px", overflowY: "auto", background: "#f9f9f9", borderRadius: "8px", padding: "16px", marginBottom: "12px" }}>
          {messages.length === 0 && <p style={{ color: "#999" }}>No messages yet. Your coach will message you here.</p>}
          {messages.map((msg) => (
            <div style={{ display: "flex", justifyContent: msg.sender_id === user.id ? "flex-end" : "flex-start", marginBottom: "10px", width: "100%", boxSizing: "border-box" }}>
              <div style={{ background: msg.sender_id === user.id ? "#4434d3" : "white", color: msg.sender_id === user.id ? "white" : "black", padding: "10px 14px", borderRadius: "12px", maxWidth: "85%", boxShadow: "0 1px 4px rgba(0,0,0,0.1)", wordBreak: "break-all", overflowWrap: "break-word" }}>
                <div style={{ fontSize: "11px", color: msg.sender_id === user.id ? "rgba(255,255,255,0.7)" : "#999", marginBottom: "4px" }}>
                  {msg.sender_id === user.id ? "You" : "Coach"}
                </div>
                {msg.content.startsWith("[TO ALL]") ? msg.content.replace("[TO ALL] ", "") : msg.content}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            placeholder="Reply to coach..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            style={{ flex: 1, padding: "10px", borderRadius: "6px", border: "1px solid #ccc" , minWidth: 0 }}
          />
          <button onClick={sendMessage} style={{ padding: "10px 20px", background: "#4434d3", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>Send</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Messages</h1>
<div style={{ display: "flex", gap: "20px", flexDirection: window.innerWidth < 600 ? "column" : "row" }}>
        <div style={{ width: window.innerWidth < 600 ? "100%" : "200px" }}>
          <h3>Players</h3>
          {players.map((player) => (
            <div key={player.id} style={{ display: "flex", alignItems: "center", marginBottom: "6px", gap: "6px" }}>
              <div onClick={() => setSelectedPlayer(player)} style={{ flex: 1, padding: "10px", background: selectedPlayer?.id === player.id ? "#4434d3" : "#f0f0f0", color: selectedPlayer?.id === player.id ? "white" : "black", borderRadius: "6px", cursor: "pointer", fontWeight: "500", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {player.name}
                {unreadCounts[player.id] > 0 && (
                  <span style={{ background: "red", color: "white", borderRadius: "50%", fontSize: "11px", width: "18px", height: "18px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", flexShrink: 0 }}>
                    {unreadCounts[player.id]}
                  </span>
                )}
              </div>
              <button onClick={() => setConfirmDelete(player)} style={{ padding: "6px 8px", background: "none", border: "1px solid white", borderRadius: "6px", cursor: "pointer", fontSize: "14px" }}>🗑️</button>
            </div>
          ))}
          <div style={{ marginTop: "20px", borderTop: "1px solid #ddd", paddingTop: "12px" }}>
            <div onClick={() => setShowArchives(!showArchives)} style={{ cursor: "pointer", fontWeight: "600", fontSize: "14px", color: "#888", display: "flex", justifyContent: "space-between" }}>
              <span>📁 Archives</span>
              <span>{showArchives ? "▲" : "▼"}</span>
            </div>
            {showArchives && (
              <div style={{ marginTop: "8px" }}>
                {archivedPlayers.length === 0 && <p style={{ color: "#999", fontSize: "13px" }}>No archived players.</p>}
                {archivedPlayers.map((player) => (
                  <div key={player.id} onClick={() => setSelectedPlayer(player)} style={{ padding: "10px", marginBottom: "6px", background: selectedPlayer?.id === player.id ? "#888" : "#e8e8e8", color: selectedPlayer?.id === player.id ? "white" : "#555", borderRadius: "6px", cursor: "pointer", fontWeight: "500", fontSize: "14px", fontStyle: "italic" }}>
                    {player.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ flex: 1 }}>
          {!selectedPlayer && <p style={{ color: "#999" }}>Select a player to start messaging.</p>}
          {selectedPlayer && (
            <>
              <h3>Conversation with {selectedPlayer.name}</h3>
              <div ref={coachChatRef} style={{ height: "400px", overflowY: "auto", background: "#f9f9f9", borderRadius: "8px", padding: "16px", marginBottom: "12px" }}>
                {messages.length === 0 && <p style={{ color: "#999" }}>No messages yet.</p>}
                {messages.map((msg) => (
                  <div style={{ display: "flex", justifyContent: msg.sender_id === user.id ? "flex-end" : "flex-start", marginBottom: "10px", width: "100%", boxSizing: "border-box" }}>
                    <div style={{ background: msg.sender_id === user.id ? "#4434d3" : "white", color: msg.sender_id === user.id ? "white" : "black", padding: "10px 14px", borderRadius: "12px", maxWidth: "85%", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
                      <div style={{ fontSize: "11px", color: msg.sender_id === user.id ? "rgba(255,255,255,0.7)" : "#999", marginBottom: "4px" }}>
                        {msg.sender_id === user.id ? "You" : selectedPlayer.name}
                      </div>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  style={{ flex: 1, padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
                />
                <button onClick={sendMessage} style={{ padding: "10px 20px", background: "#4434d3", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>Send</button>
                <button onClick={sendToAll} style={{ padding: "10px 20px", background: "#e67e22", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>📢 All</button>
              </div>
            </>
          )}
        </div>
      </div>
      {confirmDelete && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "white", padding: "28px", borderRadius: "12px", maxWidth: "320px", width: "100%", textAlign: "center" }}>
            <p style={{ fontWeight: "600", fontSize: "16px", marginBottom: "8px" }}>Delete Conversation</p>
            <p style={{ color: "#666", marginBottom: "20px" }}>Are you sure you want to delete all messages with <strong>{confirmDelete.name}</strong>?</p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding: "10px 20px", borderRadius: "6px", border: "1px solid #ccc", cursor: "pointer", background: "white" }}>Cancel</button>
              <button onClick={() => deleteConversation(confirmDelete)} style={{ padding: "10px 20px", borderRadius: "6px", border: "none", cursor: "pointer", background: "red", color: "white", fontWeight: "600" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Messages;