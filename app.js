/**
 * DINCHARYA CORE SCRIPT
 * Comprehensive Logic for State & Persistence
 */

const KEYS = {
    STATE: "dincharya_pwa_state",
    USER: "dincharya_pwa_user",
    MED: "dincharya_pwa_med",
    STREAK: "dincharya_pwa_streak",
    FLOW: "flow_",
    ENERGY: "energy_",
    REFL: "refl_"
};

const QUOTES = [
    "जो समय की कद्र करता है, समय उसकी कद्र करता है।",
    "हर दिन एक नया अवसर है।",
    "स्वयं पर विश्वास सबसे बड़ी शक्ति है।",
    "अनुशासन स्वतंत्रता की जड़ है।"
];

const ISO_TODAY = new Date().toISOString().split("T")[0];
let activeChart = null;

// Initialize
document.addEventListener("DOMContentLoaded", () => {
    const currentState = localStorage.getItem(KEYS.STATE) || "step_profile";

    if (currentState === "step_profile") {
        toggleOverlay("stepProfile");
    } else if (currentState === "step_medical") {
        toggleOverlay("stepMedical");
    } else {
        runApp();
    }

    attachListeners();
});

function toggleOverlay(id) {
    document.getElementById("onboardingOverlay").classList.remove("hidden");
    document.getElementById("stepProfile").classList.add("hidden");
    document.getElementById("stepMedical").classList.add("hidden");
    document.getElementById(id).classList.remove("hidden");
}

function attachListeners() {
    // Onboarding
    document.getElementById("btnProfileNext").onclick = submitProfile;
    document.getElementById("btnMedicalFinish").onclick = submitMedical;

    // Interaction
    document.getElementById("sliderEnergy").oninput = handleEnergy;
    document.getElementById("areaReflection").oninput = handleReflection;
    document.getElementById("btnAddNewMed").onclick = pushMedValue;

    // Tabs
    document.querySelectorAll(".nav-item").forEach(btn => {
        btn.onclick = (e) => switchTab(e.currentTarget);
    });
}

/** * ONBOARDING
 */

function submitProfile() {
    const profile = {
        name: document.getElementById("nameInput").value.trim(),
        age: document.getElementById("ageInput").value.trim(),
        blood: document.getElementById("bloodInput").value.trim(),
        email: document.getElementById("emailInput").value.trim(),
        photo: ""
    };

    if (!profile.name || !profile.age) return alert("Please fill Name and Age");

    const photoInput = document.getElementById("photoInput").files[0];
    if (photoInput) {
        const reader = new FileReader();
        reader.onload = (e) => {
            profile.photo = e.target.result;
            proceedToMedical(profile);
        };
        reader.readAsDataURL(photoInput);
    } else {
        proceedToMedical(profile);
    }
}

function proceedToMedical(data) {
    localStorage.setItem(KEYS.USER, JSON.stringify(data));
    localStorage.setItem(KEYS.STATE, "step_medical");
    toggleOverlay("stepMedical");
}

function submitMedical() {
    const name = document.getElementById("condNameInput").value.trim();
    const val = document.getElementById("condValueInput").value.trim();

    if (name && val) {
        const med = {
            title: name,
            log: [{ day: ISO_TODAY, val: val }]
        };
        localStorage.setItem(KEYS.MED, JSON.stringify(med));
    }

    localStorage.setItem(KEYS.STATE, "active");
    runApp();
}

/** * MAIN APP
 */

function runApp() {
    document.getElementById("onboardingOverlay").classList.add("hidden");
    document.getElementById("appContainer").classList.remove("hidden");
    document.getElementById("appNav").classList.remove("hidden");

    loadSetup();
    initFlow();
    initHeatmap();
}

function loadSetup() {
    const user = JSON.parse(localStorage.getItem(KEYS.USER)) || {};
    document.getElementById("displayGreeting").textContent = `Good Day, ${user.name || 'User'}`;
    document.getElementById("displayAvatar").src = user.photo || "";
    document.getElementById("displayDate").textContent = new Date().toDateString();
    
    const dayQ = new Date().getDate() % QUOTES.length;
    document.getElementById("quoteText").textContent = QUOTES[dayQ];

    const streak = JSON.parse(localStorage.getItem(KEYS.STREAK)) || { count: 0 };
    document.getElementById("valStreak").textContent = streak.count;

    // Restore Energy/Reflection
    const eng = localStorage.getItem(KEYS.ENERGY + ISO_TODAY) || 50;
    document.getElementById("sliderEnergy").value = eng;
    document.getElementById("labelEnergy").textContent = `${eng}%`;

    document.getElementById("areaReflection").value = localStorage.getItem(KEYS.REFL + ISO_TODAY) || "";
}

function initFlow() {
    const saved = JSON.parse(localStorage.getItem(KEYS.FLOW + ISO_TODAY)) || [];
    const boxes = document.querySelectorAll(".flow-box");

    boxes.forEach(box => {
        if (saved.includes(box.dataset.idx)) box.classList.add("active-done");
        box.onclick = () => {
            box.classList.toggle("active-done");
            saveFlow();
        };
    });
    calcPct(saved.length);
}

function saveFlow() {
    const done = [...document.querySelectorAll(".flow-box.active-done")].map(b => b.dataset.idx);
    localStorage.setItem(KEYS.FLOW + ISO_TODAY, JSON.stringify(done));
    calcPct(done.length);
}

function calcPct(count) {
    const p = Math.round((count / 5) * 100);
    document.getElementById("pctComplete").textContent = `${p}%`;
    
    let s = JSON.parse(localStorage.getItem(KEYS.STREAK)) || { count: 0, last: "" };
    if (p >= 80 && s.last !== ISO_TODAY) {
        s.count++;
        s.last = ISO_TODAY;
        localStorage.setItem(KEYS.STREAK, JSON.stringify(s));
        document.getElementById("valStreak").textContent = s.count;
    }
}

function handleEnergy() {
    const v = document.getElementById("sliderEnergy").value;
    document.getElementById("labelEnergy").textContent = `${v}%`;
    localStorage.setItem(KEYS.ENERGY + ISO_TODAY, v);
}

function handleReflection() {
    localStorage.setItem(KEYS.REFL + ISO_TODAY, document.getElementById("areaReflection").value);
}

/** * TAB LOGIC
 */

function switchTab(btn) {
    const target = btn.dataset.tab;
    document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
    document.querySelectorAll(".app-tab").forEach(t => t.classList.add("hidden"));

    btn.classList.add("active");
    document.getElementById(target).classList.remove("hidden");

    if (target === "tabMedical") renderMedChart();
    if (target === "tabCalendar") initHeatmap();
}

function renderMedChart() {
    const data = JSON.parse(localStorage.getItem(KEYS.MED));
    if (!data) return;

    document.getElementById("medNameLabel").textContent = data.title;
    document.getElementById("medLatestLabel").textContent = `Latest: ${data.log[0].val}`;

    const ctx = document.getElementById("healthChart").getContext("2d");
    const history = [...data.log].reverse();

    if (activeChart) activeChart.destroy();
    activeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: history.map(h => h.day),
            datasets: [{
                data: history.map(h => parseFloat(h.val) || 0),
                borderColor: '#4cc9f0',
                tension: 0.4,
                fill: false
            }]
        },
        options: { plugins: { legend: { display: false } }, scales: { y: { grid: { color: '#222' } }, x: { grid: { display: false } } } }
    });
}

function pushMedValue() {
    const v = document.getElementById("inputNewMedVal").value;
    if (!v) return;

    let med = JSON.parse(localStorage.getItem(KEYS.MED));
    med.log.unshift({ day: new Date().toLocaleDateString(), val: v });
    localStorage.setItem(KEYS.MED, JSON.stringify(med));
    
    document.getElementById("inputNewMedVal").value = "";
    renderMedChart();
}

function initHeatmap() {
    const grid = document.getElementById("heatmapGrid");
    grid.innerHTML = "";
    for (let i = 27; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        const count = (JSON.parse(localStorage.getItem(KEYS.FLOW + key)) || []).length;
        const cell = document.createElement("div");
        cell.style.height = "40px"; cell.style.borderRadius = "6px";
        cell.style.background = count >= 4 ? "#4cc9f0" : count >= 1 ? "#1a3a4a" : "#111";
        grid.appendChild(cell);
    }
}