import { formatFullKRW, safe, safeNum, COLORS } from './utils.js';
import { openModal, formField, formRow, showToast } from './modal.js';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const EXPENSE_CATEGORIES = [
  '부모님 용돈', '인터넷 요금', '통신 요금', '보험료', '모임 회비',
  '해피빈 기부금', '전기 요금', '도시가스 요금', '아파트 관리비',
  '식비', '간식비', '구독료', '교통비', '의류비', '의료비',
  '경조사비', '생필품 구매', '리디북스 충전', '동행복권 충전', '현금 출금',
  '게임 타이틀 구매', '온라인 게임 과금', '미디어 컨텐츠 구매', '개인 용돈', '기타'
];

const FIXED_CATS = ['부모님 용돈', '인터넷 요금', '통신 요금', '보험료', '모임 회비', '해피빈 기부금', '전기 요금', '도시가스 요금', '아파트 관리비'];
const PERSONAL_CATS = ['게임 타이틀 구매', '온라인 게임 과금', '미디어 컨텐츠 구매', '개인 용돈'];

function categorize(cat) {
  if (FIXED_CATS.includes(cat)) return '고정비';
  if (PERSONAL_CATS.includes(cat)) return '개인 용돈';
  return '변동비';
}

export function renderSpending(container, data, store) {
  const items = store.getExpenses();
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.substring(0, 7);

  // Group by category type
  const groups = { '고정비': 0, '변동비': 0, '개인 용돈': 0 };
  const catAmounts = {};
  items.forEach(item => {
    const amt = Math.abs(item.amount);
    const grp = categorize(item.category);
    groups[grp] += amt;
    catAmounts[item.category] = (catAmounts[item.category] || 0) + amt;
  });
  const totalSpending = Object.values(groups).reduce((a, b) => a + b, 0);

  // Monthly spending by period
  const monthlyMap = {};
  items.forEach(item => {
    const p = item.period || 'unknown';
    monthlyMap[p] = (monthlyMap[p] || 0) + Math.abs(item.amount);
  });
  const sortedMonths = Object.keys(monthlyMap).sort().slice(-12);

  const openAddModal = (existing = null) => {
    openModal(existing ? '지출 수정' : '지출 추가', `
      ${formRow(
      formField('date', '지출 일자', 'date', { required: true, value: existing?.date || today }),
      formField('period', '기록 년월', 'month', { required: true, value: existing?.period || thisMonth })
    )}
      ${formField('category', '지출 항목', 'select', { required: true, value: existing?.category || '', selectOptions: EXPENSE_CATEGORIES })}
      ${formField('amount', '지출 금액 (원, 양수로 입력)', 'number', { required: true, value: existing ? Math.abs(existing.amount) : '', placeholder: '50000', step: '1' })}
      ${formRow(
      formField('account', '지출 계좌 (직접 입력 가능)', 'text', {
        value: existing?.account || '',
        placeholder: '계좌 또는 카드명 입력',
        list: 'account-suggestions',
        listData: ['농협은행 계좌', '기업은행 계좌', '카카오 페이', '네이버 페이', '토스 페이', 'NH증권 계좌', '현금', '국민카드', '신한카드', '삼성카드', '기타']
      }),
      formField('status', '정산 여부', 'select', { value: existing?.status || '기록 완료', selectOptions: ['기록 완료', '기록 대기', '고정 지출 대기'] })
    )}
      ${formField('detail', '상세 내용', 'textarea', { value: existing?.detail || '', placeholder: '지출에 대한 상세 내용' })}
    `, (formData) => {
      const payload = {
        date: formData.date,
        period: formData.period,
        category: formData.category,
        amount: -Math.abs(Number(formData.amount)),
        account: formData.account,
        status: formData.status,
        detail: formData.detail
      };

      if (existing) {
        store.updateExpense(existing.id, payload);
        showToast('지출이 수정되었습니다');
      } else {
        store.addExpense(payload);
        showToast('지출이 추가되었습니다');
      }
      window.__refreshSection('spending');
    });
  };

  const deleteItem = (id) => {
    store.deleteExpense(id);
    showToast('지출이 삭제되었습니다');
    window.__refreshSection('spending');
  };

  const groupData = [
    { name: '고정비', amount: groups['고정비'], color: COLORS[0] },
    { name: '변동비', amount: groups['변동비'], color: COLORS[1] },
    { name: '개인 용돈', amount: groups['개인 용돈'], color: COLORS[2] },
  ];

  container.innerHTML = `
    <div class="section-header-row">
      <div>
        <h1 class="section-title">지출 관리</h1>
        <p class="section-subtitle">월별 지출 항목과 상세 내역을 관리하세요</p>
      </div>
      <button class="btn-add" id="btn-add-expense">+ 지출 추가</button>
    </div>

    <div class="stats-row animate-in animate-delay-1">
      <div class="metric-card">
        <div class="metric-label">총 지출</div>
        <div class="metric-value">${formatFullKRW(totalSpending)}</div>
      </div>
      ${groupData.map(g => `
        <div class="metric-card">
          <div class="metric-label">${g.name}</div>
          <div class="metric-value">${formatFullKRW(g.amount)}</div>
          <div class="metric-sub neutral">${totalSpending ? ((g.amount / totalSpending) * 100).toFixed(1) : 0}%</div>
        </div>
      `).join('')}
    </div>

    <div class="summary-grid animate-in animate-delay-2">
      <div class="card">
        <div class="card-title">📊 지출 구성</div>
        <div class="donut-wrapper">
          <div class="donut-chart-container"><canvas id="spending-donut-2"></canvas></div>
          <div class="donut-legend">
            ${groupData.map((g, i) => `
              <div class="donut-legend-item">
                <div class="donut-legend-left"><div class="donut-legend-color" style="background:${g.color}"></div><span class="donut-legend-name">${g.name}</span></div>
                <span class="donut-legend-value">${formatFullKRW(g.amount)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-title">📈 월간 지출 추이</div>
        <div class="chart-container"><canvas id="spending-trend-2"></canvas></div>
      </div>
    </div>

    <div class="card animate-in animate-delay-3">
      <div class="card-header-row">
        <span class="card-title" style="margin-bottom:0">📝 지출 상세 내역 (${items.length}건)</span>
      </div>
      ${items.length === 0 ? '<div class="empty-state"><div class="empty-state-icon">📭</div><p class="empty-state-text">지출 내역이 없습니다</p></div>' : `
      <div class="table-wrapper" style="max-height:500px;overflow-y:auto">
        <table class="data-table">
          <thead><tr><th>일자</th><th>항목</th><th class="text-right">금액</th><th>계좌</th><th>상세 내용</th><th></th></tr></thead>
          <tbody>
            ${items.slice(0, 50).map(item => `
              <tr>
                <td>${item.date || '-'}</td>
                <td><span class="badge badge-neutral">${item.category}</span></td>
                <td class="text-right" style="font-weight:600;color:var(--color-positive)">${formatFullKRW(Math.abs(item.amount))}</td>
                <td style="color:var(--color-text-tertiary)">${item.account || '-'}</td>
                <td style="max-width:250px;overflow:hidden;text-overflow:ellipsis">${item.detail || '-'}</td>
                <td>
                  <div style="display:flex;gap:4px">
                    <button class="btn-delete" data-edit-expense="${item.id}" title="수정" style="color:var(--color-text-secondary)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                    <button class="btn-delete" data-delete-expense="${item.id}" title="삭제"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`}
    </div>
  `;

  container.querySelector('#btn-add-expense').addEventListener('click', () => openAddModal());
  container.querySelectorAll('[data-edit-expense]').forEach(btn => {
    btn.addEventListener('click', () => openAddModal(items.find(i => i.id === Number(btn.dataset.editExpense))));
  });
  container.querySelectorAll('[data-delete-expense]').forEach(btn => {
    btn.addEventListener('click', () => deleteItem(Number(btn.dataset.deleteExpense)));
  });

  // Charts
  if (totalSpending > 0) {
    new Chart(document.getElementById('spending-donut-2').getContext('2d'), {
      type: 'doughnut',
      data: { labels: groupData.map(g => g.name), datasets: [{ data: groupData.map(g => g.amount), backgroundColor: groupData.map(g => g.color), borderWidth: 0, borderRadius: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { display: false } } }
    });
  }
  if (sortedMonths.length > 0) {
    new Chart(document.getElementById('spending-trend-2').getContext('2d'), {
      type: 'line',
      data: { labels: sortedMonths, datasets: [{ label: '월간 지출', data: sortedMonths.map(m => monthlyMap[m] || 0), borderColor: '#e17055', backgroundColor: 'rgba(225,112,85,0.08)', fill: true, tension: 0.4, borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: '#e17055' }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: '#f0f2f4' }, ticks: { callback: v => formatFullKRW(v) } } } }
    });
  }
}
