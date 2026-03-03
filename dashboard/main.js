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
    item.addEventListener('click', () => {
        switchSection(item.dataset.section);
        // Close mobile sidebar on navigation
        closeMobileSidebar();
    });
});

// Mobile sidebar toggle
function openMobileSidebar() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebar-overlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeMobileSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('active');
    document.body.style.overflow = '';
}

const mobileMenuBtn = document.getElementById('mobile-menu-btn');
if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', openMobileSidebar);
}

const sidebarOverlay = document.getElementById('sidebar-overlay');
if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', closeMobileSidebar);
}

// Auto-close mobile sidebar on desktop resize
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) closeMobileSidebar();
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

// Logout with confirmation modal
document.getElementById('btn-logout').addEventListener('click', () => {
    showLogoutModal();
});

function showLogoutModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'logout-modal-overlay';
    overlay.innerHTML = `
        <div class="logout-modal">
            <div class="logout-modal-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
            </div>
            <h3 class="logout-modal-title">로그아웃</h3>
            <p class="logout-modal-desc">정말 로그아웃 하시겠습니까?<br>클라우드에 저장된 데이터는 유지됩니다.</p>
            <div class="logout-modal-actions">
                <button class="logout-modal-btn cancel" id="logout-cancel">취소</button>
                <button class="logout-modal-btn confirm" id="logout-confirm">로그아웃</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));

    document.getElementById('logout-cancel').addEventListener('click', () => {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 200);
    });
    document.getElementById('logout-confirm').addEventListener('click', async () => {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 200);
        await logout();
        isGuest = false;
        renderedSections.clear();
        showLogin();
    });
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 200);
        }
    });
}

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

