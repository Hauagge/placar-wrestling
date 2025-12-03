// Wrestling Scoreboard - JavaScript
// Supports Freestyle (Luta Livre) and Greco-Roman wrestling

// Match State
const matchState = {
    redScore: 0,
    blueScore: 0,
    redCautions: 0,
    blueCautions: 0,
    currentPeriod: 1,
    totalPeriods: 2,
    periodDuration: 180, // 3 minutes in seconds
    timeRemaining: 180,
    timerRunning: false,
    timerInterval: null,
    redPassivity: false,
    bluePassivity: false,
    style: 'freestyle'
};

// Initialize the scoreboard
function init() {
    updateDisplay();
    document.getElementById('wrestling-style').addEventListener('change', function(e) {
        matchState.style = e.target.value;
    });
}

// Update all display elements
function updateDisplay() {
    document.getElementById('red-score').textContent = matchState.redScore;
    document.getElementById('blue-score').textContent = matchState.blueScore;
    document.getElementById('red-cautions').textContent = matchState.redCautions;
    document.getElementById('blue-cautions').textContent = matchState.blueCautions;
    document.getElementById('current-period').textContent = matchState.currentPeriod;
    document.getElementById('total-periods').textContent = matchState.totalPeriods;
    updateTimerDisplay();
}

// Update timer display
function updateTimerDisplay() {
    const minutes = Math.floor(matchState.timeRemaining / 60);
    const seconds = matchState.timeRemaining % 60;
    const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('timer').textContent = display;
}

// Add points to a wrestler
function addPoints(corner, points) {
    if (corner === 'red') {
        matchState.redScore = Math.max(0, matchState.redScore + points);
    } else {
        matchState.blueScore = Math.max(0, matchState.blueScore + points);
    }
    updateDisplay();
    checkTechnicalSuperiority();
}

// Add caution to a wrestler
function addCaution(corner) {
    if (corner === 'red') {
        matchState.redCautions++;
        if (matchState.redCautions >= 3) {
            // Third caution results in disqualification
            showResult('Atleta Azul vence por desqualificação!');
        }
    } else {
        matchState.blueCautions++;
        if (matchState.blueCautions >= 3) {
            showResult('Atleta Vermelho vence por desqualificação!');
        }
    }
    updateDisplay();
}

// Toggle passivity indicator
function togglePassivity(corner) {
    const btn = document.getElementById(`${corner}-passivity-btn`);
    if (corner === 'red') {
        matchState.redPassivity = !matchState.redPassivity;
        btn.classList.toggle('active', matchState.redPassivity);
    } else {
        matchState.bluePassivity = !matchState.bluePassivity;
        btn.classList.toggle('active', matchState.bluePassivity);
    }
}

// Toggle timer start/stop
function toggleTimer() {
    const btn = document.getElementById('start-stop-btn');
    if (matchState.timerRunning) {
        stopTimer();
        btn.textContent = 'Iniciar';
        btn.style.background = '#27ae60';
    } else {
        startTimer();
        btn.textContent = 'Pausar';
        btn.style.background = '#e74c3c';
    }
}

// Start the timer
function startTimer() {
    matchState.timerRunning = true;
    matchState.timerInterval = setInterval(function() {
        if (matchState.timeRemaining > 0) {
            matchState.timeRemaining--;
            updateTimerDisplay();
        } else {
            stopTimer();
            endPeriod();
        }
    }, 1000);
}

// Stop the timer
function stopTimer() {
    matchState.timerRunning = false;
    if (matchState.timerInterval) {
        clearInterval(matchState.timerInterval);
        matchState.timerInterval = null;
    }
    const btn = document.getElementById('start-stop-btn');
    btn.textContent = 'Iniciar';
    btn.style.background = '#27ae60';
}

// Reset the timer for current period
function resetTimer() {
    stopTimer();
    matchState.timeRemaining = matchState.periodDuration;
    updateTimerDisplay();
}

// Move to next period
function nextPeriod() {
    stopTimer();
    if (matchState.currentPeriod < matchState.totalPeriods) {
        matchState.currentPeriod++;
        matchState.timeRemaining = matchState.periodDuration;
        // Clear passivity for new period
        matchState.redPassivity = false;
        matchState.bluePassivity = false;
        document.getElementById('red-passivity-btn').classList.remove('active');
        document.getElementById('blue-passivity-btn').classList.remove('active');
        updateDisplay();
    } else {
        endMatch();
    }
}

// End of period handling
function endPeriod() {
    if (matchState.currentPeriod < matchState.totalPeriods) {
        alert(`Fim do Período ${matchState.currentPeriod}! Clique em "Próximo Período" para continuar.`);
    } else {
        endMatch();
    }
}

// End match and determine winner
function endMatch() {
    let result = '';
    const redName = document.getElementById('red-name').value || 'Atleta Vermelho';
    const blueName = document.getElementById('blue-name').value || 'Atleta Azul';

    if (matchState.redScore > matchState.blueScore) {
        result = `${redName} vence por pontos! (${matchState.redScore} - ${matchState.blueScore})`;
    } else if (matchState.blueScore > matchState.redScore) {
        result = `${blueName} vence por pontos! (${matchState.blueScore} - ${matchState.redScore})`;
    } else {
        // Tie - check criteria
        result = determineTieBreaker(redName, blueName);
    }

    showResult(result);
}

// Determine winner in case of tie
function determineTieBreaker(redName, blueName) {
    // In wrestling, ties are broken by various criteria
    // Simplified version: fewer cautions wins
    if (matchState.redCautions < matchState.blueCautions) {
        return `${redName} vence por critério (menos advertências)!`;
    } else if (matchState.blueCautions < matchState.redCautions) {
        return `${blueName} vence por critério (menos advertências)!`;
    } else {
        return 'Empate! Verificar critérios de desempate.';
    }
}

// Check for technical superiority (10 point lead in Freestyle, 8 in Greco-Roman)
function checkTechnicalSuperiority() {
    const difference = Math.abs(matchState.redScore - matchState.blueScore);
    const threshold = matchState.style === 'freestyle' ? 10 : 8;

    if (difference >= threshold) {
        const redName = document.getElementById('red-name').value || 'Atleta Vermelho';
        const blueName = document.getElementById('blue-name').value || 'Atleta Azul';

        if (matchState.redScore > matchState.blueScore) {
            declareTechnicalFallFor(redName);
        } else {
            declareTechnicalFallFor(blueName);
        }
    }
}

// Declare technical fall for a specific wrestler
function declareTechnicalFallFor(winnerName) {
    stopTimer();
    showResult(`${winnerName} vence por Superioridade Técnica!`);
}

// Declare a fall (pin)
function declareFall() {
    stopTimer();
    const choice = prompt('Quem encostou? Digite "V" para Vermelho ou "A" para Azul:');
    if (choice) {
        const redName = document.getElementById('red-name').value || 'Atleta Vermelho';
        const blueName = document.getElementById('blue-name').value || 'Atleta Azul';

        if (choice.toUpperCase() === 'V' || choice.toLowerCase() === 'vermelho') {
            showResult(`${redName} vence por Encostou (Fall)!`);
        } else if (choice.toUpperCase() === 'A' || choice.toLowerCase() === 'azul') {
            showResult(`${blueName} vence por Encostou (Fall)!`);
        }
    }
}

// Declare technical fall manually
function declareTechnicalFall() {
    stopTimer();
    const choice = prompt('Quem venceu por superioridade técnica? Digite "V" para Vermelho ou "A" para Azul:');
    if (choice) {
        const redName = document.getElementById('red-name').value || 'Atleta Vermelho';
        const blueName = document.getElementById('blue-name').value || 'Atleta Azul';

        if (choice.toUpperCase() === 'V' || choice.toLowerCase() === 'vermelho') {
            showResult(`${redName} vence por Superioridade Técnica!`);
        } else if (choice.toUpperCase() === 'A' || choice.toLowerCase() === 'azul') {
            showResult(`${blueName} vence por Superioridade Técnica!`);
        }
    }
}

// Show result modal
function showResult(text) {
    const resultDisplay = document.getElementById('result-display');
    const resultText = document.getElementById('result-text');
    resultText.textContent = text;
    resultDisplay.style.display = 'block';
}

// Close result modal
function closeResult() {
    document.getElementById('result-display').style.display = 'none';
}

// Reset entire match
function resetMatch() {
    if (confirm('Tem certeza que deseja iniciar uma nova luta? Todos os dados serão perdidos.')) {
        stopTimer();
        matchState.redScore = 0;
        matchState.blueScore = 0;
        matchState.redCautions = 0;
        matchState.blueCautions = 0;
        matchState.currentPeriod = 1;
        matchState.timeRemaining = matchState.periodDuration;
        matchState.redPassivity = false;
        matchState.bluePassivity = false;

        document.getElementById('red-name').value = '';
        document.getElementById('blue-name').value = '';
        document.getElementById('red-passivity-btn').classList.remove('active');
        document.getElementById('blue-passivity-btn').classList.remove('active');

        updateDisplay();
        closeResult();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
