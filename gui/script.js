document.addEventListener('DOMContentLoaded', () => {
    // Game State
    let towers = [[], [], []];
    let numRings = 4;
    let moves = 0;
    let selectedPillarIndex = null;
    let timerInterval = null;
    let secondsElapsed = 0;
    let gameActive = false;
    let autoSolving = false;
    let autoSolveTimeouts = [];
    let gameHistory = [];
    let hintTimeout = null;

    // DOM Elements
    const ringCountInput = document.getElementById('ring-count');
    const resetBtn = document.getElementById('reset-btn');
    const hintBtn = document.getElementById('hint-btn');
    const autoSolveBtn = document.getElementById('auto-solve-btn');
    const timerDisplayEl = document.getElementById('timer-display');
    const moveCountEl = document.getElementById('move-count');
    const minMovesEl = document.getElementById('min-moves');
    const pillarsDOM = document.querySelectorAll('.pillar-container');
    const ringsContainers = [
        document.getElementById('pillar-0'),
        document.getElementById('pillar-1'),
        document.getElementById('pillar-2')
    ];
    const winModal = document.getElementById('win-modal');
    const finalTimeEl = document.getElementById('final-time');
    const finalMovesEl = document.getElementById('final-moves');
    const playAgainBtn = document.getElementById('play-again-btn');
    const historyListEl = document.getElementById('history-list');

    // Vibrant gradients for the rings to make it visually stunning
    const ringColors = [
        'linear-gradient(90deg, #ff007f, #ff5e62)',
        'linear-gradient(90deg, #00f2fe, #4facfe)',
        'linear-gradient(90deg, #fce38a, #f38181)',
        'linear-gradient(90deg, #43e97b, #38f9d7)',
        'linear-gradient(90deg, #fa709a, #fee140)',
        'linear-gradient(90deg, #a18cd1, #fbc2eb)',
        'linear-gradient(90deg, #fdfbfb, #ebedee)',
        'linear-gradient(90deg, #c2e9fb, #a1c4fd)',
        'linear-gradient(90deg, #ff0844, #ffb199)',
        'linear-gradient(90deg, #96fbc4, #f9f586)'
    ];

    // Initialize Game
    function initGame() {
        // Clear any running auto-solve timers
        autoSolveTimeouts.forEach(clearTimeout);
        autoSolveTimeouts = [];
        autoSolving = false;
        
        numRings = parseInt(ringCountInput.value);
        if (numRings < 3 || isNaN(numRings)) numRings = 3;
        if (numRings > 10) numRings = 10;
        ringCountInput.value = numRings;

        moves = 0;
        selectedPillarIndex = null;
        towers = [[], [], []];
        gameActive = false;
        
        resetTimer();
        autoSolveBtn.disabled = false;
        ringCountInput.disabled = false;
        clearHints();

        // Populate first tower with descending order of rings
        for (let i = numRings; i >= 1; i--) {
            towers[0].push(i);
        }

        updateStats();
        minMovesEl.textContent = Math.pow(2, numRings) - 1;
        winModal.classList.add('hidden');

        // Clear selection UI
        pillarsDOM.forEach(p => p.classList.remove('selected'));

        renderTowers();
        renderSampleTower();
    }

    // Render the rings on the pillars
    function renderTowers() {
        for (let i = 0; i < 3; i++) {
            const container = ringsContainers[i];
            container.innerHTML = ''; // Clear existing rings

            towers[i].forEach((ringSize, index) => {
                const ringEl = document.createElement('div');
                ringEl.classList.add('ring');
                
                // Calculate size based on ring value
                const widthPercent = 30 + (ringSize / 10) * 60; // Spread between 30% and 90%
                ringEl.style.width = `${widthPercent}%`;
                
                // Apply dynamic color gradient
                ringEl.style.background = ringColors[(ringSize - 1) % ringColors.length];
                
                // Add selected visual effect to top ring of selected pillar
                if (selectedPillarIndex === i && index === towers[i].length - 1) {
                    ringEl.classList.add('selected-ring');
                }

                container.appendChild(ringEl);
            });
        }
    }

    // Render the target order in the mini sample tower
    function renderSampleTower() {
        const sampleContainer = document.getElementById('sample-rings');
        if (!sampleContainer) return;
        sampleContainer.innerHTML = '';
        
        for (let i = numRings; i >= 1; i--) {
            const ringEl = document.createElement('div');
            ringEl.classList.add('ring');
            
            // Calculate size based on ring value
            const widthPercent = 30 + (i / 10) * 60; // Same ratio as main rings
            ringEl.style.width = `${widthPercent}%`;
            
            // Apply dynamic color gradient
            ringEl.style.background = ringColors[(i - 1) % ringColors.length];
            
            sampleContainer.appendChild(ringEl);
        }
    }

    function updateStats() {
        moveCountEl.textContent = moves;
    }

    function handlePillarClick(index) {
        if (autoSolving) return; // Prevent clicks during auto-solve
        
        clearHints(); // clear any active hints on click
        
        // Selection Logic
        if (selectedPillarIndex === null) {
            // Select if the pillar has rings
            if (towers[index].length > 0) {
                selectedPillarIndex = index;
                pillarsDOM[index].classList.add('selected');
                
                // Add selected visual effect
                const ringEl = ringsContainers[index].lastElementChild;
                if(ringEl) ringEl.classList.add('selected-ring');
            }
        } 
        // Move Logic
        else {
            const fromIndex = selectedPillarIndex;
            const toIndex = index;

            pillarsDOM[fromIndex].classList.remove('selected');
            
            const oldRingEl = ringsContainers[fromIndex].lastElementChild;
            if(oldRingEl) oldRingEl.classList.remove('selected-ring');
            
            selectedPillarIndex = null;

            // Clicking the same pillar cancels selection
            if (fromIndex === toIndex) {
                return;
            }

            const topRingToMove = towers[fromIndex][towers[fromIndex].length - 1];
            const targetTopRing = towers[toIndex].length > 0 ? towers[toIndex][towers[toIndex].length - 1] : null;

            // Validate Move Rule: Cannot place larger on smaller
            if (targetTopRing === null || topRingToMove < targetTopRing) {
                // Start timer on first valid move
                if (!gameActive) {
                    gameActive = true;
                    autoSolveBtn.disabled = true; // disable auto-solve once game starts
                    ringCountInput.disabled = true;
                    startTimer();
                }

                // Logical Move
                towers[toIndex].push(towers[fromIndex].pop());
                moves++;
                updateStats();
                
                // Visual Move
                moveRingVisually(fromIndex, toIndex, 400);
            }
        }
    }

    function moveRingVisually(fromIndex, toIndex, duration) {
        const fromContainer = ringsContainers[fromIndex];
        const toContainer = ringsContainers[toIndex];
        
        const movingRingEl = fromContainer.lastElementChild;
        if (!movingRingEl) return;
        
        // Record start position visually
        const startRect = movingRingEl.getBoundingClientRect();
        
        // Move element in DOM
        toContainer.appendChild(movingRingEl);
        
        // Record end position
        const endRect = movingRingEl.getBoundingClientRect();
        
        // Calculate translation
        const deltaX = startRect.left - endRect.left;
        const deltaY = startRect.top - endRect.top;
        
        // Setup instant teleport to start position
        movingRingEl.style.transition = 'none';
        movingRingEl.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        movingRingEl.style.zIndex = '100'; // Make it pop over pillars
        
        // Force reflow
        movingRingEl.getBoundingClientRect();
        
        // Enable transition and fly to final layout position (0,0)
        movingRingEl.style.transition = `transform ${duration}ms cubic-bezier(0.25, 1, 0.5, 1)`;
        movingRingEl.style.transform = `translate(0, 0)`;
        
        setTimeout(() => {
            movingRingEl.style.transition = '';
            movingRingEl.style.transform = '';
            movingRingEl.style.zIndex = '';
            checkWin(); 
        }, duration);
    }

    function startTimer() {
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            secondsElapsed++;
            timerDisplayEl.textContent = formatTime(secondsElapsed);
        }, 1000);
    }

    function resetTimer() {
        clearInterval(timerInterval);
        secondsElapsed = 0;
        timerDisplayEl.textContent = "00:00";
    }

    function formatTime(totalSeconds) {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function checkWin() {
        if (towers[2].length === numRings) {
            gameActive = false;
            clearInterval(timerInterval);
            
            setTimeout(() => {
                finalTimeEl.textContent = autoSolving ? "Auto-Solved" : formatTime(secondsElapsed);
                finalMovesEl.textContent = moves;
                winModal.classList.remove('hidden');
                
                if (!autoSolving) {
                    saveGameHistory();
                }
                autoSolving = false;
            }, 300); // slight delay to let UI render the placed ring
        }
    }

    function saveGameHistory() {
        const now = new Date();
        const dateStr = now.toLocaleDateString();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const gameInfo = {
            id: Date.now(),
            date: `${dateStr} ${timeStr}`,
            rings: numRings,
            moves: moves,
            time: formatTime(secondsElapsed)
        };
        
        gameHistory.unshift(gameInfo); // Add to beginning of array
        
        // Keep only last 10 games
        if (gameHistory.length > 10) {
            gameHistory = gameHistory.slice(0, 10);
        }
        
        renderHistory();
    }

    function renderHistory() {
        if (gameHistory.length === 0) {
            historyListEl.innerHTML = '<p class="empty-history">No games played yet.</p>';
            return;
        }
        
        historyListEl.innerHTML = '';
        gameHistory.forEach(game => {
            const minMoves = Math.pow(2, game.rings) - 1;
            const itemHTML = `
                <div class="history-item">
                    <div class="history-item-date">${game.date}</div>
                    <div class="history-item-details">
                        <span><strong>${game.rings}</strong> Rings</span>
                        <span><strong>${game.moves}</strong> Moves (Min: ${minMoves})</span>
                        <span>⏱️ <strong>${game.time}</strong></span>
                    </div>
                </div>
            `;
            historyListEl.insertAdjacentHTML('beforeend', itemHTML);
        });
    }

    // Auto-Solve Logic
    function startAutoSolve() {
        if (moves > 0) return; // Only allow auto-solve from the start
        
        autoSolving = true;
        autoSolveBtn.disabled = true;
        ringCountInput.disabled = true;
        
        // Disable timer visually, clear it out
        clearInterval(timerInterval);
        timerDisplayEl.textContent = "Auto...";

        const movesList = [];
        
        // Recursive function to solve Tower of Hanoi
        function solve(n, source, target, auxiliary) {
            if (n === 1) {
                movesList.push({from: source, to: target});
                return;
            }
            solve(n - 1, source, auxiliary, target);
            movesList.push({from: source, to: target});
            solve(n - 1, auxiliary, target, source);
        }

        // Calculate all moves
        solve(numRings, 0, 2, 1);

        // Execute moves with a delay for visual effect
        let baseDelay = Math.max(150, 800 - (numRings * 50)); // slower, relaxed animation
        let animDuration = baseDelay * 0.9; // Slightly faster animation than delay to avoid overlap artifacts
        
        movesList.forEach((move, index) => {
            const timeout = setTimeout(() => {
                executeAutoMove(move.from, move.to, animDuration);
            }, index * baseDelay);
            autoSolveTimeouts.push(timeout);
        });
    }

    function executeAutoMove(fromIndex, toIndex, duration) {
        towers[toIndex].push(towers[fromIndex].pop());
        moves++;
        updateStats();
        
        // Optional: you can show a subtle selection pip on auto solve pillars
        // But with fast animations, it's better to just move the ring.
        moveRingVisually(fromIndex, toIndex, duration);
    }

    // Hint Logic
    function showHint() {
        if (autoSolving || towers[2].length === numRings) return;
        
        clearHints();

        // Current locations of rings
        let current = [];
        for (let p = 0; p < 3; p++) {
            towers[p].forEach(ringSize => {
                current[ringSize] = p; // ring sizes are 1 to numRings
            });
        }

        // Target locations of rings from largest down
        let target = [];
        target[numRings] = 2; // largest ring must go to Pillar 3 (index 2)

        for (let r = numRings; r >= 1; r--) {
            if (current[r] === target[r]) {
                target[r - 1] = target[r]; // it's in place, so the next smaller goes to same place
            } else {
                target[r - 1] = 3 - current[r] - target[r]; // goes to the third auxiliary pillar
            }
        }

        // The smallest ring out of place needs to move to its target
        let moveFrom = -1;
        let moveTo = -1;
        for (let r = 1; r <= numRings; r++) {
            if (current[r] !== target[r]) {
                moveFrom = current[r];
                moveTo = target[r];
                break;
            }
        }

        if (moveFrom !== -1 && moveTo !== -1) {
            const fromRing = ringsContainers[moveFrom].lastElementChild;
            if (fromRing) fromRing.classList.add('hint-source');
            pillarsDOM[moveTo].classList.add('hint-target');
            
            clearTimeout(hintTimeout);
            hintTimeout = setTimeout(clearHints, 5000);
        }
    }

    function clearHints() {
        clearTimeout(hintTimeout);
        document.querySelectorAll('.hint-source').forEach(el => el.classList.remove('hint-source'));
        document.querySelectorAll('.hint-target').forEach(el => el.classList.remove('hint-target'));
    }

    // Event Listeners
    pillarsDOM.forEach((pillar, index) => {
        pillar.addEventListener('click', () => handlePillarClick(index));
    });

    resetBtn.addEventListener('click', initGame);
    hintBtn.addEventListener('click', showHint);
    autoSolveBtn.addEventListener('click', startAutoSolve);
    playAgainBtn.addEventListener('click', initGame);
    ringCountInput.addEventListener('change', initGame);

    // Initial Start
    initGame();
});
