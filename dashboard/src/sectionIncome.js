import { formatFullKRW, formatFullDate, safe, safeNum } from './utils.js';
import { openModal, formField, formRow, showToast, confirmDialog } from './modal.js';
import { icons } from './icons.js';

export function renderIncome(container, data, store) {
  const items = store.getIncomes();
  const totalIncome = items.reduce((sum, item) => sum + item.amount, 0);

  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.substring(0, 7);

  const openAddModal = (existing = null) => {
    openModal(existing ? '수입 수정' : '수입 추가', `
      ${formRow(
      formField('date', '수입 일자', 'date', { required: true, value: existing?.date || today }),
      formField('period', '기록 년월', 'month', { required: true, value: existing?.period || thisMonth })
    )}
      ${formField('category', '수입 항목', 'select', { required: true, value: existing?.category || '', selectOptions: ['회사 급여', '상여금 & 기타 수당', '투자 수익', '프리랜서 수입', '기타 수입'] })}
      ${formField('amount', '수입 금액 (원)', 'number', { required: true, value: existing?.amount || '', placeholder: '3000000', step: '1' })}
      ${formField('detail', '상세 내용', 'textarea', { value: existing?.detail || '', placeholder: '수입에 대한 상세 내용을 입력하세요' })}
    `, (formData) => {
      const payload = {
        date: formData.date,
        period: formData.period,
        category: formData.category,
        amount: Number(formData.amount),
        detail: formData.detail
      };
      if (existing) {
        store.updateIncome(existing.id, payload);
        showToast('수입이 수정되었습니다');
      } else {
        store.addIncome(payload);
        showToast('수입이 추가되었습니다');
      }
      window.__refreshSection('income');
    });
  };

  const deleteItem = async (id) => {
    const ok = await confirmDialog('이 수입 내역을 삭제하시겠습니까?', { confirmText: '삭제', danger: true });
    if (!ok) return;
    store.deleteIncome(id);
    showToast('수입이 삭제되었습니다');
    window.__refreshSection('income');
  };

  container.innerHTML = `
    <div class="section-header-row">
      <div>
        <h1 class="section-title">수입 내역</h1>
        <p class="section-subtitle">급여 및 기타 수입 상세 내역</p>
      </div>
      <button class="btn-add" id="btn-add-income">+ 수입 추가</button>
    </div>

    <div class="stats-row animate-in animate-delay-1">
      <div class="metric-card">
        <div class="metric-label">총 수입 기록</div>
        <div class="metric-value">${formatFullKRW(totalIncome)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">수입 건수</div>
        <div class="metric-value">${items.length}건</div>
      </div>
    </div>

    <div class="card animate-in animate-delay-2">
      <div class="card-header-row">
        <span class="card-title" style="margin-bottom:0">${icons.clipboard()} 수입 상세 내역</span>
      </div>
      ${items.length === 0 ? `<div class="empty-state"><div class="empty-state-icon">${icons.inbox(32)}</div><p class="empty-state-text">수입 내역이 없습니다</p><p class="text-xs neutral mt-lg">위의 "수입 추가" 버튼을 눌러 수입을 기록하세요</p></div>` : `
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>수입 일자</th>
              <th>기록 년월</th>
              <th>수입 항목</th>
              <th class="text-right">수입 금액</th>
              <th>상세 내용</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td>${item.date || '-'}</td>
                <td>${item.period || '-'}</td>
                <td><span class="badge badge-success">${item.category || '-'}</span></td>
                <td class="text-right" style="font-weight:700;color:var(--color-success)">${formatFullKRW(item.amount)}</td>
                <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis">${item.detail || '-'}</td>
                <td>
                  <div style="display:flex;gap:4px">
                    <button class="btn-delete" data-edit-income="${item.id}" title="수정" style="color:var(--color-text-secondary)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                    <button class="btn-delete" data-delete-income="${item.id}" title="삭제">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`}
    </div>
  `;

  container.querySelector('#btn-add-income').addEventListener('click', () => openAddModal());
  container.querySelectorAll('[data-edit-income]').forEach(btn => {
    btn.addEventListener('click', () => openAddModal(items.find(i => i.id === Number(btn.dataset.editIncome))));
  });
  container.querySelectorAll('[data-delete-income]').forEach(btn => {
    btn.addEventListener('click', () => deleteItem(Number(btn.dataset.deleteIncome)));
  });
}
