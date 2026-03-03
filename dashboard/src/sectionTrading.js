import { formatFullKRW, formatPercent, getChangeClass, safe, safeNum } from './utils.js';
import { openModal, formField, formRow, showToast, confirmDialog } from './modal.js';
import { icons } from './icons.js';

export function renderTrading(container, data, store) {
  const trades = store.getTrades();
  const today = new Date().toISOString().split('T')[0];

  const totalProfit = trades.reduce((s, t) => s + (t.profit || 0), 0);
  const totalAmount = trades.reduce((s, t) => s + Math.abs(t.amount || 0), 0);

  const openAddModal = (existing = null) => {
    openModal(existing ? '거래 기록 수정' : '거래 기록 추가', `
      ${formRow(
      formField('date', '결제 일자', 'date', { required: true, value: existing?.date || today }),
      formField('type', '결제 구분', 'select', { required: true, value: existing?.type || '', selectOptions: ['매수', '매도', '원화 결제 주식', '달러 결제 주식'] })
    )}
      ${formRow(
      formField('name', 'ETF/종목 이름', 'text', { required: true, value: existing?.name || '', placeholder: 'TIGER 미국배당다우존스' }),
      formField('ticker', '티커', 'text', { value: existing?.ticker || '', placeholder: '458730' })
    )}
      ${formRow(
      formField('account', '계좌 구분', 'select', { value: existing?.account || '', selectOptions: ['연저펀1', '연저펀2', 'IRP', 'ISA 중개형', '일반 국내', '일반 해외'] }),
      formField('qty', '거래 수량', 'number', { required: true, value: existing?.qty || '', placeholder: '10', step: '0.00000001' })
    )}
      ${formRow(
      formField('amount', '거래 금액 (원)', 'number', { required: true, value: existing?.amount || '', placeholder: '150000', step: '1' }),
      formField('fees', '제비용 (원)', 'number', { value: existing?.fees || '', placeholder: '0', step: '1' })
    )}
      ${formRow(
      formField('profit', '차익 실현 수익금 (원)', 'number', { value: existing?.profit || '', placeholder: '0', step: '1' }),
      formField('profitRate', '차익 실현 수익률 (%)', 'number', { value: existing?.profitRate ? (existing.profitRate * 100).toFixed(2) : '', placeholder: '0', step: '0.01' })
    )}
    `, (formData) => {
      const payload = {
        date: formData.date,
        type: formData.type,
        account: formData.account,
        name: formData.name,
        ticker: formData.ticker,
        qty: Number(formData.qty),
        amount: Number(formData.amount),
        fees: Number(formData.fees || 0),
        profit: Number(formData.profit || 0),
        profitRate: formData.profitRate ? Number(formData.profitRate) / 100 : null
      };
      if (existing) {
        store.updateTrade(existing.id, payload);
        showToast('거래가 수정되었습니다');
      } else {
        store.addTrade(payload);
        showToast('거래가 추가되었습니다');
      }
      window.__refreshSection('trading');
    });
  };

  const deleteItem = async (id) => {
    const ok = await confirmDialog('이 거래 기록을 삭제하시겠습니까?', { confirmText: '삭제', danger: true });
    if (!ok) return;
    store.deleteTrade(id);
    showToast('거래가 삭제되었습니다');
    window.__refreshSection('trading');
  };

  container.innerHTML = `
    <div class="section-header-row">
      <div>
        <h1 class="section-title">거래 기록</h1>
        <p class="section-subtitle">매매 기록 및 차익 실현 현황</p>
      </div>
      <button class="btn-add" id="btn-add-trade">+ 거래 추가</button>
    </div>

    <div class="stats-row animate-in animate-delay-1">
      <div class="metric-card">
        <div class="metric-label">총 거래 건수</div>
        <div class="metric-value">${trades.length}건</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">총 거래 금액</div>
        <div class="metric-value">${formatFullKRW(totalAmount)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">총 차익 실현 수익금</div>
        <div class="metric-value ${getChangeClass(totalProfit)}">${formatFullKRW(totalProfit)}</div>
      </div>
    </div>

    <div class="card animate-in animate-delay-2">
      <div class="card-header-row">
        <span class="card-title" style="margin-bottom:0">${icons.clipboard()} 매수/매도 기록</span>
      </div>
      ${trades.length === 0 ? `<div class="empty-state"><div class="empty-state-icon">${icons.inbox(32)}</div><p class="empty-state-text">거래 기록이 없습니다</p><p class="text-xs neutral mt-lg">"거래 추가" 버튼을 눌러 기록하세요</p></div>` : `
      <div class="table-wrapper" style="max-height:500px;overflow-y:auto">
        <table class="data-table">
          <thead><tr><th>결제일</th><th>구분</th><th>종목</th><th>티커</th><th>계좌</th><th class="text-right">수량</th><th class="text-right">거래금액</th><th class="text-right">차익 수익금</th><th class="text-right">수익률</th><th></th></tr></thead>
          <tbody>
            ${trades.map(t => `
              <tr>
                <td>${t.date || '-'}</td>
                <td><span class="badge ${t.type === '매수' ? 'badge-positive' : t.type === '매도' ? 'badge-negative' : 'badge-neutral'}">${t.type || '-'}</span></td>
                <td style="font-weight:600">${t.name || '-'}</td>
                <td style="color:var(--color-text-tertiary)">${t.ticker || '-'}</td>
                <td>${t.account || '-'}</td>
                <td class="text-right">${t.qty || 0}</td>
                <td class="text-right">${formatFullKRW(t.amount)}</td>
                <td class="text-right ${getChangeClass(t.profit)}">${formatFullKRW(t.profit)}</td>
                <td class="text-right ${t.profitRate !== null ? getChangeClass(t.profitRate) : ''}">${t.profitRate !== null ? formatPercent(t.profitRate) : '-'}</td>
                <td><div style="display:flex;gap:4px"><button class="btn-delete" data-edit-trade="${t.id}" title="수정" style="color:var(--color-text-secondary)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button><button class="btn-delete" data-delete-trade="${t.id}" title="삭제"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button></div></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`}
    </div>
  `;

  container.querySelector('#btn-add-trade').addEventListener('click', () => openAddModal());
  container.querySelectorAll('[data-edit-trade]').forEach(btn => {
    btn.addEventListener('click', () => openAddModal(trades.find(t => t.id === Number(btn.dataset.editTrade))));
  });
  container.querySelectorAll('[data-delete-trade]').forEach(btn => {
    btn.addEventListener('click', () => deleteItem(Number(btn.dataset.deleteTrade)));
  });
}
