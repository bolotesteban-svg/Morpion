import { useState, useEffect } from "react";
import socket from "./socket.js";
import Game from "./Game.jsx";

export default function App() {
  const [screen, setScreen] = useState("lobby");
  const [roomCode, setRoomCode] = useState("");
  const [joinInput, setJoinInput] = useState("");
  const [symbol, setSymbol] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [matchResult, setMatchResult] = useState(null);
  const [error, setError] = useState("");
  const [rematchPending, setRematchPending] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [gameConfig, setGameConfig] = useState({ scoresToWin: 5, timerSeconds: 5, maxMoves: 3 });

  useEffect(() => {
    socket.on("room_created", ({ code, symbol, config }) => {
      setRoomCode(code);
      setSymbol(symbol);
      setGameConfig(config);
      setScreen("waiting");
    });

    socket.on("room_joined", ({ code, symbol, config }) => {
      setRoomCode(code);
      setSymbol(symbol);
      setGameConfig(config);
    });

    socket.on("game_start", ({ state }) => {
      setGameState(state);
      setMatchResult(null);
      setRematchPending(false);
      setChatMessages([]);
      setScreen("game");
    });

    socket.on("game_state", ({ state }) => {
      setGameState({ ...state });
    });

    socket.on("match_over", ({ winner, scores }) => {
      setMatchResult({ winner, scores });
      setScreen("matchOver");
    });

    socket.on("rematch_request", () => setRematchPending(true));

    socket.on("chat_msg", ({ symbol, msg }) => {
      setChatMessages(prev => [...prev.slice(-9), { symbol, msg, id: Date.now() }]);
    });

    socket.on("opponent_left", () => {
      setError("Ton adversaire a quitté la partie.");
      setScreen("lobby");
    });

    socket.on("error", (msg) => setError(msg));

    return () => {
      ["room_created","room_joined","game_start","game_state","match_over",
       "rematch_request","chat_msg","opponent_left","error"].forEach(e => socket.off(e));
    };
  }, []);

  const createRoom = (config, hostSymbol) => {
    setError("");
    socket.emit("create_room", { config, hostSymbol });
  };

  const joinRoom = () => {
    if (!joinInput.trim()) return;
    setError("");
    socket.emit("join_room", { code: joinInput.trim().toUpperCase() });
  };

  const playMove = (index) => socket.emit("play", { code: roomCode, index });

  const sendChat = (msg) => socket.emit("chat", { code: roomCode, msg });

  const requestRematch = () => {
    socket.emit("rematch", { code: roomCode });
    setRematchPending(false);
  };

  const goLobby = () => {
    setScreen("lobby");
    setGameState(null);
    setMatchResult(null);
    setRoomCode("");
    setJoinInput("");
    setError("");
    setChatMessages([]);
  };

  if (screen === "lobby") return (
    <Lobby joinInput={joinInput} setJoinInput={setJoinInput}
      onCreate={createRoom} onJoin={joinRoom} error={error} />
  );
  if (screen === "waiting") return <Waiting code={roomCode} symbol={symbol} />;
  if (screen === "game" && gameState) return (
    <Game state={gameState} symbol={symbol} onPlay={playMove}
      chatMessages={chatMessages} onChat={sendChat} />
  );
  if (screen === "matchOver" && matchResult) return (
    <MatchOver result={matchResult} symbol={symbol}
      onRematch={requestRematch} onLobby={goLobby} rematchPending={rematchPending} />
  );
  return null;
}

// ─── Lobby ────────────────────────────────────────────────────────────────────
function Lobby({ joinInput, setJoinInput, onCreate, onJoin, error }) {
  const [showConfig, setShowConfig] = useState(false);
  const [cfg, setCfg] = useState({ scoresToWin: 5, timerSeconds: 5, maxMoves: 3 });
  const [hostSymbol, setHostSymbol] = useState("X");

  const update = (k, v) => setCfg(p => ({ ...p, [k]: v }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 6 }}>⚡</div>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.5px" }}>Morpion</h1>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
          {cfg.maxMoves} coups max · Timer {cfg.timerSeconds}s · Premier à {cfg.scoresToWin}
        </p>
      </div>

      {error && (
        <div style={{ background: "#2d1515", border: "1px solid #5a2020", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: 14, color: "#f08080" }}>
          {error}
        </div>
      )}

      {/* Config hôte */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
        <button
          onClick={() => setShowConfig(p => !p)}
          style={{ width: "100%", background: "none", border: "none", color: "var(--text)", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14 }}
        >
          <span>⚙️ Paramètres de la partie</span>
          <span style={{ color: "var(--muted)" }}>{showConfig ? "▲" : "▼"}</span>
        </button>
        {showConfig && (
          <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
            <ConfigRow label="Manches pour gagner" value={cfg.scoresToWin}
              onChange={v => update("scoresToWin", v)} min={1} max={10} />
            <ConfigRow label="Timer (secondes)" value={cfg.timerSeconds}
              onChange={v => update("timerSeconds", v)} min={2} max={30} />
            <ConfigRow label="Coups max avant disparition" value={cfg.maxMoves}
              onChange={v => update("maxMoves", v)} min={2} max={6} />
            <div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>Mon symbole</div>
              <div style={{ display: "flex", gap: 8 }}>
                {["X", "O"].map(s => (
                  <button key={s} onClick={() => setHostSymbol(s)}
                    style={{ flex: 1, padding: "8px", fontSize: 18, fontWeight: 700,
                      background: hostSymbol === s ? "var(--text)" : "var(--surface2)",
                      color: hostSymbol === s ? "var(--bg)" : "var(--muted)",
                      border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <button onClick={() => onCreate(cfg, hostSymbol)}
        style={{ background: "var(--text)", color: "var(--bg)", width: "100%", padding: "14px", fontSize: 16, borderRadius: "var(--radius)", fontWeight: 600 }}>
        Créer une partie
      </button>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center" }}>ou rejoindre avec un code</p>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={joinInput} onChange={e => setJoinInput(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === "Enter" && onJoin()} placeholder="XXXXXX" maxLength={6}
            style={{ textAlign: "center", letterSpacing: "4px", fontWeight: 600, fontSize: 18 }} />
          <button onClick={onJoin}
            style={{ background: "var(--surface2)", color: "var(--text)", border: "1px solid var(--border)", whiteSpace: "nowrap" }}>
            Rejoindre
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfigRow({ label, value, onChange, min, max }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: "var(--muted)" }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", minWidth: 24, textAlign: "right" }}>{value}</span>
      </div>
      <input type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))} style={{ width: "100%" }} />
    </div>
  );
}

// ─── Waiting ──────────────────────────────────────────────────────────────────
function Waiting({ code, symbol }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "1.5rem", alignItems: "center" }}>
      <div style={{ fontSize: 36 }}>⏳</div>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>En attente d'un adversaire</h2>
        <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 6 }}>Partage ce code</p>
      </div>
      <div onClick={copy}
        style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 40px", cursor: "pointer", letterSpacing: "8px", fontSize: 32, fontWeight: 700 }}>
        {code}
      </div>
      <p style={{ fontSize: 13, color: "var(--muted)" }}>{copied ? "✓ Copié !" : "Clique pour copier"}</p>
      <div style={{ fontSize: 14, color: "var(--muted)" }}>
        Tu joues en tant que <strong style={{ color: "var(--text)" }}>{symbol}</strong>
        {" — "}le premier à jouer sera tiré au sort
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  );
}

// ─── Match Over ───────────────────────────────────────────────────────────────
function MatchOver({ result, symbol, onRematch, onLobby, rematchPending }) {
  const iWon = result.winner === symbol;
  return (
    <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "1.5rem", alignItems: "center" }}>
      <div style={{ fontSize: 48 }}>{iWon ? "🏆" : "💀"}</div>
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 700 }}>{iWon ? "Tu as gagné le match !" : "Match perdu..."}</h2>
        <p style={{ color: "var(--muted)", marginTop: 6 }}>Score final : X {result.scores.X} – {result.scores.O} O</p>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onRematch} style={{ background: "var(--text)", color: "var(--bg)", padding: "12px 24px" }}>
          {rematchPending ? "En attente..." : "Revanche"}
        </button>
        <button onClick={onLobby} style={{ background: "var(--surface2)", color: "var(--text)", border: "1px solid var(--border)" }}>
          Quitter
        </button>
      </div>
    </div>
  );
}
