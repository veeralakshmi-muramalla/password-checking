"use strict";

// SecurePass educational front-end demo.
// No passwords are saved to localStorage or sent to a server.

const $ = id => document.getElementById(id);

const authView = $("auth-view");
const workspace = $("workspace");
const authMessage = $("auth-message");

let currentUser = null;
let analyzedCount = 0;
let generatedCount = 0;
let currentPage = "dashboard";

const pages = ["dashboard", "analyzer", "generator"];

function showNotice(text, success = false) {
    authMessage.textContent = text;
    authMessage.classList.toggle("success", success);
}

function showAuth(mode = "login") {
    currentUser = null;
    authView.classList.remove("hidden");
    workspace.classList.add("hidden");
    $("page-heading").textContent = mode === "login" ? "Login" : "Register";
    setAuthMode(mode);
    showNotice("");
}

function setAuthMode(mode) {
    document.querySelectorAll(".auth-tab").forEach(tab => {
        tab.classList.toggle("active", tab.dataset.auth === mode);
    });

    $("login-form").classList.toggle("hidden", mode !== "login");
    $("register-form").classList.toggle("hidden", mode !== "register");
    showNotice("");
}

document.querySelectorAll("[data-auth]").forEach(button => {
    button.addEventListener("click", () => setAuthMode(button.dataset.auth));
});

// Demo accounts exist only in memory for this page session.
const demoAccounts = new Map();

$("register").addEventListener("submit", event => {
    event.preventDefault();

    const name = $("register-name").value.trim();
    const email = $("register-email").value.trim().toLowerCase();
    const password = $("register-password").value;
    const confirm = $("confirm-password").value;

    if (!name || !email) {
        showNotice("Please enter your name and email.");
        return;
    }

    if (password.length < 12) {
        showNotice("Use at least 12 characters for this demo.");
        return;
    }

    if (password !== confirm) {
        showNotice("The passwords do not match.");
        return;
    }

    if (!passwordIsAcceptable(password)) {
        showNotice("Please improve the password using the requirements shown.");
        return;
    }

    if (demoAccounts.has(email)) {
        showNotice("An account with this email already exists in this session.");
        return;
    }

    // Deliberately memory-only. Never use this as real authentication.
    demoAccounts.set(email, { name, password });

    $("login-email").value = email;
    $("login-password").value = "";
    $("register-password").value = "";
    $("confirm-password").value = "";

    setAuthMode("login");
    showNotice("Demo account created. Sign in to continue.", true);
});

$("login").addEventListener("submit", event => {
    event.preventDefault();

    const email = $("login-email").value.trim().toLowerCase();
    const password = $("login-password").value;
    const account = demoAccounts.get(email);

    if (!account || account.password !== password) {
        showNotice("Demo account not found or password is incorrect. Register first in this session.");
        return;
    }

    currentUser = { name: account.name, email };
    $("login-password").value = "";
    analyzedCount = 0;
    generatedCount = 0;
    updateStats();
    showWorkspace();
});

function showWorkspace() {
    authView.classList.add("hidden");
    workspace.classList.remove("hidden");

    $("profile-name").textContent = currentUser.name;
    $("avatar").textContent = currentUser.name.charAt(0).toUpperCase();
    $("welcome-title").textContent = `Welcome back, ${currentUser.name}!`;

    openPage("dashboard");
}

function openPage(page) {
    if (!pages.includes(page)) return;

    currentPage = page;

    document.querySelectorAll(".page-panel").forEach(panel => {
        panel.classList.toggle("hidden", panel.id !== page);
    });

    document.querySelectorAll(".nav-item[data-page]").forEach(button => {
        button.classList.toggle("active", button.dataset.page === page);
    });

    const headings = {
        dashboard: "Dashboard",
        analyzer: "Password Analyzer",
        generator: "Password Generator"
    };

    $("page-heading").textContent = headings[page];
}

document.querySelectorAll("[data-page]").forEach(button => {
    button.addEventListener("click", () => {
        if (!currentUser) return;
        openPage(button.dataset.page);
    });
});

$("brand-home").addEventListener("click", event => {
    event.preventDefault();
    if (currentUser) openPage("dashboard");
});

$("logout").addEventListener("click", () => {
    currentUser = null;
    $("password").value = "";
    $("generated-password").value = "";
    showAuth("login");
});

function updateStats() {
    $("analyzed-count").textContent = analyzedCount;
    $("checks-count").textContent = lastPassedChecks;
    $("generated-count").textContent = generatedCount;
}

// Password strength analysis

const rules = {
    length: p => p.length >= 12,
    upper: p => /[A-Z]/.test(p),
    lower: p => /[a-z]/.test(p),
    number: p => /[0-9]/.test(p),
    symbol: p => /[^A-Za-z0-9]/.test(p)
};

let lastAnalyzedPassword = null;
let lastPassedChecks = 0;

function updateRule(id, passed, label) {
    const el = $(id);
    el.textContent = (passed ? "✓ " : "○ ") + label;
    el.classList.toggle("valid", passed);
}

function detectPatterns(password) {
    const p = password.toLowerCase();
    const patterns = [
        "123456", "12345678", "password",
        "qwerty", "admin", "letmein",
        "welcome", "iloveyou", "abc123",
        "0000", "1111"
    ];

    return {
        common: patterns.some(pattern => p.includes(pattern)),
        repeated: /(.)\1{3,}/i.test(password),
        sequence: /(?:0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef|qwer|asdf)/i.test(password)
    };
}

function passwordIsAcceptable(password) {
    const checks = Object.values(rules).filter(rule => rule(password)).length;
    const patterns = detectPatterns(password);
    return checks === 5 &&
        !patterns.common &&
        !patterns.repeated &&
        !patterns.sequence;
}

function analyzePassword() {
    const password = $("password").value;
    const feedback = $("message");
    const warning = $("security-warning");

    if (password !== lastAnalyzedPassword && password.length > 0) {
        analyzedCount++;
        lastAnalyzedPassword = password;
    }

    const results = {
        length: rules.length(password),
        upper: rules.upper(password),
        lower: rules.lower(password),
        number: rules.number(password),
        symbol: rules.symbol(password)
    };

    updateRule("length", results.length, "At least 12 characters");
    updateRule("upper", results.upper, "An uppercase letter");
    updateRule("lower", results.lower, "A lowercase letter");
    updateRule("number", results.number, "A number");
    updateRule("symbol", results.symbol, "A special character");

    const score = Object.values(results).filter(Boolean).length;
    lastPassedChecks = score;
    $("rule-count").textContent = `${score}/5`;

    const patterns = detectPatterns(password);

    let label = "Not checked";
    let color = "#dc5555";
    let advice = "Enter a sample password to begin.";

    if (password) {
        if (patterns.common || patterns.repeated || patterns.sequence) {
            label = "Weak pattern detected";
            color = "#dc5555";
            advice = "Avoid common words, repeated characters, and predictable sequences.";
        } else if (score <= 2) {
            label = "Weak";
            color = "#dc5555";
            advice = "Use a longer password and meet more requirements.";
        } else if (score <= 4) {
            label = "Medium";
            color = "#d89a22";
            advice = "Meet the remaining requirements and avoid predictable patterns.";
        } else {
            label = "Strong by basic rules";
            color = "#1b9e70";
            advice = "All five checks passed. This is not a guarantee of security.";
        }
    }

    $("strength").textContent = label;
    $("strength").style.color = color;
    $("meter-fill").style.width = `${score * 20}%`;
    $("meter-fill").style.background = color;
    feedback.textContent = advice;

    const suggestions = [];
    if (password && !results.length) suggestions.push("Use at least 12 characters");
    if (password && !results.upper) suggestions.push("Add an uppercase letter");
    if (password && !results.lower) suggestions.push("Add a lowercase letter");
    if (password && !results.number) suggestions.push("Add a number");
    if (password && !results.symbol) suggestions.push("Add a symbol");
    if (patterns.common) suggestions.push("Avoid common password words or sequences");
    if (patterns.repeated) suggestions.push("Avoid four or more repeated characters");
    if (patterns.sequence) suggestions.push("Avoid predictable sequences");

    warning.textContent = !password
        ? "Your analysis will appear here."
        : suggestions.length
            ? "Suggestions: " + suggestions.join("; ") + "."
            : "Basic checks passed. Avoid password reuse and consider a password manager.";

    updateStats();
}

$("password").addEventListener("input", analyzePassword);

$("toggle-password").addEventListener("click", () => {
    const input = $("password");
    const hidden = input.type === "password";
    input.type = hidden ? "text" : "password";
    $("toggle-password").textContent = hidden ? "Hide" : "Show";
});

// Registration password feedback

$("register-password").addEventListener("input", () => {
    const password = $("register-password").value;
    const checks = Object.values(rules).filter(rule => rule(password)).length;
    const patterns = detectPatterns(password);

    $("register-meter").style.width = `${checks * 20}%`;
    $("register-meter").style.background =
        passwordIsAcceptable(password) ? "#1b9e70" :
        checks >= 3 && !patterns.common && !patterns.repeated && !patterns.sequence
            ? "#d89a22" : "#dc5555";

    $("register-hint").textContent = !password
        ? "Use 12+ characters and a mix of character types."
        : passwordIsAcceptable(password)
            ? "Meets this demo's basic requirements."
            : "Improve length and character variety; avoid common patterns.";
});

// Password generator

const charSets = {
    upper: "ABCDEFGHJKLMNPQRSTUVWXYZ",
    lower: "abcdefghijkmnopqrstuvwxyz",
    number: "23456789",
    symbol: "!@#$%^&*_-+="
};

function secureIndex(max) {
    // Unbiased random integer from 0 to max-1 using Web Crypto.
    const limit = Math.floor(0x100000000 / max) * max;
    const values = new Uint32Array(1);
    let value;

    do {
        crypto.getRandomValues(values);
        value = values[0];
    } while (value >= limit);

    return value % max;
}

function randomChar(characters) {
    return characters[secureIndex(characters.length)];
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = secureIndex(i + 1);
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function generatePassword() {
    const length = Number($("password-length").value);
    $("length-value").textContent = length;

    const selected = [];

    if ($("opt-upper").checked) selected.push(charSets.upper);
    if ($("opt-lower").checked) selected.push(charSets.lower);
    if ($("opt-number").checked) selected.push(charSets.number);
    if ($("opt-symbol").checked) selected.push(charSets.symbol);

    if (!selected.length) {
        $("generator-message").textContent = "Select at least one character type.";
        return;
    }

    if (!window.crypto || !crypto.getRandomValues) {
        $("generator-message").textContent =
            "Secure random generation is unavailable. Open this app in a modern browser.";
        return;
    }

    if (length < selected.length) {
        $("generator-message").textContent =
            "Increase the length to fit each selected character type.";
        return;
    }

    // Guarantee at least one character from every selected set.
    const characters = selected.map(set => randomChar(set));

    const allCharacters = selected.join("");

    while (characters.length < length) {
        characters.push(randomChar(allCharacters));
    }

    const password = shuffle(characters).join("");

    $("generated-password").value = password;
    $("generated-password").type = "text";
    $("reveal-generated").textContent = "Hide";
    $("generator-message").textContent =
        "Password generated locally. Copy it only to a trusted destination.";

    generatedCount++;
    updateStats();
}

$("password-length").addEventListener("input", () => {
    $("length-value").textContent = $("password-length").value;
});

$("generate").addEventListener("click", generatePassword);

$("reveal-generated").addEventListener("click", () => {
    const input = $("generated-password");
    const hidden = input.type === "password";
    input.type = hidden ? "text" : "password";
    $("reveal-generated").textContent = hidden ? "Hide" : "Show";
});

$("copy-generated").addEventListener("click", async () => {
    const password = $("generated-password").value;

    if (!password) {
        $("generator-message").textContent = "Generate a password first.";
        return;
    }

    try {
        await navigator.clipboard.writeText(password);
        $("generator-message").textContent =
            "Password copied. Keep it private.";
    } catch {
        $("generator-message").textContent =
            "Clipboard access was blocked. Try localhost or a secure browser context.";
    }
});

// Theme toggle

$("theme-toggle").addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const dark = document.body.classList.contains("dark");

    $("theme-toggle").innerHTML = dark
        ? "☀ <span>Switch appearance</span>"
        : "☾ <span>Switch appearance</span>";
});

// Initial view
showAuth("login");