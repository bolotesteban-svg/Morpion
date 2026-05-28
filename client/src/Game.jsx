import { useEffect, useState, useRef } from "react";

const QUICK_MSGS = ["GG 👏", "Nul 😤", "Trop facile 😎", "Oof 💀", "???", "🎯", "😂", "🔥"];

export default function Game({ state, symbol, onPlay, chatMessages, onChat }) {
  const config = state.config || { timerSeconds: 5, scoresToWin: 5, maxMoves: 3 };
  const TIMER = config.timerSeconds;
  const [timeLeft, setTimeLeft] = useState(TIMER);
  const intervalRef = useRef(null);
  const isMyTurn = state.currentTurn === symbol;
  const roundOver = !!state.winner;

  useEffect(() => {
    clearInterval(intervalRef.current);
    if (roundOver) { setTimeLeft(0); return; }
    setTimeLeft(TIMER);
    const start = Date.now();
    intervalRef.current = setInterval(() => {
      const left = Math.max(0, TIMER - (Date.now() - start) / 1000);
      setTimeLeft(left);
      if (left <= 0) clearInterval(intervalRef.current);
    }, 80);
    return () => clearInterval(intervalRef.current);
  }, [state.currentTurn, state.winner, state.board.join(""), TIMER]);

  const timerPct = (timeLeft / TIMER) * 100;
  const timerColor = timeLeft > TIMER * 0.5 ? "#4ade80" : timeLeft > TIMER * 0.2 ? "#facc15" : "#f87171";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

      {/* Scores */}
      <ScoreBar scores={state.scores} symbol={symbol} scoresToWin={config.scoresToWin} />

      {/* Statut */}
      <div style={{ textAlign: "center", minHeight: 24 }}>
        {roundOver ? (
          <span style={{ fontSize: 15, fontWeight: 600, color: state.winner === symbol ? "#4ade80" : "#f87171" }}>
            {state.winner === symbol ? "✓ Manche remportée !" : "✗ Manche perdue"}
          </span>
        ) : (
          <span style={{ fontSize: 14, color: isMyTurn ? "var(--text)" : "var(--muted)", fontWeight: isMyTurn ? 600 : 400 }}>
            {isMyTurn ? "Ton tour — joue !" : "Adversaire réfléchit..."}
          </span>
        )}
      </div>

      {/* Timer */}
      <div style={{ height: 3, background: "var(--surface2)", borderRadius: 3, overflow: "hidden" }}>
        {!roundOver && (
          <div style={{ height: "100%", width: timerPct + "%", background: timerColor, borderRadius: 3, transition: "width 0.08s linear, background 0.3s" }} />
        )}
      </div>

      {/* Plateau — taille fixe */}
      <Board board={state.board} isMyTurn={isMyTurn && !roundOver} onPlay={onPlay} />

      {/* Chat rapide */}
      <ChatBar messages={chatMessages} onSend={onChat} symbol={symbol} />

    </div>
  );
}

// ─── Score bar ────────────────────────────────────────────────────────────────
function ScoreBar({ scores, symbol, scoresToWin }) {
  const opp = symbol === "X" ? "O" : "X";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--surface)", borderRadius: "var(--radius)", padding: "10px 14px" }}>
      <PlayerScore label="Toi" symbol={symbol} score={scores[symbol] || 0} left />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.05em" }}>PREMIER À {scoresToWin}</div>
        <PipBar myScore={scores[symbol] || 0} oppScore={scores[opp] || 0} total={scoresToWin} />
      </div>
      <PlayerScore label="Adv." symbol={opp} score={scores[opp] || 0} left={false} />
    </div>
  );
}

function PlayerScore({ label, symbol, score, left }) {
  const col = symbol === "X" ? "#378ADD" : "#D85A30";
  return (
    <div style={{ textAlign: left ? "left" : "right", minWidth: 48 }}>
      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 3, flexDirection: left ? "row" : "row-reverse" }}>
        <span style={{ fontSize: 24, fontWeight: 700, color: col, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 12, color: col, fontWeight: 600 }}>{symbol}</span>
      </div>
    </div>
  );
}

function PipBar({ myScore, oppScore, total }) {
  return (
    <div style={{ display: "flex", gap: 3, justifyContent: "center" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: 9, height: 9, borderRadius: 2,
          background: i < myScore ? "#378ADD" : i < oppScore ? "#D85A30" : "var(--surface2)",
          border: "1px solid var(--border)",
          flexShrink: 0,
        }} />
      ))}
    </div>
  );
}

// ─── Board — taille fixe absolue ──────────────────────────────────────────────
function Board({ board, isMyTurn, onPlay }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gridTemplateRows: "repeat(3, 1fr)",
      gap: 6,
      width: "100%",
      aspectRatio: "1 / 1",
    }}>
      {board.map((cell, i) => (
        <Cell key={i} value={cell} canClick={isMyTurn && !cell} onClick={() => isMyTurn && !cell && onPlay(i)} />
      ))}
    </div>
  );
}

function Cell({ value, canClick, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: canClick ? "var(--surface2)" : "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: canClick ? "pointer" : "default",
      // Taille fixe via font-size absolu, pas relatif à la case
      fontSize: 44,
      fontWeight: 700,
      color: value === "X" ? "#378ADD" : value === "O" ? "#D85A30" : "transparent",
      userSelect: "none",
      transition: "background 0.1s",
      // Empêche tout reflow : le contenu ne doit pas changer la taille
      overflow: "hidden",
    }}>
      {value || ""}
    </div>
  );
}

// ─── Chat rapide ──────────────────────────────────────────────────────────────
function ChatBar({ messages, onSend, symbol }) {
  const [open, setOpen] = useState(false);
  const [lastSent, setLastSent] = useState(0);

  const send = (msg) => {
    const now = Date.now();
    if (now - lastSent < 1500) return; // anti-spam 1.5s
    setLastSent(now);
    onSend(msg);
    setOpen(false);
  };

  const col = (s) => s === "X" ? "#378ADD" : "#D85A30";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {/* Messages */}
      <div style={{ minHeight: 28, display: "flex", flexDirection: "column", gap: 4 }}>
        {messages.slice(-3).map(m => (
          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <span style={{ fontWeight: 700, color: col(m.symbol), fontSize: 11 }}>{m.symbol}</span>
            <span style={{ color: "var(--muted)" }}>{m.msg}</span>
          </div>
        ))}
      </div>

      {/* Bouton + picker */}
      <div style={{ position: "relative" }}>
        <button onClick={() => setOpen(p => !p)}
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)", fontSize: 13, padding: "6px 12px", borderRadius: "var(--radius-sm)", width: "100%" }}>
          💬 Chat rapide
        </button>
        {open && (
          <div style={{
            position: "absolute", bottom: "calc(100% + 6px)", left: 0, right: 0,
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "var(--radius)", padding: 8,
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6,
            zIndex: 10,
          }}>
            {QUICK_MSGS.map(msg => (
              <button key={msg} onClick={() => send(msg)}
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 13, padding: "6px 4px", borderRadius: "var(--radius-sm)", cursor: "pointer" }}>
                {msg}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
