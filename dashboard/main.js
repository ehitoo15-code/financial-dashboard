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

let excelData = null;

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
        // Pass both store and excelData for sections that still use raw excel
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

// Initialize
async function init() {
    const loadingScreen = document.getElementById('loading-screen');

    try {
        excelData = await loadExcelData();

        // Check if we have stored data
        const hasStoredData = store.load();
        if (!hasStoredData || !store.isInitialized()) {
            store.seedFromExcel(excelData);
        }

        const now = new Date();
        document.getElementById('update-time').textContent =
            `마지막 업데이트\n${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

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

// Export for section modules to use
window.__refreshSection = refreshSection;

init();
