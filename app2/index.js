const socket = io("/", { path: "/real-time" });

// elements de pantalla
const joinScreen = document.getElementById("join-screen");
const waitingScreen = document.getElementById("waiting-screen");
const gameScreen = document.getElementById("game-screen");
const gameOverScreen = document.getElementById("game-over-screen");
const disconnectedScreen = document.getElementById("disconnected-screen");

// elementos de pantalla pero de unirse
const playerNameInput = document.getElementById("player-name");
const joinBtn = document.getElementById("join-btn");
const joinMessage = document.getElementById("join-message");

// elementos de elecciones
const currentRound = document.getElementById("current-round");
const yourName = document.getElementById("your-name");
const choiceSection = document.getElementById("choice-section");
const waitingChoice = document.getElementById("waiting-choice");
const roundResult = document.getElementById("round-result");
const choiceBtns = document.querySelectorAll(".choice-btn");

// elementos de juego terminado
const yourChoice = document.getElementById("your-choice");
const yourResultChoice = document.getElementById("your-result-choice");
const opponentResultChoice = document.getElementById("opponent-result-choice");
const roundWinner = document.getElementById("round-winner");
const yourScore = document.getElementById("your-score");
const opponentScore = document.getElementById("opponent-score");

// elementos de juego over
const gameResult = document.getElementById("game-result");
const finalResult = document.getElementById("final-result");
const finalYourScore = document.getElementById("final-your-score");
const finalOpponentScore = document.getElementById("final-opponent-score");
const playAgainBtn = document.getElementById("play-again-btn");
const reconnectBtn = document.getElementById("reconnect-btn");

// game estado
let playerData = {
    id: null,
    name: "",
    isInGame: false
};

let gameState = {
    players: [],
    gameStarted: false
};

// socket events
socket.on("connect", () => {
    console.log("Connected to server");
    showScreen("join");
});

socket.on("disconnect", () => {
    console.log("Disconnected from server");
    if (playerData.isInGame) {
        showScreen("disconnected");
    }
});

socket.on("game-state", (state) => {
    gameState = state;
    updateUIBasedOnGameState();
});

socket.on("player-joined", (data) => {
    if (data.player.id === socket.id) {
        playerData.id = socket.id;
        playerData.isInGame = true;
        yourName.textContent = playerData.name;
        showScreen("waiting");
    }
    
    gameState.players = gameState.players || [];
    const existingPlayer = gameState.players.find(p => p.id === data.player.id);
    if (!existingPlayer) {
        gameState.players.push(data.player);
    }
});

socket.on("game-start", () => {
    gameState.gameStarted = true;
    showScreen("game");
    resetRound();
});

socket.on("round-result", (result) => {
    const isPlayer1 = gameState.players[0]?.id === socket.id;
    const myChoice = isPlayer1 ? result.player1Choice : result.player2Choice;
    const opponentChoice = isPlayer1 ? result.player2Choice : result.player1Choice;
    
    // actualizar numero de ronda
    currentRound.textContent = result.currentRound;
    
    // mostrar resultado
    yourResultChoice.textContent = getChoiceEmoji(myChoice);
    opponentResultChoice.textContent = getChoiceEmoji(opponentChoice);
    
    // determinar mensaje del ganador
    let winnerMessage = "";
    if (result.roundWinner === "tie") {
        winnerMessage = "It's a tie! 🤝";
    } else if (result.roundWinner === socket.id) {
        winnerMessage = "You win this round! 🎉";
    } else {
        winnerMessage = "You lose this round 😔";
    }
    roundWinner.textContent = winnerMessage;
    
    // actualizar puntajes
    const myScore = result.scores[socket.id] || 0;
    const opponentId = gameState.players.find(p => p.id !== socket.id)?.id;
    const opponentScore = result.scores[opponentId] || 0;
    
    yourScore.textContent = myScore;
    opponentScore.textContent = opponentScore;
    
    // mostrar resultado de la ronda
    choiceSection.style.display = "none";
    waitingChoice.style.display = "none";
    roundResult.style.display = "block";
    
   // revisar ganador del juego
    if (result.gameWinner) {
        setTimeout(() => {
            finalYourScore.textContent = myScore;
            finalOpponentScore.textContent = opponentScore;
            
            if (result.gameWinner === socket.id) {
                gameResult.textContent = "You Won! 🏆";
                finalResult.textContent = "Congratulations! You are the champion!";
            } else {
                gameResult.textContent = "Game Over";
                finalResult.textContent = "Better luck next time!";
            }
            
            showScreen("gameOver");
        }, 3000);
    }
});

socket.on("next-round", () => {
    resetRound();
});

socket.on("game-reset", () => {
    playerData.isInGame = false;
    gameState = {
        players: [],
        gameStarted: false
    };
    showScreen("join");
    resetAllDisplays();
});

socket.on("player-disconnected", (data) => {
    gameState.players = gameState.players.filter(p => p.id !== data.playerId);
    
    if (data.remainingPlayers < 2 && playerData.isInGame) {
        gameState.gameStarted = false;
        showScreen("waiting");
    }
});

// event listeners
joinBtn.addEventListener("click", joinGame);

playerNameInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        joinGame();
    }
});

choiceBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        const choice = btn.dataset.choice;
        makeChoice(choice);
    });
});

reconnectBtn.addEventListener("click", () => {
    location.reload();
});

playAgainBtn.addEventListener("click", () => {
    joinMessage.textContent = "Waiting for a new game to start...";
});

// functions
function showScreen(screen) {
    joinScreen.classList.remove("active");
    waitingScreen.classList.remove("active");
    gameScreen.classList.remove("active");
    gameOverScreen.classList.remove("active");
    disconnectedScreen.classList.remove("active");
    
    switch(screen) {
        case "join":
            joinScreen.classList.add("active");
            break;
        case "waiting":
            waitingScreen.classList.add("active");
            break;
        case "game":
            gameScreen.classList.add("active");
            break;
        case "gameOver":
            gameOverScreen.classList.add("active");
            break;
        case "disconnected":
            disconnectedScreen.classList.add("active");
            break;
    }
}

function joinGame() {
    const name = playerNameInput.value.trim();
    
    if (!name) {
        joinMessage.textContent = "Please enter your name";
        return;
    }
    
    if (name.length > 15) {
        joinMessage.textContent = "Name must be 15 characters or less";
        return;
    }
    
    joinBtn.disabled = true;
    joinMessage.textContent = "Joining game...";
    
    playerData.name = name;
    socket.emit("join-game", name);
    
    // reset despues de un corto delay 
    setTimeout(() => {
        joinBtn.disabled = false;
        if (!playerData.isInGame) {
            joinMessage.textContent = "Failed to join game. Try again.";
        }
    }, 3000);
}

function makeChoice(choice) {
    socket.emit("player-choice", choice);
    
    // acutalizar vista
    yourChoice.textContent = getChoiceEmoji(choice);
    choiceSection.style.display = "none";
    waitingChoice.style.display = "block";
    
    //  feedback en boton seleccionadop 
    choiceBtns.forEach(btn => btn.classList.remove("selected"));
    const selectedBtn = document.querySelector(`[data-choice="${choice}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add("selected");
    }
}

function resetRound() {
    choiceSection.style.display = "block";
    waitingChoice.style.display = "none";
    roundResult.style.display = "none";
    
    // reset boton selection
    choiceBtns.forEach(btn => btn.classList.remove("selected"));
}

function resetAllDisplays() {
    playerNameInput.value = "";
    joinMessage.textContent = "";
    currentRound.textContent = "1";
    yourName.textContent = "";
    yourChoice.textContent = "";
    yourScore.textContent = "0";
    opponentScore.textContent = "0";
    resetRound();
}

function updateUIBasedOnGameState() {
    if (gameState.gameStarted && gameState.players.length === 2) {
        const playerInGame = gameState.players.find(p => p.id === socket.id);
        if (playerInGame) {
            playerData.isInGame = true;
            yourName.textContent = playerData.name;
            showScreen("game");
            resetRound();
        }
    } else if (playerData.isInGame && gameState.players.length < 2) {
        showScreen("waiting");
    }
}

function getChoiceEmoji(choice) {
    switch(choice) {
        case "rock": return "🪨";
        case "paper": return "📄";
        case "scissors": return "✂️";
        default: return "?";
    }
}