import './style.css';
import { loadExcelData } from './src/dataLoader.js';
import { store } from './src/store.js';
import { renderSummary } from './src/sectionSummary.js';
import { renderPortfolio } from './src/sectionPortfolio.js';
import { renderTrading } from './src/sectionTrading.js';
import { renderDividend } from './src/sectionDividend.js';
import { renderSpending } from './src/sectionSpending.js';
import { renderIncome } from './src/sectionIncome.js';
import { renderForecast } from './src/sectionForecast.js';
import { renderMarket } from './src/sectionMarket.js';
import { renderData } from './src/sectionData.js';
import { onAuth, loginWithGoogle, logout } from './src/auth.js';

let excelData = null;
let isGuest = false;

const sectionRenderers = {
    summary: renderSummary,
    portfolio: renderPortfolio,
    trading: renderTrading,
    dividend: renderDividend,
    spending: renderSpending,
    income: renderIncome,
    forecast: renderForecast,
    market: renderMarket,
    data: renderData,
};

// Track which sections need re-render
const renderedSections = new Set();

export function refreshSection(sectionId) {
    renderedSections.delete(sectionId);
    const container = document.getElementById(`section-${sectionId}`);
    if (container && container.classList.contains('active')) {
        renderSection(sectionId);
    }
}

function renderSection(sectionId) {
    const container = document.getElementById(`section-${sectionId}`);
    const renderer = sectionRenderers[sectionId];
    if (!container || !renderer) return;

    try {
        renderer(container, excelData, store);
        renderedSections.add(sectionId);
    } catch (e) {
        console.error(`Error rendering ${sectionId}:`, e);
        container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><p class="empty-state-text">렌더링 오류</p><p class="text-xs neutral mt-lg">${e.message}</p></div>`;
    }
}

function switchSection(sectionId) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === sectionId);
    });
    document.querySelectorAll('.section').forEach(section => {
        section.classList.toggle('active', section.id === `section-${sectionId}`);
    });
    if (!renderedSections.has(sectionId)) {
        renderSection(sectionId);
    }
}

// Navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => switchSection(item.dataset.section));
});

// Show app, hide login
function showApp(user) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = '';

    const userInfo = document.getElementById('user-info');
    if (user && !isGuest) {
        userInfo.style.display = 'flex';
        document.getElementById('user-avatar').src = user.photoURL || '';
        document.getElementById('user-name').textContent = user.displayName || user.email || '';
    } else {
        userInfo.style.display = 'none';
    }
}

// Show login, hide app
function showLogin() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
}

// Initialize dashboard
async function initDashboard(user) {
    const loadingScreen = document.getElementById('loading-screen');
    loadingScreen.classList.remove('hidden');

    try {
        excelData = await loadExcelData();

        const hasStoredData = store.load();
        if (!hasStoredData || !store.isInitialized()) {
            store.seedFromExcel(excelData);
        }

        // Cloud sync: if logged in, try loading from Firestore
        if (user && !isGuest) {
            store.setUser(user.uid);
            const cloudLoaded = await store.loadFromCloud();
            if (cloudLoaded) {
                console.log('☁️ 클라우드에서 데이터 동기화 완료');
            } else {
                // Push local data to cloud for the first time
                await store.pushToCloud();
                console.log('☁️ 로컬 데이터를 클라우드에 업로드');
            }
        }

        const now = new Date();
        document.getElementById('update-time').textContent =
            `마지막 업데이트\n${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        renderedSections.clear();
        switchSection('summary');
        loadingScreen.classList.add('hidden');
        setTimeout(() => loadingScreen.remove(), 500);
    } catch (error) {
        console.error('Failed to load data:', error);
        loadingScreen.innerHTML = `
      <div class="loading-spinner">
        <div style="font-size:48px;margin-bottom:16px">⚠️</div>
        <p style="color:var(--color-text-primary);font-weight:600;margin-bottom:8px">데이터 로딩 실패</p>
        <p style="color:var(--color-text-tertiary);font-size:13px">${error.message}</p>
      </div>
    `;
    }
}

// Login button handlers
document.getElementById('btn-google-login').addEventListener('click', async () => {
    try {
        await loginWithGoogle();
    } catch (e) {
        console.error('Login failed:', e);
    }
});

document.getElementById('btn-guest').addEventListener('click', () => {
    isGuest = true;
    showApp(null);
    initDashboard(null);
});

// Logout
document.getElementById('btn-logout').addEventListener('click', async () => {
    await logout();
    isGuest = false;
    renderedSections.clear();
    showLogin();
});

// Auth state listener
onAuth((user) => {
    if (user && !isGuest) {
        showApp(user);
        initDashboard(user);
    } else if (!isGuest) {
        showLogin();
    }
});

// Export for section modules to use
window.__refreshSection = refreshSection;

