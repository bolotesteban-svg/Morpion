import { useEffect, useState, useRef } from "react";

const SCORE_TO_WIN = 5;
const TIMER_SECONDS = 5;

export default function Game({ state, symbol, onPlay, rematchPending }) {
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const intervalRef = useRef(null);
  const isMyTurn = state.currentTurn === symbol;
  const roundOver = !!state.winner;

  // Timer local — se reset à chaque changement de tour
  useEffect(() => {
    clearInterval(intervalRef.current);
    if (roundOver) { setTimeLeft(0); return; }

    setTimeLeft(TIMER_SECONDS);
    const start = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const left = Math.max(0, TIMER_SECONDS - elapsed);
      setTimeLeft(left);
      if (left <= 0) clearInterval(intervalRef.current);
    }, 100);

    return () => clearInterval(intervalRef.current);
  }, [state.currentTurn, state.winner, state.board.join("")]);

  const timerPct = (timeLeft / TIMER_SECONDS) * 100;
  const timerColor = timeLeft > 2.5 ? "#4ade80" : timeLeft > 1 ? "#facc15" : "#f87171";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {/* Scores */}
      <ScoreBar scores={state.scores} symbol={symbol} />

      {/* Statut du tour */}
      <div style={{ textAlign: "center" }}>
        {roundOver ? (
          <div style={{ fontSize: 16, fontWeight: 600, color: state.winner === symbol ? "#4ade80" : "#f87171" }}>
            {state.winner === symbol ? "✓ Tu remportes cette manche !" : "✗ Manche perdue"}
          </div>
        ) : (
          <div style={{ fontSize: 15, color: "var(--muted)" }}>
            {isMyTurn
              ? <span style={{ color: "var(--text)", fontWeight: 600 }}>Ton tour — joue !</span>
              : "Adversaire réfléchit..."}
          </div>
        )}
      </div>

      {/* Timer bar */}
      {!roundOver && (
        <div style={{ height: 4, background: "var(--surface2)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: timerPct + "%",
            background: timerColor,
            borderRadius: 4,
            transition: "width 0.1s linear, background 0.3s",
          }} />
        </div>
      )}

      {/* Plateau */}
      <Board board={state.board} isMyTurn={isMyTurn && !roundOver} onPlay={onPlay} symbol={symbol} />

      {/* Coups restants info */}
      <div style={{ textAlign: "center", fontSize: 13, color: "var(--muted)" }}>
        Après 3 coups posés, le plus ancien disparaît
      </div>

    </div>
  );
}

function ScoreBar({ scores, symbol }) {
  const opponentSymbol = symbol === "X" ? "O" : "X";
  const myScore = scores[symbol] || 0;
  const oppScore = scores[opponentSymbol] || 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--surface)", borderRadius: "var(--radius)", padding: "12px 16px" }}>
      <PlayerScore label="Toi" symbol={symbol} score={myScore} highlight />
      <div style={{ flex: 1, textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>PREMIER À {SCORE_TO_WIN}</div>
        <PipBar myScore={myScore} oppScore={oppScore} total={SCORE_TO_WIN} />
      </div>
      <PlayerScore label="Adv." symbol={opponentSymbol} score={oppScore} />
    </div>
  );
}

function PlayerScore({ label, symbol, score, highlight }) {
  const isX = symbol === "X";
  const col = isX ? "var(--x-color)" : "var(--o-color)";
  return (
    <div style={{ textAlign: highlight ? "left" : "right", minWidth: 50 }}>
      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, flexDirection: highlight ? "row" : "row-reverse" }}>
        <span style={{ fontSize: 26, fontWeight: 700, color: col, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 13, color: col, fontWeight: 600 }}>{symbol}</span>
      </div>
    </div>
  );
}

function PipBar({ myScore, oppScore, total }) {
  return (
    <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
      {Array.from({ length: total }).map((_, i) => {
        const filledMy = i < myScore;
        const filledOpp = i < oppScore;
        return (
          <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: filledMy ? "var(--x-color)" : filledOpp ? "var(--o-color)" : "var(--surface2)", border: "1px solid var(--border)" }} />
        );
      })}
    </div>
  );
}

function Board({ board, isMyTurn, onPlay, symbol }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 8,
      aspectRatio: "1",
      width: "100%",
    }}>
      {board.map((cell, i) => (
        <Cell
          key={i}
          value={cell}
          onClick={() => isMyTurn && !cell && onPlay(i)}
          isMyTurn={isMyTurn}
        />
      ))}
    </div>
  );
}

function Cell({ value, onClick, isMyTurn }) {
  const isX = value === "X";
  const isO = value === "O";
  const canClick = isMyTurn && !value;

  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--surface)",
        border: `1px solid var(--border)`,
        borderRadius: "var(--radius)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: canClick ? "pointer" : "default",
        fontSize: "min(13vw, 56px)",
        fontWeight: 700,
        color: isX ? "var(--x-color)" : isO ? "var(--o-color)" : "transparent",
        transition: "background 0.1s",
        userSelect: "none",
        ...(canClick && { background: "var(--surface2)" }),
      }}
    >
      {value || (canClick ? "·" : "")}
    </div>
  );
}
