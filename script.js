// Timer variables
let timerInterval = null;
let totalSeconds = 120; // Default 2 minutes
let remainingSeconds = 120;
let isRunning = false;

// Score variables
let score1 = 0;
let score2 = 0;
let currentPeriod = 1;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    updateTimerDisplay();
});

// Timer Functions
function updateTimerDisplay() {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    const display = document.getElementById('timerDisplay');
    display.textContent = 
        String(minutes).padStart(2, '0') + ':' + 
        String(seconds).padStart(2, '0');
    
    // Change color when time is low
    if (remainingSeconds <= 10 && remainingSeconds > 0) {
        display.style.color = '#ff4444';
    } else if (remainingSeconds === 0) {
        display.style.color = '#ff4444';
    } else {
        display.style.color = '#00ff88';
    }
}

function startTimer() {
    if (isRunning) return;
    
    isRunning = true;
    timerInterval = setInterval(function() {
        if (remainingSeconds > 0) {
            remainingSeconds--;
            updateTimerDisplay();
        } else {
            pauseTimer();
            // Optional: play sound or alert when timer ends
            alert('Tempo esgotado!');
        }
    }, 1000);
}

function pauseTimer() {
    isRunning = false;
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function resetTimer() {
    pauseTimer();
    remainingSeconds = totalSeconds;
    updateTimerDisplay();
}

// Timer Preset Functions
function setTimerPreset(seconds) {
    // Update active button
    document.querySelectorAll('.preset-btn').forEach(function(btn) {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Set timer
    totalSeconds = seconds;
    remainingSeconds = seconds;
    pauseTimer();
    updateTimerDisplay();
    
    // Update custom timer inputs
    document.getElementById('customMinutes').value = Math.floor(seconds / 60);
    document.getElementById('customSeconds').value = seconds % 60;
}

function setCustomTimer() {
    const minutes = parseInt(document.getElementById('customMinutes').value) || 0;
    const seconds = parseInt(document.getElementById('customSeconds').value) || 0;
    
    // Validate inputs
    if (minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
        alert('Por favor, insira valores válidos (0-59)');
        return;
    }
    
    const total = (minutes * 60) + seconds;
    
    if (total <= 0) {
        alert('O tempo deve ser maior que zero');
        return;
    }
    
    // Remove active class from presets
    document.querySelectorAll('.preset-btn').forEach(function(btn) {
        btn.classList.remove('active');
    });
    
    // Set custom timer
    totalSeconds = total;
    remainingSeconds = total;
    pauseTimer();
    updateTimerDisplay();
}

// Score Functions
function addScore(player, points) {
    if (player === 1) {
        score1 = Math.max(0, score1 + points);
        document.getElementById('score1').textContent = score1;
    } else {
        score2 = Math.max(0, score2 + points);
        document.getElementById('score2').textContent = score2;
    }
}

// Period Functions
function changePeriod(change) {
    currentPeriod = Math.max(1, Math.min(3, currentPeriod + change));
    document.getElementById('periodDisplay').textContent = currentPeriod;
}

// Style change (for future expansion)
function changeStyle() {
    const style = document.getElementById('wrestlingStyle').value;
    // Can be expanded to apply different rules for each style
    console.log('Estilo selecionado:', style);
}

// Reset Match
function resetMatch() {
    if (confirm('Tem certeza que deseja reiniciar a partida?')) {
        // Reset scores
        score1 = 0;
        score2 = 0;
        document.getElementById('score1').textContent = '0';
        document.getElementById('score2').textContent = '0';
        
        // Reset period
        currentPeriod = 1;
        document.getElementById('periodDisplay').textContent = '1';
        
        // Reset timer
        resetTimer();
        
        // Clear player names
        document.getElementById('player1Name').value = '';
        document.getElementById('player2Name').value = '';
    }
}
