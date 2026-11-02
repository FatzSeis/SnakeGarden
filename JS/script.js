// Elementos da página usados pelo jogo.
const playBoard = document.querySelector('.play__board');
const scoreElement = document.querySelector('.score');
const highScoreElement = document.querySelector('.high-score');
const controls = document.querySelectorAll('.icon__controls');
const GRID_SIZE = Number.parseInt(getComputedStyle(document.documentElement).getPropertyValue('--grid-size'), 10);
const SWIPE_THRESHOLD = 24;
// Paleta usada para sortear a cor de cada novo sapo.
const frogColors = ['green', 'yellow', 'orange', 'blue', 'purple', 'red', 'pink'];
const snakeSegments = [];
const foodElement = document.createElement('div');
foodElement.className = 'Food';
foodElement.innerHTML = '<span class="frog__face"></span>';
foodElement.setAttribute('aria-label', 'Sapo');
playBoard.append(foodElement);

let GameOver = false;
let foodX, foodY;
let snakeX = 5, snakeY = 10;
let snakeBody = [];
let velocityX = 0, velocityY = 0;
let setIntervalId;
let score = 0;
let highScore = Number(localStorage.getItem('high-score')) || 0;
highScoreElement.innerHTML = `Recorde: ${highScore}`;
let hasPlayedAudio = false;
let hasIncreasedSnakeBody = false;

// Gera uma nova posição para o sapo.
const changeFoodPoisition = () => {
    const occupiedCells = new Set(snakeBody.map(([x, y]) => `${x},${y}`));
    occupiedCells.add(`${snakeX},${snakeY}`);

    do {
        foodX = Math.floor(Math.random() * GRID_SIZE) + 1;
        foodY = Math.floor(Math.random() * GRID_SIZE) + 1;
    } while (occupiedCells.has(`${foodX},${foodY}`));

    const frogColor = frogColors[Math.floor(Math.random() * frogColors.length)];
    foodElement.className = `Food Food--${frogColor}`;
    foodElement.style.gridArea = `${foodY} / ${foodX}`;
};

const handleGameOver = () => {
    clearInterval(setIntervalId);
    alert('Game Over! Press OK to replay...');
    location.reload();
};

// Entrada do teclado e dos botões direcionais.
const changeDirection = (e) => {
    if (e.preventDefault) e.preventDefault();
    if (e.key === 'ArrowUp' && velocityY !== 1) {
        velocityX = 0;
        velocityY = -1;
    } else if (e.key === 'ArrowDown' && velocityY !== -1) {
        velocityX = 0;
        velocityY = 1;
    } else if (e.key === 'ArrowLeft' && velocityX !== 1) {
        velocityX = -1;
        velocityY = 0;
    } else if (e.key === 'ArrowRight' && velocityX !== -1) {
        velocityX = 1;
        velocityY = 0;
    }
};

// Permite trocar a direção deslizando o dedo sobre o tabuleiro.
let swipeStartX = null;
let swipeStartY = null;

playBoard.addEventListener('pointerdown', (event) => {
    swipeStartX = event.clientX;
    swipeStartY = event.clientY;
    playBoard.setPointerCapture(event.pointerId);
});

playBoard.addEventListener('pointerup', (event) => {
    if (swipeStartX === null || swipeStartY === null) return;

    const deltaX = event.clientX - swipeStartX;
    const deltaY = event.clientY - swipeStartY;
    swipeStartX = null;
    swipeStartY = null;

    if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < SWIPE_THRESHOLD) return;

    const key = Math.abs(deltaX) > Math.abs(deltaY)
        ? (deltaX > 0 ? 'ArrowRight' : 'ArrowLeft')
        : (deltaY > 0 ? 'ArrowDown' : 'ArrowUp');
    changeDirection({ key });
});

playBoard.addEventListener('pointercancel', () => {
    swipeStartX = null;
    swipeStartY = null;
});

controls.forEach((key) => {
    key.addEventListener('click', () => changeDirection({ key: key.dataset.key }));
});

// Atualiza posição, colisões, pontuação e desenho do tabuleiro.
const initGame = () => {
    if (GameOver) return handleGameOver();

    if (snakeX === foodX && snakeY === foodY) {
        changeFoodPoisition();
        snakeBody.push([foodX, foodY]);
        score++;
        highScore = score >= highScore ? score : highScore;
        localStorage.setItem('high-score', highScore);
        scoreElement.innerText = `Pontos: ${score}`;
        highScoreElement.innerHTML = `Recorde: ${highScore}`;
    }

    for (let i = snakeBody.length - 1; i > 0; i--) {
        snakeBody[i] = snakeBody[i - 1];
    }

    snakeBody[0] = [snakeX, snakeY];
    snakeX += velocityX;
    snakeY += velocityY;

    if (snakeX <= 0 || snakeX > GRID_SIZE || snakeY <= 0 || snakeY > GRID_SIZE) {
        GameOver = true;
    }

    for (let i = 0; i < snakeBody.length; i++) {
        if (i === 0) {
            const headRotation = velocityX === 1 ? -90 : velocityX === -1 ? 90 : velocityY === -1 ? 180 : 0;
            if (!snakeSegments[i]) {
                snakeSegments[i] = document.createElement('img');
                snakeSegments[i].className = 'snake__head';
                snakeSegments[i].src = 'ASSETS/Snake-Head.png';
                snakeSegments[i].alt = '';
                snakeSegments[i].setAttribute('aria-hidden', 'true');
                playBoard.append(snakeSegments[i]);
            }
            positionSegment(snakeSegments[i], snakeBody[i], headRotation);
        } else {
            if (!snakeSegments[i]) {
                snakeSegments[i] = document.createElement('div');
                snakeSegments[i].className = 'snake__segment';
                playBoard.append(snakeSegments[i]);
            }
            positionSegment(snakeSegments[i], snakeBody[i]);
        }
        if (i !== 0 && snakeBody[0][1] === snakeBody[i][1] && snakeBody[0][0] === snakeBody[i][0]) {
            GameOver = true;
        }
    }

    if (snakeBody.length > 1) {
        hasPlayedAudio = true;
    }
};

// Mantém os elementos da cobra no DOM para que a transição CSS suavize cada passo.
const positionSegment = (element, [x, y], rotation = 0) => {
    element.style.left = `${((x - 1) / GRID_SIZE) * 100}%`;
    element.style.top = `${((y - 1) / GRID_SIZE) * 100}%`;
    if (element.classList.contains('snake__head')) {
        // A escala compensa as margens transparentes da imagem da cabeça.
        element.style.transform = `scale(2) rotate(${rotation}deg)`;
    }
};

// Inicialização: posiciona a comida e inicia o ciclo do jogo.
changeFoodPoisition();
setIntervalId = setInterval(initGame, 180);
document.addEventListener('keydown', changeDirection);
