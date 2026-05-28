import { useState, useEffect } from "react";
import socket from "./socket.js";
import Game from "./Game.jsx";

export default function App() {
  const [screen, setScreen] = useState("lobby"); // lobby | waiting | game | matchOver
  const [roomCode, setRoomCode] = useState("");
  const [joinInput, setJoinInput] = useState("");
  const [symbol, setSymbol] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [matchResult, setMatchResult] = useState(null);
  const [error, setError] = useState("");
  const [rematchPending, setRematchPending] = useState(false);

  useEffect(() => {
    socket.on("room_created", ({ code, symbol }) => {
      setRoomCode(code);
      setSymbol(symbol);
      setScreen("waiting");
    });

    socket.on("room_joined", ({ code, symbol }) => {
      setRoomCode(code);
      setSymbol(symbol);
    });

    socket.on("game_start", ({ state }) => {
      setGameState(state);
      setMatchResult(null);
      setRematchPending(false);
      setScreen("game");
    });

    socket.on("game_state", ({ state }) => {
      setGameState({ ...state });
    });

    socket.on("match_over", ({ winner, scores }) => {
      setMatchResult({ winner, scores });
      setScreen("matchOver");
    });

    socket.on("rematch_request", () => {
      setRematchPending(true);
    });

    socket.on("opponent_left", () => {
      setError("Ton adversaire a quitté la partie.");
      setScreen("lobby");
    });

    socket.on("error", (msg) => {
      setError(msg);
    });

    return () => {
      socket.off("room_created");
      socket.off("room_joined");
      socket.off("game_start");
      socket.off("game_state");
      socket.off("match_over");
      socket.off("rematch_request");
      socket.off("opponent_left");
      socket.off("error");
    };
  }, []);

  const createRoom = () => {
    setError("");
    socket.emit("create_room");
  };

  const joinRoom = () => {
    if (!joinInput.trim()) return;
    setError("");
    socket.emit("join_room", { code: joinInput.trim().toUpperCase() });
  };

  const playMove = (index) => {
    socket.emit("play", { code: roomCode, index });
  };

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
  };

  if (screen === "lobby") return (
    <Lobby
      joinInput={joinInput}
      setJoinInput={setJoinInput}
      onCreate={createRoom}
      onJoin={joinRoom}
      error={error}
    />
  );

  if (screen === "waiting") return (
    <Waiting code={roomCode} />
  );

  if (screen === "game" && gameState) return (
    <Game
      state={gameState}
      symbol={symbol}
      onPlay={playMove}
      rematchPending={rematchPending}
    />
  );

  if (screen === "matchOver" && matchResult) return (
    <MatchOver
      result={matchResult}
      symbol={symbol}
      onRematch={requestRematch}
      onLobby={goLobby}
      rematchPending={rematchPending}
    />
  );

  return null;
}

function Lobby({ joinInput, setJoinInput, onCreate, onJoin, error }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>⚡</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.5px" }}>Morpion</h1>
        <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 6 }}>
          3 coups max · Timer 5s · Premier à 5 victoires
        </p>
      </div>

      {error && (
        <div style={{ background: "#2d1515", border: "1px solid #5a2020", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: 14, color: "#f08080" }}>
          {error}
        </div>
      )}

      <button onClick={onCreate} style={{ background: "var(--text)", color: "var(--bg)", width: "100%", padding: "14px", fontSize: 16, borderRadius: "var(--radius)" }}>
        Créer une partie
      </button>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center" }}>ou rejoindre avec un code</p>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={joinInput}
            onChange={e => setJoinInput(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === "Enter" && onJoin()}
            placeholder="XXXXXX"
            maxLength={6}
            style={{ textAlign: "center", letterSpacing: "4px", fontWeight: 600, fontSize: 18 }}
          />
          <button onClick={onJoin} style={{ background: "var(--surface2)", color: "var(--text)", border: "1px solid var(--border)", whiteSpace: "nowrap" }}>
            Rejoindre
          </button>
        </div>
      </div>
    </div>
  );
}

function Waiting({ code }) {
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
        <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 6 }}>Partage ce code à ton adversaire</p>
      </div>
      <div
        onClick={copy}
        style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 40px", cursor: "pointer", letterSpacing: "8px", fontSize: 32, fontWeight: 700 }}
      >
        {code}
      </div>
      <p style={{ fontSize: 13, color: "var(--muted)" }}>{copied ? "✓ Copié !" : "Clique pour copier"}</p>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", animation: "pulse 1.5s infinite" }} />
        <span style={{ fontSize: 14, color: "var(--muted)" }}>Tu joues en tant que X</span>
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  );
}

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
