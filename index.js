const express = require("express");
const path = require("path");
const { Server } = require("socket.io");
const { createServer } = require("http");

const app = express();

const httpServer = createServer(app);

const io = new Server(httpServer, {
  path: "/real-time",
  cors: {
    origin: "*",
  },
});

app.use(express.json());
app.use("/app1", express.static(path.join(__dirname, "app1")));
app.use("/app2", express.static(path.join(__dirname, "app2")));

// estado del juego
let gameState = {
  players: [],
  currentRound: 0,
  gameStarted: false,
  roundWinner: null,
  gameWinner: null
};

// eventos del socket
io.on("connection", (socket) => {
  console.log(`cliente conectado: ${socket.id}`);
  
  // enviar estado actual a nuevas conexiones
  socket.emit("game-state", gameState);
  
  // jugador se une al juego
  socket.on("join-game", (playerName) => {
    if (gameState.players.length < 2 && !gameState.gameStarted) {
      const player = {
        id: socket.id,
        name: playerName,
        choice: null,
        score: 0
      };
      gameState.players.push(player);
      
      // notificar a todos los clientes sobre nuevo jugador
      io.emit("player-joined", {
        player: player,
        totalPlayers: gameState.players.length
      });
      
      // iniciar juego si tenemos 2 jugadores
      if (gameState.players.length === 2) {
        gameState.gameStarted = true;
        io.emit("game-start");
      }
    }
  });
  
  // jugador hace su eleccion
  socket.on("player-choice", (choice) => {
    const player = gameState.players.find(p => p.id === socket.id);
    if (player && gameState.gameStarted) {
      player.choice = choice;
      
      // revisar si ambos jugadores hicieron su eleccion
      const allPlayersChose = gameState.players.every(p => p.choice !== null);
      if (allPlayersChose) {
        determineRoundWinner();
      }
    }
  });
  
  // reiniciar juego
  socket.on("reset-game", () => {
    resetGame();
    io.emit("game-reset");
  });
  
  // manejar desconexion
  socket.on("disconnect", () => {
    console.log(`cliente desconectado: ${socket.id}`);
    gameState.players = gameState.players.filter(p => p.id !== socket.id);
    
    if (gameState.players.length < 2) {
      gameState.gameStarted = false;
    }
    
    io.emit("player-disconnected", {
      playerId: socket.id,
      remainingPlayers: gameState.players.length
    });
  });
});

function determineRoundWinner() {
  const [player1, player2] = gameState.players;
  const choice1 = player1.choice;
  const choice2 = player2.choice;
  
  let roundWinner = null;
  
  if (choice1 === choice2) {
    roundWinner = "tie";
  } else if (
    (choice1 === "rock" && choice2 === "scissors") ||
    (choice1 === "paper" && choice2 === "rock") ||
    (choice1 === "scissors" && choice2 === "paper")
  ) {
    roundWinner = player1.id;
    player1.score++;
  } else {
    roundWinner = player2.id;
    player2.score++;
  }
  
  gameState.currentRound++;
  gameState.roundWinner = roundWinner;
  
  // revisar si alguien gano el juego mejor de 3
  if (player1.score === 2 || player2.score === 2) {
    gameState.gameWinner = player1.score === 2 ? player1.id : player2.id;
    gameState.gameStarted = false;
  }
  
  // enviar resultado de la ronda
  io.emit("round-result", {
    player1Choice: choice1,
    player2Choice: choice2,
    roundWinner: roundWinner,
    scores: {
      [player1.id]: player1.score,
      [player2.id]: player2.score
    },
    gameWinner: gameState.gameWinner,
    currentRound: gameState.currentRound
  });
  
  // reiniciar elecciones para la siguiente ronda
  setTimeout(() => {
    if (!gameState.gameWinner) {
      gameState.players.forEach(p => p.choice = null);
      gameState.roundWinner = null;
      io.emit("next-round");
    }
  }, 3000);
}

function resetGame() {
  gameState = {
    players: [],
    currentRound: 0,
    gameStarted: false,
    roundWinner: null,
    gameWinner: null
  };
}

httpServer.listen(5050, () =>
  console.log(`servidor corriendo en http://localhost:${5050}`)
);