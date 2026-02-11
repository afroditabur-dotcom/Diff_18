let state = {
    currentVariantIndex: 0,
    currentTaskIndex: 0,
    score: 0,
    attempts: parseInt(localStorage.getItem('cheatAttempts') || '0'),
    tasks: [],
    allVariants: [],
    isProcessing: false // Флаг, чтобы нельзя было спамить кнопку
};

const mf = document.getElementById('user-answer');
const feedbackEl = document.getElementById('feedback');
const mathDisplay = document.getElementById('math-display');
const nextBtn = document.getElementById('next-task-btn'); // Новая кнопка

async function init() {
    try {
        const response = await fetch('tasks.json');
        const data = await response.json();
        
        for (let i = 0; i < 25; i++) {
            let shuffled = [...data].sort(() => Math.random() - 0.5);
            state.allVariants.push(shuffled.slice(0, 5));
        }

        setupVariantSelector();
        startTest();
    } catch (e) {
        console.error("Ошибка загрузки задач:", e);
    }
}

function setupVariantSelector() {
    const select = document.getElementById('variant-select');
    if(!select) return;
    for (let i = 0; i < 25; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = `Вариант №${i + 1}`;
        select.appendChild(opt);
    }
    select.addEventListener('change', (e) => {
        state.currentVariantIndex = parseInt(e.target.value);
        startTest();
    });
}

// --- УПРАВЛЕНИЕ КНОПКОЙ ---

// Нажатие на кнопку "Следующее задание"
if (nextBtn) {
    nextBtn.addEventListener('click', () => {
        handleNextStep();
    });
}

// Физический Enter на клавиатуре
mf.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleNextStep();
    }
});

// Виртуальные клавиши (цифры, символы)
document.querySelectorAll('.key').forEach(button => {
    button.addEventListener('mousedown', (e) => {
        e.preventDefault();
        if (state.isProcessing) return;

        if (button.id === 'backspace') {
            mf.executeCommand('deleteBackward');
        } else if (button.dataset.latex) {
            mf.insert(button.dataset.latex);
        } else if (button.dataset.cmd) {
            mf.insert(button.dataset.cmd);
        }
        mf.focus();
    });
});

function handleNextStep() {
    if (state.isProcessing) return;
    
    // Если поле пустое, просто не пускаем дальше
    if (mf.value.trim() === "") {
        mf.focus();
        return;
    }

    checkAnswer();
}

// --- ПРОВЕРКА ---

function latexToAlg(latex) {
    if (!latex) return "";
    let s = latex.replace(/\\left/g, '').replace(/\\right/g, '').replace(/\\,/g, '');
    while (s.includes('\\frac')) {
        s = s.replace(/\\frac{((?:[^{}]|{[^{}]*})*)}{((?:[^{}]|{[^{}]*})*)}/g, '(($1)/($2))');
    }
    const funcs = ['sin', 'cos', 'tan', 'ln', 'sqrt'];
    funcs.forEach(f => s = s.replace(new RegExp('\\\\' + f, 'g'), f));
    s = s.replace(/\{/g, '(').replace(/\}/g, ')').replace(/\\cdot/g, '*');
    s = s.replace(/(\d)([a-zA-Z\(])/g, '$1*$2'); 
    return s;
}

function checkAnswer() {
    state.isProcessing = true;
    const task = state.tasks[state.currentTaskIndex];
    const studentSide = latexToAlg(mf.getValue('latex'));
    const correctSide = latexToAlg(task.a);

    let isCorrect = false;
    try {
        const diff = Algebrite.run(`simplify((${studentSide}) - (${correctSide}))`);
        if (diff === '0' || diff === '0.0') isCorrect = true;
    } catch (e) {
        console.error("Ошибка расчета:", e);
    }

    showFeedback(isCorrect, task.a);
}

function showFeedback(isCorrect, correctAnswer) {
    feedbackEl.style.display = 'block';
    nextBtn.disabled = true;

    if (isCorrect) {
        state.score++;
        feedbackEl.textContent = "✅ Правильно!";
        feedbackEl.className = "feedback success";
    } else {
        feedbackEl.innerHTML = `❌ Ошибка. Ответ: \\( ${correctAnswer} \\)`;
        if (window.katex) {
            katex.render(correctAnswer, feedbackEl.querySelector('span') || feedbackEl);
        }
        feedbackEl.className = "feedback error";
    }

    setTimeout(() => {
        feedbackEl.style.display = 'none';
        nextBtn.disabled = false;
        state.isProcessing = false;
        state.currentTaskIndex++;
        
        if (state.currentTaskIndex < 5) {
            displayTask();
        } else {
            finishTest();
        }
    }, 2000);
}

function startTest() {
    state.currentTaskIndex = 0;
    state.score = 0;
    state.tasks = state.allVariants[state.currentVariantIndex];
    state.isProcessing = false;
    if (nextBtn) nextBtn.disabled = false;
    displayTask();
}

function displayTask() {
    if (!state.tasks[state.currentTaskIndex]) return;
    const task = state.tasks[state.currentTaskIndex];
    katex.render(task.q, mathDisplay, { displayMode: true });
    mf.value = ""; 
    document.getElementById('task-counter').textContent = `Задача ${state.currentTaskIndex + 1} из 5`;
    updateStats();
    setTimeout(() => mf.focus(), 50);
}

function finishTest() {
    alert(`Тест окончен!\nВаш результат: ${state.score} из 5`);
    startTest();
}

function updateStats() {
    document.getElementById('score-display').textContent = `Правильно: ${state.score}`;
    document.getElementById('attempts-display').textContent = `Списываний: ${state.attempts}`;
}

document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.currentTaskIndex < 5) {
        state.attempts++;
        localStorage.setItem('cheatAttempts', state.attempts);
        alert("Внимание! Переключение вкладок запрещено.");
        updateStats();
    }
});

init();
