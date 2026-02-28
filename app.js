/**
 * DINCHARYA - CORE LOGIC
 * Manages State, Persistence, and Dynamic UI
 */

const STORAGE_KEYS = {
    STATE: "dincharya_app_state",
    PROFILE: "dincharya_user_profile",
    MEDICAL: "dincharya_medical_records",
    STREAK: "dincharya_user_streak",
    FLOW_PREFIX: "flow_day_",
    ENERGY_PREFIX: "energy_day_",
    REFLECTION_PREFIX: "reflection_day_"
};

const QUOTES = [
    "जो समय की कद्र करता है, समय उसकी कद्र करता है।",
    "हर दिन एक नया अवसर है।",
    "स्वयं पर विश्वास सबसे बड़ी शक्ति है।",
    "अनुशासन स्वतंत्रता की जड़ है।",
    "सफलता का रहस्य निरंतरता है।"
];

const TODAY_DATE_STR = new Date().toISOString().split("T")[0];
let healthChartInstance = null;

// Initialization
document.addEventListener("DOMContentLoaded", () => {
    checkAppState();
    setupEventListeners();
});

function checkAppState() {
    const currentState = localStorage.getItem(STORAGE_KEYS.STATE) || "onboarding_profile";

    if (currentState === "onboarding_profile") {
        renderOnboardingStep("stepProfile");
    } else if (currentState === "onboarding_medical") {
        renderOnboardingStep("stepMedical");
    } else {
        launchMainApp();
    }
}

function renderOnboardingStep(stepId) {
    document.getElementById("onboardingOverlay").classList.remove("hidden");
    document.getElementById("stepProfile").classList.add("hidden");
    document.getElementById("stepMedical").classList.add("hidden");
    document.getElementById(stepId).classList.remove("hidden");
}

function setupEventListeners() {
    // Onboarding Buttons
    document.getElementById("btnProfileNext").addEventListener("click", handleProfileSubmission);
    document.getElementById("btnMedicalFinish").addEventListener("click", handleMedicalSubmission);

    // Dashboard Interactivity
    document.getElementById("energySlider").addEventListener("input", updateEnergyDisplay);
    document.getElementById("reflectionTextArea").addEventListener("input", saveReflection);
    
    // Medical Tab
    document.getElementById("btnAddReading").addEventListener("click", addNewReading);

    // Navigation
    document.querySelectorAll(".nav-item").forEach(btn => {
        btn.addEventListener("click", (e) => switchTab(e.currentTarget));
    });
}

/** * ONBOARDING LOGIC
 */

function handleProfileSubmission() {
    const profileData = {
        name: document.getElementById("nameInput").value.trim(),
        age: document.getElementById("ageInput").value.trim(),
        blood: document.getElementById("bloodInput").value.trim(),
        email: document.getElementById("emailInput").value.trim(),
        photo: ""
    };

    if (!profileData.name || !profileData.age) {
        alert("Please provide at least your name and age.");
        return;
    }

    const photoFile = document.getElementById("photoInput").files[0];
    if (photoFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
            profileData.photo = e.target.result;
            saveAndMoveToMedical(profileData);
        };
        reader.readAsDataURL(photoFile);
    } else {
        saveAndMoveToMedical(profileData);
    }
}

function saveAndMoveToMedical(data) {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(data));
    localStorage.setItem(STORAGE_KEYS.STATE, "onboarding_medical");
    renderOnboardingStep("stepMedical");
}

function handleMedicalSubmission() {
    const medName = document.getElementById("conditionNameInput").value.trim();
    const medVal = document.getElementById("conditionValueInput").value.trim();

    if (medName && medVal) {
        const medRecord = {
            name: medName,
            history: [{ date: TODAY_DATE_STR, value: medVal }]
        };
        localStorage.setItem(STORAGE_KEYS.MEDICAL, JSON.stringify(medRecord));
    }

    localStorage.setItem(STORAGE_KEYS.STATE, "main_app");
    launchMainApp();
}

/** * MAIN APP INITIALIZATION
 */

function launchMainApp() {
    document.getElementById("onboardingOverlay").classList.add("hidden");
    document.getElementById("mainApp").classList.remove("hidden");
    document.getElementById("bottomNavigationBar").classList.remove("hidden");

    loadUserData();
    loadDailyQuote();
    initializeDayFlow();
    initializeEnergyAndReflection();
    updateOverallCompletion();
    renderHeatmap();
}

function loadUserData() {
    const profile = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROFILE)) || {};
    document.getElementById("userGreeting").textContent = `Good Day, ${profile.name || 'User'}`;
    document.getElementById("userProfileImage").src = profile.photo || "";
    document.getElementById("currentDateDisplay").textContent = new Date().toDateString();
    
    const streak = JSON.parse(localStorage.getItem(STORAGE_KEYS.STREAK)) || { count: 0 };
    document.getElementById("streakCount").textContent = streak.count;
}

function loadDailyQuote() {
    const dayIndex = new Date().getDate() % QUOTES.length;
    document.getElementById("dailyQuoteText").textContent = QUOTES[dayIndex];
}

/** * DASHBOARD FEATURES
 */

function initializeDayFlow() {
    const flowData = JSON.parse(localStorage.getItem(STORAGE_KEYS.FLOW_PREFIX + TODAY_DATE_STR)) || [];
    const flowItems = document.querySelectorAll(".flow-item");

    flowItems.forEach(item => {
        const idx = item.dataset.index;
        if (flowData.includes(idx)) item.classList.add("completed");

        item.onclick = () => {
            item.classList.toggle("completed");
            saveDayFlow();
        };
    });
}

function saveDayFlow() {
    const completedIndices = [];
    document.querySelectorAll(".flow-item.completed").forEach(item => {
        completedIndices.push(item.dataset.index);
    });

    localStorage.setItem(STORAGE_KEYS.FLOW_PREFIX + TODAY_DATE_STR, JSON.stringify(completedIndices));
    updateOverallCompletion();
}

function updateOverallCompletion() {
    const totalItems = 5;
    const completedCount = document.querySelectorAll(".flow-item.completed").length;
    const percentage = Math.round((completedCount / totalItems) * 100);
    
    document.getElementById("completionPercent").textContent = `${percentage}%`;
    handleStreakUpdate(percentage);
}

function handleStreakUpdate(pct) {
    let streak = JSON.parse(localStorage.getItem(STORAGE_KEYS.STREAK)) || { count: 0, lastDate: "" };
    
    // Increase streak if 80% completion reached and not already counted today
    if (pct >= 80 && streak.lastDate !== TODAY_DATE_STR) {
        streak.count++;
        streak.lastDate = TODAY_DATE_STR;
        localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(streak));
        document.getElementById("streakCount").textContent = streak.count;
    }
}

function initializeEnergyAndReflection() {
    const energy = localStorage.getItem(STORAGE_KEYS.ENERGY_PREFIX + TODAY_DATE_STR) || 50;
    const slider = document.getElementById("energySlider");
    slider.value = energy;
    document.getElementById("energyValueText").textContent = `${energy}%`;

    const reflection = localStorage.getItem(STORAGE_KEYS.REFLECTION_PREFIX + TODAY_DATE_STR) || "";
    document.getElementById("reflectionTextArea").value = reflection;
}

function updateEnergyDisplay() {
    const val = document.getElementById("energySlider").value;
    document.getElementById("energyValueText").textContent = `${val}%`;
    localStorage.setItem(STORAGE_KEYS.ENERGY_PREFIX + TODAY_DATE_STR, val);
}

function saveReflection() {
    const text = document.getElementById("reflectionTextArea").value;
    localStorage.setItem(STORAGE_KEYS.REFLECTION_PREFIX + TODAY_DATE_STR, text);
}

/** * MEDICAL TAB LOGIC
 */

function renderMedicalTab() {
    const medData = JSON.parse(localStorage.getItem(STORAGE_KEYS.MEDICAL));
    const nameDisplay = document.getElementById("activeConditionName");
    const latestDisplay = document.getElementById("activeConditionLatest");

    if (!medData) {
        nameDisplay.textContent = "No data tracked";
        latestDisplay.textContent = "Complete onboarding to start.";
        return;
    }

    nameDisplay.textContent = medData.name;
    latestDisplay.textContent = `Latest: ${medData.history[0].value}`;

    initOrUpdateChart(medData);
}

function initOrUpdateChart(data) {
    const ctx = document.getElementById("healthHistoryChart").getContext("2d");
    
    // Sort history by date for chart (oldest to newest)
    const sortedHistory = [...data.history].reverse();
    const labels = sortedHistory.map(h => h.date);
    const values = sortedHistory.map(h => parseFloat(h.value) || 0);

    if (healthChartInstance) healthChartInstance.destroy();

    healthChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: data.name,
                data: values,
                borderColor: '#4cc9f0',
                backgroundColor: 'rgba(76, 201, 240, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: '#222' }, ticks: { color: '#888' } },
                x: { grid: { display: false }, ticks: { color: '#888' } }
            }
        }
    });
}

function addNewReading() {
    const input = document.getElementById("newReadingInput");
    const val = input.value.trim();
    if (!val) return;

    let medData = JSON.parse(localStorage.getItem(STORAGE_KEYS.MEDICAL));
    if (!medData) return;

    // Add to start of array (newest first)
    medData.history.unshift({ date: new Date().toLocaleDateString(), value: val });
    localStorage.setItem(STORAGE_KEYS.MEDICAL, JSON.stringify(medData));
    
    input.value = "";
    renderMedicalTab();
}

/** * CONSISTENCY TAB LOGIC
 */

function renderHeatmap() {
    const grid = document.getElementById("heatmapGrid");
    grid.innerHTML = "";

    // Generate last 28 days
    for (let i = 27; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateKey = d.toISOString().split("T")[0];
        
        const completions = JSON.parse(localStorage.getItem(STORAGE_KEYS.FLOW_PREFIX + dateKey)) || [];
        const count = completions.length;

        const cell = document.createElement("div");
        cell.style.height = "40px";
        cell.style.borderRadius = "6px";
        
        // Intensity levels
        if (count >= 4) cell.style.background = "#4cc9f0";
        else if (count >= 1) cell.style.background = "#1a3a4a";
        else cell.style.background = "#111";

        grid.appendChild(cell);
    }
}

/** * NAVIGATION LOGIC
 */

function switchTab(clickedBtn) {
    const targetTabId = clickedBtn.dataset.target;

    // Update Nav UI
    document.querySelectorAll(".nav-item").forEach(btn => btn.classList.remove("active"));
    clickedBtn.classList.add("active");

    // Update Content UI
    document.querySelectorAll(".content-tab").forEach(tab => tab.classList.add("hidden"));
    document.getElementById(targetTabId).classList.remove("hidden");

    // Trigger tab-specific renders
    if (targetTabId === "tabMedical") renderMedicalTab();
    if (targetTabId === "tabCalendar") renderHeatmap();
}