const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// rooms[roomCode] = { players: [socketId, socketId], state: GameState }
const rooms = {};

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function createGameState() {
  return {
    board: Array(9).fill(null),      // null | "X" | "O"
    xMoves: [],                       // historique des index joués par X (max 3)
    oMoves: [],                       // historique des index joués par O (max 3)
    currentTurn: "X",                 // "X" | "O"
    scores: { X: 0, O: 0 },
    winner: null,                     // null | "X" | "O" | "timeout"
    matchOver: false,
    timerStart: Date.now(),
  };
}

const WINS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkWin(moves) {
  return WINS.some((line) => line.every((i) => moves.includes(i)));
}

function applyMove(state, index) {
  const { board, xMoves, oMoves, currentTurn } = state;
  if (board[index] !== null) return false;

  board[index] = currentTurn;

  if (currentTurn === "X") {
    xMoves.push(index);
    if (xMoves.length > 3) {
      board[xMoves.shift()] = null;
    }
  } else {
    oMoves.push(index);
    if (oMoves.length > 3) {
      board[oMoves.shift()] = null;
    }
  }

  const movesOfCurrent = currentTurn === "X" ? xMoves : oMoves;
  if (checkWin(movesOfCurrent)) {
    state.winner = currentTurn;
    state.scores[currentTurn]++;
    return true;
  }

  state.currentTurn = currentTurn === "X" ? "O" : "X";
  state.timerStart = Date.now();
  return true;
}

function nextRound(state) {
  state.board = Array(9).fill(null);
  state.xMoves = [];
  state.oMoves = [];
  state.winner = null;
  // Le perdant commence la prochaine manche
  state.timerStart = Date.now();
}

// Timer : toutes les secondes on vérifie si un joueur a dépassé 5s
setInterval(() => {
  for (const [code, room] of Object.entries(rooms)) {
    const { state, players, timers } = room;
    if (state.winner || state.matchOver || players.length < 2) continue;

    const elapsed = (Date.now() - state.timerStart) / 1000;
    if (elapsed >= 5) {
      // Le joueur actif n'a pas joué — on lui passe le tour
      state.currentTurn = state.currentTurn === "X" ? "O" : "X";
      state.timerStart = Date.now();
      io.to(code).emit("game_state", { state, event: "timeout_skip" });
    }
  }
}, 200);

io.on("connection", (socket) => {
  console.log("connect:", socket.id);

  // Créer une room
  socket.on("create_room", () => {
    let code = generateCode();
    while (rooms[code]) code = generateCode();

    rooms[code] = {
      players: [socket.id],
      symbols: { [socket.id]: "X" },
      state: createGameState(),
    };

    socket.join(code);
    socket.emit("room_created", { code, symbol: "X" });
    console.log("room created:", code);
  });

  // Rejoindre une room
  socket.on("join_room", ({ code }) => {
    const room = rooms[code];
    if (!room) return socket.emit("error", "Room introuvable.");
    if (room.players.length >= 2) return socket.emit("error", "Room pleine.");

    room.players.push(socket.id);
    room.symbols[socket.id] = "O";
    socket.join(code);

    socket.emit("room_joined", { code, symbol: "O" });

    // Démarre la partie
    room.state.timerStart = Date.now();
    io.to(code).emit("game_start", { state: room.state });
    console.log("game started:", code);
  });

  // Jouer un coup
  socket.on("play", ({ code, index }) => {
    const room = rooms[code];
    if (!room) return;
    const state = room.state;
    const symbol = room.symbols[socket.id];

    if (state.matchOver || state.winner) return;
    if (symbol !== state.currentTurn) return;
    if (!applyMove(state, index)) return;

    io.to(code).emit("game_state", { state, event: "move" });

    if (state.winner) {
      if (state.scores[state.winner] >= 5) {
        state.matchOver = true;
        io.to(code).emit("match_over", { winner: state.winner, scores: state.scores });
      } else {
        // Nouvelle manche après 2s
        setTimeout(() => {
          nextRound(state);
          io.to(code).emit("game_state", { state, event: "new_round" });
        }, 2000);
      }
    }
  });

  // Rejouer un match
  socket.on("rematch", ({ code }) => {
    const room = rooms[code];
    if (!room) return;
    room.rematchVotes = (room.rematchVotes || 0) + 1;
    if (room.rematchVotes >= 2) {
      room.rematchVotes = 0;
      room.state = createGameState();
      io.to(code).emit("game_start", { state: room.state });
    } else {
      socket.to(code).emit("rematch_request");
    }
  });

  socket.on("disconnect", () => {
    for (const [code, room] of Object.entries(rooms)) {
      if (room.players.includes(socket.id)) {
        io.to(code).emit("opponent_left");
        delete rooms[code];
        break;
      }
    }
    console.log("disconnect:", socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
