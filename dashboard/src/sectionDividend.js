import { formatFullKRW, formatDate, formatPercent, getChangeClass, safe, safeNum, COLORS } from './utils.js';
import { openModal, formField, formRow, showToast, confirmDialog } from './modal.js';
import { icons } from './icons.js';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

export function renderDividend(container, data, store) {
  const items = store.getDividends();
  const today = new Date().toISOString().split('T')[0];

  // Calculate stats from store data
  const monthlyMap = {};
  const annualMap = {};
  let totalSum = 0;

  items.forEach(d => {
    const amt = d.netAmount;
    totalSum += amt;

    // Monthly
    const m = d.payDate ? d.payDate.substring(0, 7) : 'unknown';
    monthlyMap[m] = (monthlyMap[m] || 0) + amt;

    // Annual
    const y = d.payDate ? d.payDate.substring(0, 4) : 'unknown';
    annualMap[y] = (annualMap[y] || 0) + amt;
  });

  const sortedMonths = Object.keys(monthlyMap).sort();
  const sortedYears = Object.keys(annualMap).sort().reverse();

  const openAddModal = (existing = null) => {
    openModal(existing ? '배당금 기록 수정' : '배당금 기록 추가', `
      ${formRow(
      formField('payDate', '지급 일자', 'date', { required: true, value: existing?.payDate || today }),
      formField('exDate', '배당락일', 'date', { value: existing?.exDate || today })
    )}
      ${formRow(
      formField('name', '종목 이름', 'text', { required: true, value: existing?.name || '', placeholder: 'SCHD' }),
      formField('ticker', '티커', 'text', { value: existing?.ticker || '', placeholder: 'SCHD' })
    )}
      ${formRow(
      formField('account', '계좌 구분', 'select', { value: existing?.account || '', selectOptions: ['연저펀1', '연저펀2', 'IRP', 'ISA 중개형', '일반 국내', '일반 해외'] }),
      formField('qty', '보유 수량', 'number', { required: true, value: existing?.qty || '', placeholder: '100', step: '0.0001' })
    )}
      ${formRow(
      formField('grossAmount', '배당 총액 ($/₩)', 'number', { required: true, value: existing?.grossAmount || '', placeholder: '100.0', step: '0.01' }),
      formField('netAmount', '실수령액 (원환산)', 'number', { required: true, value: existing?.netAmount || '', placeholder: '140000', step: '1' })
    )}
      ${formField('perShare', '주당 배당금', 'number', { value: existing?.perShare || '', placeholder: '0.75', step: '0.0001' })}
    `, (formData) => {
      const payload = {
        payDate: formData.payDate,
        exDate: formData.exDate,
        account: formData.account,
        name: formData.name,
        ticker: formData.ticker,
        qty: Number(formData.qty),
        grossAmount: Number(formData.grossAmount),
        netAmount: Number(formData.netAmount),
        perShare: Number(formData.perShare || 0)
      };
      if (existing) {
        store.updateDividend(existing.id, payload);
        showToast('배당 기록이 수정되었습니다');
      } else {
        store.addDividend(payload);
        showToast('배당 기록이 추가되었습니다');
      }
      window.__refreshSection('dividend');
    });
  };

  const deleteItem = async (id) => {
    const ok = await confirmDialog('이 배당 기록을 삭제하시겠습니까?', { confirmText: '삭제', danger: true });
    if (!ok) return;
    store.deleteDividend(id);
    showToast('배당 기록이 삭제되었습니다');
    window.__refreshSection('dividend');
  };

  container.innerHTML = `
    <div class="section-header-row">
      <div>
        <h1 class="section-title">배당 기록</h1>
        <p class="section-subtitle">배당금 수입 현황 및 분석</p>
      </div>
      <button class="btn-add" id="btn-add-dividend">+ 배당 추가</button>
    </div>

    <div class="stats-row animate-in animate-delay-1">
      <div class="metric-card">
        <div class="metric-label">총 누적 배당금</div>
        <div class="metric-value">${formatFullKRW(totalSum)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">올해 배당금 (${new Date().getFullYear()}년)</div>
        <div class="metric-value">${formatFullKRW(annualMap[new Date().getFullYear()] || 0)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">최근 월 배당금</div>
        <div class="metric-value">${formatFullKRW(monthlyMap[sortedMonths[sortedMonths.length - 1]] || 0)}</div>
      </div>
    </div>

    <div class="summary-grid animate-in animate-delay-2">
      <div class="card">
        <div class="card-title">${icons.barChart()} 월간 배당금 추이</div>
        <div class="chart-container"><canvas id="dividend-chart-2"></canvas></div>
      </div>
      <div class="card">
        <div class="card-title">📅 연도별 합계</div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr><th>연도</th><th class="text-right">합계</th></tr></thead>
            <tbody>
              ${sortedYears.map(y => `
                <tr><td style="font-weight:600">${y}년</td><td class="text-right" style="font-weight:600">${formatFullKRW(annualMap[y])}</td></tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="card animate-in animate-delay-3">
      <div class="card-header-row">
        <span class="card-title" style="margin-bottom:0">📝 배당 상세 내역 (${items.length}건)</span>
      </div>
      ${items.length === 0 ? '<div class="empty-state"><div class="empty-state-icon">📭</div><p class="empty-state-text">기록된 배당금이 없습니다</p></div>' : `
      <div class="table-wrapper" style="max-height:500px;overflow-y:auto">
        <table class="data-table">
          <thead><tr><th>지급일</th><th>종목</th><th>계좌</th><th class="text-right">수량</th><th class="text-right">배당총액</th><th class="text-right">실수령액</th><th></th></tr></thead>
          <tbody>
            ${[...items].sort((a, b) => b.payDate.localeCompare(a.payDate)).map(d => `
              <tr>
                <td>${d.payDate || '-'}</td>
                <td style="font-weight:600">${d.name || '-'}</td>
                <td><span class="badge badge-neutral">${d.account || '-'}</span></td>
                <td class="text-right">${d.qty || 0}</td>
                <td class="text-right">${d.grossAmount || 0}</td>
                <td class="text-right" style="font-weight:600;color:var(--color-primary)">${formatFullKRW(d.netAmount)}</td>
                <td><div style="display:flex;gap:4px"><button class="btn-delete" data-edit-div="${d.id}" title="수정" style="color:var(--color-text-secondary)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button><button class="btn-delete" data-delete-div="${d.id}" title="삭제"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button></div></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`}
    </div>
  `;

  container.querySelector('#btn-add-dividend').addEventListener('click', () => openAddModal());
  container.querySelectorAll('[data-edit-div]').forEach(btn => {
    btn.addEventListener('click', () => openAddModal(items.find(d => d.id === Number(btn.dataset.editDiv))));
  });
  container.querySelectorAll('[data-delete-div]').forEach(btn => {
    btn.addEventListener('click', () => deleteItem(Number(btn.dataset.deleteDiv)));
  });

  // Chart
  const monthsForChart = sortedMonths.slice(-12);
  if (monthsForChart.length > 0) {
    const ctx = document.getElementById('dividend-chart-2').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: monthsForChart,
        datasets: [{ label: '월간 배당금', data: monthsForChart.map(m => monthlyMap[m] || 0), backgroundColor: 'rgba(49,130,246,0.6)', borderRadius: 6 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          y: { grid: { color: '#f0f2f4' }, ticks: { callback: v => formatFullKRW(v) } }
        }
      }
    });
  }
}
