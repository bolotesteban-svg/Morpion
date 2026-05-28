const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

const rooms = {};

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const WINS = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
];

function checkWin(moves) {
  return WINS.some(line => line.every(i => moves.includes(i)));
}

function randomSymbol() {
  return Math.random() < 0.5 ? "X" : "O";
}

function createGameState(config = {}) {
  const first = randomSymbol();
  return {
    board: Array(9).fill(null),
    xMoves: [],
    oMoves: [],
    currentTurn: first,
    scores: { X: 0, O: 0 },
    winner: null,
    matchOver: false,
    timerStart: Date.now(),
    config: {
      scoresToWin: config.scoresToWin || 5,
      timerSeconds: config.timerSeconds || 5,
      maxMoves: config.maxMoves || 3,
    },
  };
}

function applyMove(state, index) {
  const { board, xMoves, oMoves, currentTurn, config } = state;
  if (board[index] !== null) return false;

  board[index] = currentTurn;

  if (currentTurn === "X") {
    xMoves.push(index);
    if (xMoves.length > config.maxMoves) board[xMoves.shift()] = null;
  } else {
    oMoves.push(index);
    if (oMoves.length > config.maxMoves) board[oMoves.shift()] = null;
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
  state.currentTurn = randomSymbol();
  state.timerStart = Date.now();
}

// Timer serveur
setInterval(() => {
  for (const [code, room] of Object.entries(rooms)) {
    const { state, players } = room;
    if (state.winner || state.matchOver || players.length < 2) continue;
    const elapsed = (Date.now() - state.timerStart) / 1000;
    if (elapsed >= state.config.timerSeconds) {
      state.currentTurn = state.currentTurn === "X" ? "O" : "X";
      state.timerStart = Date.now();
      io.to(code).emit("game_state", { state, event: "timeout_skip" });
    }
  }
}, 200);

io.on("connection", (socket) => {
  console.log("connect:", socket.id);

  // Créer une room (avec config optionnelle)
  socket.on("create_room", ({ config, hostSymbol } = {}) => {
    let code = generateCode();
    while (rooms[code]) code = generateCode();

    const mySymbol = hostSymbol || "X";
    const oppSymbol = mySymbol === "X" ? "O" : "X";

    rooms[code] = {
      players: [socket.id],
      symbols: { [socket.id]: mySymbol },
      oppSymbol,
      config: config || {},
      state: null, // créé au join
      hostId: socket.id,
    };

    socket.join(code);
    socket.emit("room_created", { code, symbol: mySymbol, config: rooms[code].config });
    console.log("room created:", code);
  });

  // Rejoindre
  socket.on("join_room", ({ code }) => {
    const room = rooms[code];
    if (!room) return socket.emit("error", "Room introuvable.");
    if (room.players.length >= 2) return socket.emit("error", "Room pleine.");

    const oppSymbol = room.oppSymbol;
    room.players.push(socket.id);
    room.symbols[socket.id] = oppSymbol;
    socket.join(code);

    socket.emit("room_joined", { code, symbol: oppSymbol, config: room.config });

    // Crée l'état maintenant qu'on a les 2 joueurs
    room.state = createGameState(room.config);
    io.to(code).emit("game_start", { state: room.state });
    console.log("game started:", code);
  });

  // Jouer
  socket.on("play", ({ code, index }) => {
    const room = rooms[code];
    if (!room || !room.state) return;
    const state = room.state;
    const symbol = room.symbols[socket.id];

    if (state.matchOver || state.winner) return;
    if (symbol !== state.currentTurn) return;
    if (!applyMove(state, index)) return;

    io.to(code).emit("game_state", { state, event: "move" });

    if (state.winner) {
      if (state.scores[state.winner] >= state.config.scoresToWin) {
        state.matchOver = true;
        io.to(code).emit("match_over", { winner: state.winner, scores: state.scores });
      } else {
        setTimeout(() => {
          nextRound(state);
          io.to(code).emit("game_state", { state, event: "new_round" });
        }, 2000);
      }
    }
  });

  // Chat rapide
  socket.on("chat", ({ code, msg }) => {
    const room = rooms[code];
    if (!room) return;
    const symbol = room.symbols[socket.id];
    io.to(code).emit("chat_msg", { symbol, msg });
  });

  // Revanche
  socket.on("rematch", ({ code }) => {
    const room = rooms[code];
    if (!room) return;
    room.rematchVotes = (room.rematchVotes || 0) + 1;
    if (room.rematchVotes >= 2) {
      room.rematchVotes = 0;
      room.state = createGameState(room.config);
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
server.listen(PORT, () => console.log(`Server on port ${PORT}`));
