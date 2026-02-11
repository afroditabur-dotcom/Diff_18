let state = {
    currentVariantIndex: 0,
    currentTaskIndex: 0,
    score: 0,
    attempts: parseInt(localStorage.getItem('cheatAttempts') || '0'),
    tasks: [],
    allVariants: []
};

const mf = document.getElementById('user-answer');
const feedbackEl = document.getElementById('feedback');
const mathDisplay = document.getElementById('math-display');

async function init() {
    try {
        const response = await fetch('tasks.json');
        const data = await response.json();
        
        // Создаем 25 случайных вариантов
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

// --- ЛОГИКА КЛАВИАТУРЫ ---

// 1. Обработка виртуальных кнопок
document.querySelectorAll('.key').forEach(button => {
    button.addEventListener('mousedown', (e) => {
        e.preventDefault(); // Чтобы фокус не уходил из math-field
        
        if (button.id === 'backspace') {
            mf.executeCommand('deleteBackward');
        } else if (button.id === 'enter-key') {
            checkAnswer();
        } else if (button.dataset.latex) {
            mf.insert(button.dataset.latex);
        } else if (button.dataset.cmd) {
            mf.insert(button.dataset.cmd);
        }
        mf.focus();
    });
});

// 2. Обработка ФИЗИЧЕСКОЙ клавиши Enter
mf.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        checkAnswer();
    }
});

// --- ПРОВЕРКА ОТВЕТА ---

function latexToAlg(latex) {
    if (!latex) return "";
    let s = latex.replace(/\\left/g, '').replace(/\\right/g, '').replace(/\\,/g, '');
    
    // Замена дробей \frac{a}{b} -> ((a)/(b))
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
    // Если поле пустое - ничего не делаем
    if (mf.value.trim() === "" || mf.getValue('latex').trim() === "") {
        return; 
    }

    const task = state.tasks[state.currentTaskIndex];
    const studentSide = latexToAlg(mf.getValue('latex'));
    const correctSide = latexToAlg(task.a);

    let isCorrect = false;
    try {
        // Сравниваем математически через Algebrite
        const diff = Algebrite.run(`simplify((${studentSide}) - (${correctSide}))`);
        if (diff === '0' || diff === '0.0') isCorrect = true;
    } catch (e) {
        console.error("Ошибка при расчете:", e);
    }

    showFeedback(isCorrect, task.a);
}

function showFeedback(isCorrect, correctAnswer) {
    feedbackEl.style.display = 'block';
    mf.disabled = true; // Блокируем ввод на время показа результата

    if (isCorrect) {
        state.score++;
        feedbackEl.textContent = "✅ Правильно!";
        feedbackEl.style.background = "#d4edda";
        feedbackEl.style.color = "#155724";
    } else {
        feedbackEl.innerHTML = `❌ Ошибка. Правильно: \\( ${correctAnswer} \\)`;
        // Рендерим LaTeX в сообщении об ошибке
        if (window.katex) {
            setTimeout(() => {
                katex.render(correctAnswer, feedbackEl.querySelector('span') || feedbackEl);
            }, 10);
        }
        feedbackEl.style.background = "#f8d7da";
        feedbackEl.style.color = "#721c24";
    }

    setTimeout(() => {
        feedbackEl.style.display = 'none';
        mf.disabled = false;
        state.currentTaskIndex++;
        
        if (state.currentTaskIndex < 5) {
            displayTask();
        } else {
            finishTest();
        }
    }, 2000); // 2 секунды на просмотр ошибки
}

function startTest() {
    state.currentTaskIndex = 0;
    state.score = 0;
    state.tasks = state.allVariants[state.currentVariantIndex];
    displayTask();
}

function displayTask() {
    if (!state.tasks[state.currentTaskIndex]) return;
    
    const task = state.tasks[state.currentTaskIndex];
    katex.render(task.q, mathDisplay, { displayMode: true });
    mf.value = ""; 
    document.getElementById('task-counter').textContent = `Задача ${state.currentTaskIndex + 1} из 5`;
    updateStats();
    
    // Возвращаем фокус в поле ввода
    setTimeout(() => mf.focus(), 100);
}

function finishTest() {
    alert(`Тест окончен!\nВаш результат: ${state.score} из 5`);
    startTest();
}

function updateStats() {
    document.getElementById('score-display').textContent = `Правильно: ${state.score}`;
    document.getElementById('attempts-display').textContent = `Списываний: ${state.attempts}`;
}

// Анти-чит
document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.currentTaskIndex < 5) {
        state.attempts++;
        localStorage.setItem('cheatAttempts', state.attempts);
        alert("Внимание! Переключение вкладок запрещено.");
        updateStats();
    }
});

init();
