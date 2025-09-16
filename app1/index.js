socket.on("game-reset", () => {
    gameState = {
        players: [],
        gameStarted: false
    };
    showScreen("waiting");
    resetGameView();
});

socket.on("player-disconnected", (data) => {
    gameState.players = gameState.players.filter(p => p.id !== data.playerId);
    
    if (data.remainingPlayers < 2) {
        gameState.gameStarted = false;
        showScreen("waiting");
        resetGameView();
    }
    
    playerCount.textContent = `${data.remainingPlayers} / 2 jugadores conectados`;
    updateConnectedPlayers();
});

// listeners de eventos
resetBtn.addEventListener("click", () => {
    socket.emit("reset-game");
});

newGameBtn.addEventListener("click", () => {
    socket.emit("reset-game");
});

// funciones auxiliares
function showScreen(screen) {
    waitingScreen.classList.remove("active");
    gameScreen.classList.remove("active");
    gameOverScreen.classList.remove("active");
    
    switch(screen) {
        case "waiting":
            waitingScreen.classList.add("active");
            break;
        case "game":
            gameScreen.classList.add("active");
            break;
        case "gameOver":
            gameOverScreen.classList.add("active");
            break;
    }
}

function updateUI() {
    if (gameState.gameStarted && gameState.players.length === 2) {
        showScreen("game");
        setupGameView();
    } else {
        showScreen("waiting");
    }
    
    playerCount.textContent = `${gameState.players.length} / 2 jugadores conectados`;
    updateConnectedPlayers();
}

function updateConnectedPlayers() {
    connectedPlayers.innerHTML = "";
    gameState.players.forEach(player => {
        const playerDiv = document.createElement("div");
        playerDiv.className = "connected-player";
        playerDiv.textContent = player.name;
        connectedPlayers.appendChild(playerDiv);
    });
}

function setupGameView() {
    if (gameState.players.length >= 2) {
        player1Name.textContent = gameState.players[0].name;
        player2Name.textContent = gameState.players[1].name;
        player1Score.textContent = gameState.players[0].score || 0;
        player2Score.textContent = gameState.players[1].score || 0;
    }
    
    player1Choice.textContent = "?";
    player2Choice.textContent = "?";
    player1Choice.classList.add("waiting");
    player2Choice.classList.add("waiting");
    
    currentRound.textContent = (gameState.currentRound || 0) + 1;
}

function resetGameView() {
    player1Name.textContent = "jugador 1";
    player2Name.textContent = "jugador 2";
    player1Choice.textContent = "?";
    player2Choice.textContent = "?";
    player1Score.textContent = "0";
    player2Score.textContent = "0";
    currentRound.textContent = "1";
    resultDisplay.textContent = "";
    
    player1Card.classList.remove("winner");
    player2Card.classList.remove("winner");
    player1Choice.classList.add("waiting");
    player2Choice.classList.add("waiting");
}

function getChoiceEmoji(choice) {
    switch(choice) {
        case "rock": return "🪨";
        case "paper": return "📄";
        case "scissors": return "✂️";
        default: return "?";
    }
}const socket = io("/", { path: "/real-time" });

// elementos de pantallas
const waitingScreen = document.getElementById("waiting-screen");
const gameScreen = document.getElementById("game-screen");
const gameOverScreen = document.getElementById("game-over-screen");

// elementos de la ui
const playerCount = document.getElementById("player-count");
const connectedPlayers = document.getElementById("connected-players");
const currentRound = document.getElementById("current-round");
const resetBtn = document.getElementById("reset-btn");
const newGameBtn = document.getElementById("new-game-btn");

// elementos de jugadores
const player1Name = document.getElementById("player1-name");
const player1Choice = document.getElementById("player1-choice");
const player1Score = document.getElementById("player1-score");
const player1Card = document.getElementById("player1-card");

const player2Name = document.getElementById("player2-name");
const player2Choice = document.getElementById("player2-choice");
const player2Score = document.getElementById("player2-score");
const player2Card = document.getElementById("player2-card");

const resultDisplay = document.getElementById("result-display");
const winnerDisplay = document.getElementById("winner-display");

let gameState = {
    players: [],
    gameStarted: false
};

// eventos del socket
socket.on("game-state", (state) => {
    gameState = state;
    updateUI();
});

socket.on("player-joined", (data) => {
    gameState.players = [...gameState.players];
    const existingPlayer = gameState.players.find(p => p.id === data.player.id);
    if (!existingPlayer) {
        gameState.players.push(data.player);
    }
    
    playerCount.textContent = `${data.totalPlayers} / 2 jugadores conectados`;
    updateConnectedPlayers();
});

socket.on("game-start", () => {
    gameState.gameStarted = true;
    showScreen("game");
    setupGameView();
    resultDisplay.textContent = "juego iniciado! esperando que los jugadores hagan su eleccion...";
});

socket.on("round-result", (result) => {
    // actualizar elecciones
    player1Choice.textContent = getChoiceEmoji(result.player1Choice);
    player2Choice.textContent = getChoiceEmoji(result.player2Choice);
    
    // actualizar puntajes
    const player1Id = gameState.players[0]?.id;
    const player2Id = gameState.players[1]?.id;
    
    if (player1Id && result.scores[player1Id] !== undefined) {
        player1Score.textContent = result.scores[player1Id];
    }
    if (player2Id && result.scores[player2Id] !== undefined) {
        player2Score.textContent = result.scores[player2Id];
    }
    
    // actualizar ronda
    currentRound.textContent = result.currentRound;
    
    // mostrar resultado
    let resultMessage = "";
    if (result.roundWinner === "tie") {
        resultMessage = "es un empate!";
    } else {
        const winnerName = gameState.players.find(p => p.id === result.roundWinner)?.name || "desconocido";
        resultMessage = `${winnerName} gana esta ronda!`;
    }
    
    resultDisplay.textContent = resultMessage;
    
    // resaltar ganador
    player1Card.classList.remove("winner");
    player2Card.classList.remove("winner");
    
    if (result.roundWinner === gameState.players[0]?.id) {
        player1Card.classList.add("winner");
    } else if (result.roundWinner === gameState.players[1]?.id) {
        player2Card.classList.add("winner");
    }
    
    // revisar ganador del juego
    if (result.gameWinner) {
        setTimeout(() => {
            const gameWinnerName = gameState.players.find(p => p.id === result.gameWinner)?.name || "desconocido";
            winnerDisplay.textContent = `🎉 ${gameWinnerName} gana el juego!`;
            showScreen("gameOver");
        }, 3000);
    }
});

socket.on("next-round", () => {
    // reiniciar elecciones para la siguiente ronda
    player1Choice.textContent = "?";
    player2Choice.textContent = "?";
    player1Choice.classList.add("waiting");
    player2Choice.classList.add("waiting");
    
    player1Card.classList.remove("winner");
    player2Card.classList.remove("winner");
    
    resultDisplay.textContent = "siguiente ronda! esperando que los jugadores hagan su eleccion...";
});

socket.on("game-reset", () => {
    gameState = {
        players: [],
        gameStarted: false
    };
    showScreen("waiting");
    resetGameView();
});

socket.on("player-disconnected", (data) => {
    gameState.players = gameState.players.filter(p => p.id !== data.playerId);
    
    if (data.remainingPlayers < 2) {
        gameState.gameStarted = false;
        showScreen("waiting");
        resetGameView();
    }
    
    playerCount.textContent = `${data.remainingPlayers} / 2 jugadores conectados`;
    updateConnectedPlayers();
});

// listeners de eventos
resetBtn.addEventListener("click", () => {
    socket.emit("reset-game");
});

newGameBtn.addEventListener("click", () => {
    socket.emit("reset-game");
});

// funciones auxiliares
function showScreen(screen) {
    waitingScreen.classList.remove("active");
    gameScreen.classList.remove("active");
    gameOverScreen.classList.remove("active");
    
    switch(screen) {
        case "waiting":
            waitingScreen.classList.add("active");
            break;
        case "game":
            gameScreen.classList.add("active");
            break;
        case "gameOver":
            gameOverScreen.classList.add("active");
            break;
    }
}

function updateUI() {
    if (gameState.gameStarted && gameState.players.length === 2) {
        showScreen("game");
        setupGameView();
    } else {
        showScreen("waiting");
    }
    
    playerCount.textContent = `${gameState.players.length} / 2 jugadores conectados`;
    updateConnectedPlayers();
}

function updateConnectedPlayers() {
    connectedPlayers.innerHTML = "";
    gameState.players.forEach(player => {
        const playerDiv = document.createElement("div");
        playerDiv.className = "connected-player";
        playerDiv.textContent = player.name;
        connectedPlayers.appendChild(playerDiv);
    });
}

function setupGameView() {
    if (gameState.players.length >= 2) {
        player1Name.textContent = gameState.players[0].name;
        player2Name.textContent = gameState.players[1].name;
        player1Score.textContent = gameState.players[0].score || 0;
        player2Score.textContent = gameState.players[1].score || 0;
    }
    
    player1Choice.textContent = "?";
    player2Choice.textContent = "?";
    player1Choice.classList.add("waiting");
    player2Choice.classList.add("waiting");
    
    currentRound.textContent = (gameState.currentRound || 0) + 1;
}

function resetGameView() {
    player1Name.textContent = "jugador 1";
    player2Name.textContent = "jugador 2";
    player1Choice.textContent = "?";
    player2Choice.textContent = "?";
    player1Score.textContent = "0";
    player2Score.textContent = "0";
    currentRound.textContent = "1";
    resultDisplay.textContent = "";
    
    player1Card.classList.remove("winner");
    player2Card.classList.remove("winner");
    player1Choice.classList.add("waiting");
    player2Choice.classList.add("waiting");
}

function getChoiceEmoji(choice) {
    switch(choice) {
        case "rock": return "🪨";
        case "paper": return "📄";
        case "scissors": return "✂️";
        default: return "?";
    }
}