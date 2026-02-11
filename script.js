// Данные заданий по вариантам
const variants = {
    "Вариант 1": [
        { task: "2x + 3x", answer: "5x" },
        { task: "x \\cdot x", answer: "x^2" },
        { task: "\\sqrt{16}", answer: "4" },
        { task: "10 - 2^2", answer: "6" },
        { task: "\\sin^2 x + \\cos^2 x", answer: "1" }
    ],
    "Вариант 2": [
        { task: "5y - 2y", answer: "3y" },
        { task: "y^2 \\cdot y", answer: "y^3" },
        { task: "\\sqrt{25}", answer: "5" },
        { task: "3 \\cdot (2 + 4)", answer: "18" },
        { task: "x + x + x", answer: "3x" }
    ]
};

let currentVariant = "Вариант 1";
let currentIndex = 0;
let score = 0;
let attempts = 0;

// Элементы DOM
const mathField = document.getElementById('user-answer');
const taskDisplay = document.getElementById('math-display');
const taskCounter = document.getElementById('task-counter');
const nextBtn = document.getElementById('next-task-btn');
const feedback = document.getElementById('feedback');
const variantSelect = document.getElementById('variant-select');
const scoreDisplay = document.getElementById('score-display');

// Инициализация выпадающего списка
function initApp() {
    Object.keys(variants).forEach(v => {
        const option = document.createElement('option');
        option.value = v;
        option.textContent = v;
        variantSelect.appendChild(option);
    });
    loadTask();
}

// Загрузка текущего задания
function loadTask() {
    const tasks = variants[currentVariant];
    if (currentIndex >= tasks.length) {
        showFinalResult();
        return;
    }

    const task = tasks[currentIndex];
    // Отображаем условие через KaTeX
    katex.render(task.task, taskDisplay, { throwOnError: false });
    
    // Сброс интерфейса
    taskCounter.textContent = `Задача ${currentIndex + 1} из ${tasks.length}`;
    mathField.value = "";
    feedback.style.display = 'none';
    nextBtn.disabled = false;
    nextBtn.textContent = "Проверить и продолжить";
    
    setTimeout(() => mathField.focus(), 100);
}

// Проверка ответа через Algebrite (математическая эквивалентность)
function checkAnswer() {
    const userIn = mathField.value.trim();
    const correctIn = variants[currentVariant][currentIndex].answer;

    if (!userIn) return false;

    try {
        // Упрощенная проверка: сравниваем упрощенные выражения через Algebrite
        // Заменяем LaTeX специфичные вещи на понятные Algebrite
        const cleanUser = userIn.replace(/\\/g, '').replace(/{/g, '(').replace(/}/g, ')');
        const cleanCorrect = correctIn.replace(/\\/g, '').replace(/{/g, '(').replace(/}/g, ')');
        
        const diff = Algebrite.run(`${cleanUser} - (${cleanCorrect})`);
        return diff === "0";
    } catch (e) {
        // Если Algebrite не справился, сравниваем строки напрямую (удалив пробелы)
        return userIn.replace(/\s/g, '') === correctIn.replace(/\s/g, '');
    }
}

// Обработка перехода
function handleNext() {
    if (nextBtn.disabled) return;

    const isCorrect = checkAnswer();
    nextBtn.disabled = true; // Блокируем от спама

    if (isCorrect) {
        score++;
        showFeedback("Правильно!", "success");
    } else {
        showFeedback(`Ошибка. Правильный ответ: ${variants[currentVariant][currentIndex].answer}`, "error");
    }

    scoreDisplay.textContent = `Правильно: ${score}`;

    // Переход к следующему через 1.5 секунды
    setTimeout(() => {
        currentIndex++;
        loadTask();
    }, 1500);
}

function showFeedback(text, type) {
    feedback.textContent = text;
    feedback.className = `feedback ${type}`;
    feedback.style.display = 'block';
}

function showFinalResult() {
    taskDisplay.innerHTML = `<h3>Тест окончен!</h3><p>Ваш результат: ${score} из ${variants[currentVariant].length}</p>`;
    nextBtn.textContent = "Начать заново";
    nextBtn.disabled = false;
    nextBtn.onclick = () => location.reload();
}

// --- Слушатели событий ---

// Кнопка "Следующее задание"
nextBtn.addEventListener('click', handleNext);

// Нажатие Enter
mathField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        handleNext();
    }
});

// Смена варианта
variantSelect.addEventListener('change', (e) => {
    currentVariant = e.target.value;
    currentIndex = 0;
    score = 0;
    loadTask();
});

// Виртуальная клавиатура
document.querySelectorAll('.key').forEach(key => {
    key.addEventListener('click', () => {
        const latex = key.getAttribute('data-latex');
        const cmd = key.getAttribute('data-cmd');

        if (key.id === 'backspace') {
            mathField.executeCommand('deleteBackward');
        } else if (cmd) {
            mathField.insert(cmd);
        } else if (latex) {
            mathField.insert(latex);
        }
        mathField.focus();
    });
});

// Запуск
window.onload = initApp;
