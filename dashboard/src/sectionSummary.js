import { formatKRW, formatFullKRW, formatPercent, getChangeClass, COLORS } from './utils.js';
import { openModal, formField, formRow, showToast, confirmDialog } from './modal.js';
import { icons } from './icons.js';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

export function renderSummary(container, data, store) {
  const months = store.getSummaryMonths();
  const latest = months.length > 0 ? months[months.length - 1] : null;
  const prev = months.length > 1 ? months[months.length - 2] : null;

  const totalAsset = latest ? latest.totalAssets : 0;
  const prevAsset = prev ? prev.totalAssets : 0;
  const assetChange = totalAsset - prevAsset;
  const assetChangeRate = prevAsset ? assetChange / prevAsset : 0;

  const investTotal = latest ? latest.investTotal : 0;
  const cashTotal = latest ? latest.cashTotal : 0;
  const pensionTotal = latest ? latest.pensionTotal : 0;
  const monthlyReturn = latest ? latest.monthlyReturn : 0;
  const cumReturn = latest ? latest.cumReturn : 0;
  const monthlyGrowth = latest ? latest.monthlyGrowth : 0;
  const cumGrowth = latest ? latest.cumGrowth : 0;

  const thisMonth = new Date().toISOString().substring(0, 7);

  // --- Modal Logic (Simplified: only yearMonth + cashTotal) ---
  const openAddModal = (existing = null) => {
    const fmtPreview = (v) => v ? formatFullKRW(v) : '-';
    const fmtPctPreview = (v) => v ? formatPercent(v) : '-';

    openModal(existing ? '월간 자산 데이터 수정' : '이번 달 마감', `
      <div style="background:var(--color-bg-secondary); padding:16px; border-radius:12px; margin-bottom:16px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <span style="font-size:18px">📊</span>
          <span class="text-sm font-medium">현금성 자산 잔액만 입력하면 나머지는 자동 계산됩니다</span>
        </div>
        <p style="font-size:11px;color:var(--color-text-tertiary);margin:0">
          투자 합계 = 보유 종목 평가금 합계 (연금 제외)&nbsp;|&nbsp;연금 = 연저펀·IRP 종목 합계&nbsp;|&nbsp;수입/지출 = 기록된 내역 합산
        </p>
      </div>
      ${formField('yearMonth', '기록 년월', 'month', { required: true, value: existing?.yearMonth || thisMonth })}
      ${formField('cashTotal', '현금성 자산 잔액 (원)', 'number', { required: true, value: existing?.cashTotal || '', placeholder: '은행 입출금 계좌 총 잔액', step: '1' })}

      <div id="preview-section" style="margin-top:16px;border:1px solid var(--color-border-light);border-radius:12px;padding:16px;background:var(--color-surface-secondary)">
        <div style="font-weight:600;font-size:13px;margin-bottom:12px;color:var(--color-text-secondary)">🔄 자동 계산 미리보기</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">
          <div style="display:flex;justify-content:space-between;padding:6px 8px;background:var(--color-bg-secondary);border-radius:8px">
            <span style="color:var(--color-text-tertiary)">투자 합계</span>
            <span id="pv-invest" style="font-weight:600">-</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:6px 8px;background:var(--color-bg-secondary);border-radius:8px">
            <span style="color:var(--color-text-tertiary)">연금 합계</span>
            <span id="pv-pension" style="font-weight:600">-</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:6px 8px;background:var(--color-bg-secondary);border-radius:8px">
            <span style="color:var(--color-text-tertiary)">수입 합계</span>
            <span id="pv-income" style="font-weight:600;color:var(--color-success)">-</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:6px 8px;background:var(--color-bg-secondary);border-radius:8px">
            <span style="color:var(--color-text-tertiary)">저축 금액</span>
            <span id="pv-savings" style="font-weight:600">-</span>
          </div>
          <div style="grid-column:span 2;display:flex;justify-content:space-between;padding:8px 10px;background:var(--color-primary);border-radius:8px;color:#fff">
            <span style="font-weight:500">총 자산</span>
            <span id="pv-total" style="font-weight:700;font-size:14px">-</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:6px 8px;background:var(--color-bg-secondary);border-radius:8px">
            <span style="color:var(--color-text-tertiary)">월간 수익률</span>
            <span id="pv-return" style="font-weight:600">-</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:6px 8px;background:var(--color-bg-secondary);border-radius:8px">
            <span style="color:var(--color-text-tertiary)">저축률</span>
            <span id="pv-savrate" style="font-weight:600">-</span>
          </div>
        </div>
      </div>
    `, (formData) => {
      const ym = formData.yearMonth;
      const cash = Number(formData.cashTotal || 0);
      store.closeMonth(ym, cash);
      showToast(existing ? '월간 데이터가 수정되었습니다' : '이번 달 마감이 완료되었습니다');
      window.__refreshSection('summary');
    });

    const modal = document.querySelector('.modal');
    if (!modal) return;

    const runPreview = () => {
      const ym = modal.querySelector('#field-yearMonth').value;
      const cash = Number(modal.querySelector('#field-cashTotal').value || 0);
      if (!ym) return;

      const computed = store.computeMonthSummary(ym, cash);
      const pv = (id, val) => { const el = modal.querySelector(id); if (el) el.textContent = val; };
      pv('#pv-invest', fmtPreview(computed.investTotal));
      pv('#pv-pension', fmtPreview(computed.pensionTotal));
      pv('#pv-income', fmtPreview(computed.income));
      pv('#pv-savings', fmtPreview(computed.savings));
      pv('#pv-total', fmtPreview(computed.totalAssets));
      pv('#pv-return', fmtPctPreview(computed.monthlyReturn));
      pv('#pv-savrate', fmtPctPreview(computed.savingsRate));
    };

    ['yearMonth', 'cashTotal'].forEach(name => {
      const input = modal.querySelector(`#field-${name}`);
      if (input) {
        input.addEventListener('input', runPreview);
        input.addEventListener('change', runPreview);
      }
    });
    setTimeout(() => runPreview(), 100);
  };

  const deleteMonth = async (id) => {
    const ok = await confirmDialog('이 월간 데이터를 삭제하시겠습니까?', { confirmText: '삭제', danger: true });
    if (!ok) return;
    store.deleteSummaryMonth(id);
    showToast('월간 데이터가 삭제되었습니다');
    window.__refreshSection('summary');
  };

  // --- Calculate Strategic Metrics ---
  const expenses = store.getExpenses();
  const dividends = store.getDividends();

  const perfHistory = months.map((m, i) => {
    if (i === 0) return 0;
    const prevM = months[i - 1];
    return (m.totalAssets - prevM.totalAssets) - m.savings;
  });

  // Monthly dividend map
  const divMap = {};
  dividends.forEach(d => {
    const ym = d.payDate ? d.payDate.substring(0, 7) : 'unknown';
    divMap[ym] = (divMap[ym] || 0) + d.netAmount;
  });

  const assetHistory = months.map(m => m.totalAssets);
  const assetLabels = months.map(m => m.yearMonth);

  // Helper to format months as years+months
  const fmtDuration = (m) => {
    if (m === null || m === undefined) return '-';
    if (m === 0) return '✅ 달성';
    const y = Math.floor(m / 12);
    const mo = m % 12;
    return y > 0 ? `${y}년 ${mo}개월` : `${mo}개월`;
  };

  // --- Build auto-calc HTML for any given month index ---
  const buildAutoCalcHTML = (selIdx) => {
    const sel = months[selIdx];
    const selPrev = selIdx > 0 ? months[selIdx - 1] : null;
    const selYM = sel.yearMonth;

    // Asset breakdown
    const selTotal = sel.totalAssets;
    const selCash = sel.cashTotal;
    const selPension = sel.pensionTotal;
    const selInvest = sel.investTotal;

    // Income breakdown for selected month
    const selSalary = store.getIncomeByCategoryForMonth(selYM, '회사 급여');
    const selBonus = store.getIncomeByCategoryForMonth(selYM, '상여금 & 기타 수당');
    const selOtherIncome = store.getIncomeExcludingCategoriesForMonth(selYM, ['회사 급여', '상여금 & 기타 수당']);
    const selExpense = store.getMonthlyExpenseTotal(selYM);
    const selSavings = sel.savings || 0;
    const selSavingsRate = sel.savingsRate || 0;
    const selIncome = sel.income || 0;

    // Monthly performance
    const selAssetGrowth = selPrev ? selTotal - selPrev.totalAssets : 0;
    const selNetProfit = selPrev ? (selTotal - selPrev.totalAssets) - selSavings : 0;
    const selMonthlyReturn = sel.monthlyReturn || 0;

    // 12-month lookback from selected month
    const startIdx12 = Math.max(0, selIdx - 11);
    const slice12 = months.slice(startIdx12, selIdx + 1);
    const slice12YMs = slice12.map(m => m.yearMonth);
    const n12 = Math.min(selIdx, 12) || 1;

    // Avg monthly expense (12m from selected)
    const recentExp = expenses.filter(e => slice12YMs.includes(e.period));
    const avgExp12 = recentExp.length > 0
      ? recentExp.reduce((s, e) => s + Math.abs(e.amount), 0) / slice12.length
      : (slice12.reduce((s, m) => s + (m.income - m.savings), 0) / slice12.length) || 3500000;

    // Perf history for this slice
    const perfSlice = perfHistory.slice(startIdx12, selIdx + 1);
    const avgPerf = perfSlice.reduce((a, b) => a + b, 0) / n12;

    // 4% rule
    const passive4pct = (selTotal * 0.04) / 12;

    // Avg dividend (12m from selected)
    const avgDivSel = slice12YMs.map(ym => divMap[ym] || 0).reduce((a, b) => a + b, 0) / slice12.length;

    // Avg income (12m)
    const avgInc12 = slice12.reduce((s, m) => s + (m.income || 0), 0) / slice12.length || 0;

    // Annual return (compounded monthly returns in 12m window)
    const returns12 = slice12.map(m => m.monthlyReturn || 0);
    const annualReturnEx = returns12.reduce((prod, r) => prod * (1 + r), 1) - 1;

    // Annual perf (including savings)
    const first12m = months[startIdx12];
    const annualPerfIncl = first12m && first12m.totalAssets > 0
      ? (selTotal - first12m.totalAssets) / first12m.totalAssets : 0;

    // Cumulative
    const selCumReturn = sel.cumReturn || 0;
    const selCumGrowth = sel.cumGrowth || 0;
    const cumAssetG = months[0] && months[0].totalAssets > 0
      ? (selTotal - months[0].totalAssets) / months[0].totalAssets : 0;

    // Goal estimates
    const growthRate = selPrev && selPrev.totalAssets > 0
      ? (selTotal - selPrev.totalAssets) / selPrev.totalAssets : 0;

    const g1Target = avgExp12 * 12 / 0.04;
    const g1Est = growthRate > 0 && selTotal < g1Target
      ? Math.ceil(Math.log(g1Target / selTotal) / Math.log(1 + growthRate))
      : (selTotal >= g1Target ? 0 : null);

    const g2Target = avgInc12 * 12 / 0.04;
    const g2Est = growthRate > 0 && selTotal < g2Target
      ? Math.ceil(Math.log(g2Target / selTotal) / Math.log(1 + growthRate))
      : (selTotal >= g2Target ? 0 : null);

    const burnExp = avgExp12 > 0 ? Math.floor(selTotal / avgExp12) : null;
    const burnInc = avgInc12 > 0 ? Math.floor(selTotal / avgInc12) : null;

    // Goal progress percentages
    const g1Progress = g1Target > 0 ? Math.min((selTotal / g1Target) * 100, 100) : 0;
    const g2Progress = g2Target > 0 ? Math.min((selTotal / g2Target) * 100, 100) : 0;
    const savingsRateVal = selSavingsRate ? selSavingsRate * 100 : (selIncome > 0 ? (selSavings / selIncome) * 100 : 0);

    // Helper: muted class for zero values
    const muted = (v) => v === 0 ? ' ac-muted' : '';
    const fmtValOrEmpty = (v) => v === 0 ? '<span class="ac-empty-hint">미입력</span>' : formatFullKRW(v);

    return `
      <!-- Card 1: 자산 -->
      <div class="card ac-card">
        <div class="ac-card-header">
          <span class="ac-card-icon" style="background:rgba(49,130,246,0.1);color:#3182f6">${icons.wallet()}</span>
          <span class="ac-card-title">자산 현황</span>
        </div>
        <div class="ac-kpi-hero">
          <div class="ac-kpi-amount">${formatFullKRW(selTotal)}</div>
          <div class="ac-kpi-badge ${getChangeClass(selAssetGrowth)}">
            ${selAssetGrowth >= 0 ? '▲' : '▼'} ${formatFullKRW(Math.abs(selAssetGrowth))}
          </div>
        </div>
        <div class="ac-breakdown">
          <div class="ac-breakdown-item">
            <div class="ac-breakdown-dot" style="background:#3182f6"></div>
            <span class="ac-breakdown-label">입출금 계좌</span>
            <span class="ac-breakdown-value${muted(selCash)}">${formatFullKRW(selCash)}</span>
          </div>
          <div class="ac-breakdown-item">
            <div class="ac-breakdown-dot" style="background:#6c5ce7"></div>
            <span class="ac-breakdown-label">연금 저축 & IRP</span>
            <span class="ac-breakdown-value${muted(selPension)}">${formatFullKRW(selPension)}</span>
          </div>
          <div class="ac-breakdown-item">
            <div class="ac-breakdown-dot" style="background:#00b894"></div>
            <span class="ac-breakdown-label">ISA & 일반</span>
            <span class="ac-breakdown-value${muted(selInvest)}">${formatFullKRW(selInvest)}</span>
          </div>
        </div>
        ${selTotal > 0 ? `<div class="ac-bar-stack">
          <div class="ac-bar-seg" style="width:${selTotal > 0 ? (selCash / selTotal * 100).toFixed(1) : 0}%;background:#3182f6" title="입출금"></div>
          <div class="ac-bar-seg" style="width:${selTotal > 0 ? (selPension / selTotal * 100).toFixed(1) : 0}%;background:#6c5ce7" title="연금"></div>
          <div class="ac-bar-seg" style="width:${selTotal > 0 ? (selInvest / selTotal * 100).toFixed(1) : 0}%;background:#00b894" title="ISA"></div>
        </div>` : ''}
      </div>

      <!-- Card 2: 투자자금 -->
      <div class="card ac-card">
        <div class="ac-card-header">
          <span class="ac-card-icon" style="background:rgba(0,184,148,0.1);color:#00b894">${icons.chartPie()}</span>
          <span class="ac-card-title">투자자금 흐름</span>
        </div>
        <div class="ac-kpi-hero">
          <div class="ac-kpi-label">저축 금액</div>
          <div class="ac-kpi-amount ${getChangeClass(selSavings)}">${formatFullKRW(selSavings)}</div>
        </div>
        <!-- Savings rate progress -->
        <div class="ac-progress-wrap">
          <div class="ac-progress-header">
            <span class="ac-progress-label">저축률</span>
            <span class="ac-progress-pct">${savingsRateVal.toFixed(1)}%</span>
          </div>
          <div class="ac-progress-track">
            <div class="ac-progress-fill" style="width:${Math.min(savingsRateVal, 100)}%;background:linear-gradient(90deg,#3182f6,#00b894)"></div>
          </div>
        </div>
        <div class="ac-divider-thin"></div>
        <div class="ac-flow-grid">
          <div class="ac-flow-section">
            <div class="ac-flow-title positive">수입</div>
            <div class="ac-flow-item">
              <span>회사 급여</span>
              <span class="${selSalary ? 'positive' : 'ac-muted'}">${selSalary ? formatFullKRW(selSalary) : fmtValOrEmpty(0)}</span>
            </div>
            <div class="ac-flow-item">
              <span>상여금 & 기타</span>
              <span class="${selBonus ? 'positive' : 'ac-muted'}">${selBonus ? formatFullKRW(selBonus) : fmtValOrEmpty(0)}</span>
            </div>
            <div class="ac-flow-item">
              <span>기타 수입</span>
              <span class="${selOtherIncome ? 'positive' : 'ac-muted'}">${selOtherIncome ? formatFullKRW(selOtherIncome) : fmtValOrEmpty(0)}</span>
            </div>
          </div>
          <div class="ac-flow-section">
            <div class="ac-flow-title negative">지출</div>
            <div class="ac-flow-item">
              <span>생활비</span>
              <span class="${selExpense ? 'negative' : 'ac-muted'}">${selExpense ? '-' + formatFullKRW(selExpense) : fmtValOrEmpty(0)}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Card 3: 수익 성과 -->
      <div class="card ac-card">
        <div class="ac-card-header">
          <span class="ac-card-icon" style="background:rgba(108,92,231,0.1);color:#6c5ce7">${icons.chartLine()}</span>
          <span class="ac-card-title">수익 성과</span>
        </div>
        <div class="ac-kpi-row-3">
          <div class="ac-kpi-mini">
            <div class="ac-kpi-mini-label">순 수익금</div>
            <div class="ac-kpi-mini-value ${getChangeClass(selNetProfit)}">${formatFullKRW(selNetProfit)}</div>
          </div>
          <div class="ac-kpi-mini">
            <div class="ac-kpi-mini-label">자산 변동</div>
            <div class="ac-kpi-mini-value ${getChangeClass(selAssetGrowth)}">${formatFullKRW(selAssetGrowth)}</div>
          </div>
          <div class="ac-kpi-mini">
            <div class="ac-kpi-mini-label">수익률</div>
            <div class="ac-kpi-mini-value ${getChangeClass(selMonthlyReturn)}">${formatPercent(selMonthlyReturn)}</div>
          </div>
        </div>
        <div class="ac-divider-thin"></div>
        <div class="ac-section-title">실적 비교 <span class="ac-badge-sm">12개월 평균</span></div>
        <div class="ac-compare-grid">
          <div class="ac-compare-item">
            <div class="ac-compare-label">순수익금 평균</div>
            <div class="ac-compare-value ${getChangeClass(avgPerf)}">${formatFullKRW(avgPerf)}</div>
            <div class="ac-compare-sub">실적 1</div>
          </div>
          <div class="ac-compare-item">
            <div class="ac-compare-label">4% 룰 배당</div>
            <div class="ac-compare-value positive">${formatFullKRW(passive4pct)}</div>
            <div class="ac-compare-sub">실적 2</div>
          </div>
          <div class="ac-compare-item">
            <div class="ac-compare-label">배당금 평균</div>
            <div class="ac-compare-value${muted(avgDivSel)}">${avgDivSel ? formatFullKRW(avgDivSel) : fmtValOrEmpty(0)}</div>
            <div class="ac-compare-sub">실적 3</div>
          </div>
        </div>
        <div class="ac-divider-thin"></div>
        <div class="ac-target-row">
          <div class="ac-target-item"><span class="ac-target-label">1차 목표 (생활비)</span><span class="ac-target-value">${formatFullKRW(avgExp12)}</span></div>
          <div class="ac-target-item"><span class="ac-target-label">2차 목표 (급여)</span><span class="ac-target-value">${formatFullKRW(avgInc12)}</span></div>
        </div>
      </div>

      <!-- Card 4: 수익률 -->
      <div class="card ac-card">
        <div class="ac-card-header">
          <span class="ac-card-icon" style="background:rgba(253,121,168,0.1);color:#fd79a8">${icons.barChart()}</span>
          <span class="ac-card-title">수익률 현황</span>
        </div>
        <div class="ac-return-grid">
          <div class="ac-return-block">
            <div class="ac-return-period">연간</div>
            <div class="ac-return-pair">
              <div class="ac-return-item">
                <span class="ac-return-label">순 수익률</span>
                <span class="ac-return-value ${getChangeClass(annualReturnEx)}">${formatPercent(annualReturnEx)}</span>
                <span class="ac-return-desc">저축 제외</span>
              </div>
              <div class="ac-return-item">
                <span class="ac-return-label">투자 성과율</span>
                <span class="ac-return-value ${getChangeClass(annualPerfIncl)}">${formatPercent(annualPerfIncl)}</span>
                <span class="ac-return-desc">저축 포함</span>
              </div>
            </div>
          </div>
          <div class="ac-return-block">
            <div class="ac-return-period">누적</div>
            <div class="ac-return-pair">
              <div class="ac-return-item">
                <span class="ac-return-label">순 수익률</span>
                <span class="ac-return-value ${getChangeClass(selCumReturn)}">${formatPercent(selCumReturn)}</span>
                <span class="ac-return-desc">저축 제외</span>
              </div>
              <div class="ac-return-item">
                <span class="ac-return-label">투자 성과율</span>
                <span class="ac-return-value ${getChangeClass(selCumGrowth)}">${formatPercent(selCumGrowth)}</span>
                <span class="ac-return-desc">저축 포함</span>
              </div>
            </div>
          </div>
        </div>
        <div class="ac-divider-thin"></div>
        <div class="ac-breakdown-item" style="padding:8px 12px;border-radius:8px;background:var(--color-surface-secondary)">
          <span class="ac-breakdown-label" style="font-weight:600">누적 자산 증가율</span>
          <span class="ac-return-value ${getChangeClass(cumAssetG)}" style="font-size:16px">${formatPercent(cumAssetG)}</span>
        </div>
      </div>

      <!-- Card 5: 목표 달성 (Full Width) -->
      <div class="card ac-card ac-card-wide">
        <div class="ac-card-header">
          <span class="ac-card-icon" style="background:rgba(253,203,110,0.15);color:#f39c12">${icons.flag()}</span>
          <span class="ac-card-title">목표 달성 현황</span>
        </div>
        <div class="ac-goals-grid">
          <!-- Goal 1 -->
          <div class="ac-goal-block">
            <div class="ac-goal-header">
              <span class="ac-goal-name">1차 목표</span>
              <span class="ac-goal-desc">생활비 수준의 연금</span>
            </div>
            <div class="ac-goal-kpi">
              <span class="ac-goal-status ${g1Est === 0 ? 'ac-achieved' : ''}">${fmtDuration(g1Est)}</span>
            </div>
            <div class="ac-progress-wrap">
              <div class="ac-progress-header">
                <span class="ac-progress-label">달성률</span>
                <span class="ac-progress-pct">${g1Progress.toFixed(1)}%</span>
              </div>
              <div class="ac-progress-track ac-progress-lg">
                <div class="ac-progress-fill ${g1Est === 0 ? 'ac-progress-done' : ''}" style="width:${g1Progress}%;background:${g1Est === 0 ? '#00b894' : 'linear-gradient(90deg,#3182f6,#6c5ce7)'}"></div>
              </div>
            </div>
            <div class="ac-goal-detail">
              <span>생활비 사용 시 유지 기간</span>
              <span class="fw-700">${burnExp !== null ? fmtDuration(burnExp) : '-'}</span>
            </div>
          </div>
          <!-- Goal 2 -->
          <div class="ac-goal-block">
            <div class="ac-goal-header">
              <span class="ac-goal-name">2차 목표</span>
              <span class="ac-goal-desc">급여 수준의 연금</span>
            </div>
            <div class="ac-goal-kpi">
              <span class="ac-goal-status ${g2Est === 0 ? 'ac-achieved' : ''}">${fmtDuration(g2Est)}</span>
            </div>
            <div class="ac-progress-wrap">
              <div class="ac-progress-header">
                <span class="ac-progress-label">달성률</span>
                <span class="ac-progress-pct">${g2Progress.toFixed(1)}%</span>
              </div>
              <div class="ac-progress-track ac-progress-lg">
                <div class="ac-progress-fill ${g2Est === 0 ? 'ac-progress-done' : ''}" style="width:${g2Progress}%;background:${g2Est === 0 ? '#00b894' : 'linear-gradient(90deg,#f39c12,#fd79a8)'}"></div>
              </div>
            </div>
            <div class="ac-goal-detail">
              <span>급여 사용 시 유지 기간</span>
              <span class="fw-700">${burnInc !== null ? fmtDuration(burnInc) : '-'}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  // Latest month metrics for the stat row (always latest)
  const last12MonthsYM = months.slice(-12).map(m => m.yearMonth);
  const recentExpenses = expenses.filter(e => last12MonthsYM.includes(e.period));
  const avgMonthlyExp = recentExpenses.length > 0
    ? recentExpenses.reduce((s, e) => s + Math.abs(e.amount), 0) / Math.min(months.length, 12)
    : (months.slice(-12).reduce((s, m) => s + (m.income - m.savings), 0) / 12) || 3500000;
  const n12 = Math.min(months.length - 1, 12) || 1;
  const avgPerf12 = perfHistory.slice(-12).reduce((a, b) => a + b, 0) / n12;
  const passiveIncome4pct = (totalAsset * 0.04) / 12;

  // --- Main Rendering ---
  container.innerHTML = `
    <div class="section-header-row">
      <div>
        <h1 class="section-title">자산 요약</h1>
        <p class="section-subtitle">월간 자산 기록 현황과 재무 지표를 확인하세요</p>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <button class="btn-add" id="btn-close-month" style="background:linear-gradient(135deg,#3182f6,#6c5ce7);border:none;color:#fff">⚡ 이번 달 마감</button>
        <button class="btn-add" id="btn-add-summary" style="background:var(--color-bg-secondary);color:var(--color-text-primary);border:1px solid var(--color-border-light)">+ 과거 데이터 추가</button>
      </div>
    </div>

    ${months.length === 0 ? `
      <div class="empty-state">
        <div class="empty-state-icon">${icons.chartPie(32)}</div>
        <p class="empty-state-text">월간 자산 기록이 없습니다. "+ 월간 데이터 추가"를 통해 첫 기록을 시작하세요.</p>
      </div>
    ` : `
    <div class="hero-card animate-in animate-delay-1">
      <div class="hero-label">총 자산</div>
      <div class="hero-amount">${formatFullKRW(totalAsset)}</div>
      <div class="hero-change ${getChangeClass(assetChange)}">
        전월 대비 ${formatFullKRW(Math.abs(assetChange))} ${assetChange >= 0 ? '증가' : '감소'}
        ${prevAsset ? `<span class="badge ${assetChange >= 0 ? 'badge-positive' : 'badge-negative'}" style="margin-left:8px">${formatPercent(assetChangeRate)}</span>` : ''}
      </div>
      <div class="hero-stats">
        <div class="hero-stat"><span class="hero-stat-label">투자 자산</span><span class="hero-stat-value">${formatKRW(investTotal)}</span></div>
        <div class="hero-stat"><span class="hero-stat-label">현금성 자산</span><span class="hero-stat-value">${formatKRW(cashTotal)}</span></div>
        <div class="hero-stat"><span class="hero-stat-label">연금 자산</span><span class="hero-stat-value">${formatKRW(pensionTotal)}</span></div>
        <div class="hero-stat"><span class="hero-stat-label">월간 수익률</span><span class="hero-stat-value ${getChangeClass(monthlyReturn)}">${formatPercent(monthlyReturn)}</span></div>
      </div>
    </div>

    <!-- Month Selector -->
    <div class="month-selector-wrap animate-in animate-delay-2">
      <div class="month-selector-scroll" id="month-selector">
        ${months.map((m, i) => `
          <button class="month-pill${i === months.length - 1 ? ' active' : ''}" data-month-idx="${i}">
            ${m.yearMonth}
          </button>
        `).join('')}
      </div>
    </div>

    <!-- Auto-calc cards container -->
    <div class="auto-calc-grid animate-in animate-delay-2" id="auto-calc-container">
      ${buildAutoCalcHTML(months.length - 1)}
    </div>

    <div class="stats-row animate-in animate-delay-3">
      <div class="metric-card">
        <div class="metric-label">자산 유지 (Burn Rate)</div>
        <div class="metric-value ${avgPerf12 > avgMonthlyExp ? 'positive' : 'neutral'}">${avgPerf12 > avgMonthlyExp ? '영구 유지' : `${Math.floor(totalAsset / (avgMonthlyExp || 1))}개월`}</div>
        <div class="metric-sub">평균 지출 대비 자산 수명</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">가상 배당 (4% Rule)</div>
        <div class="metric-value positive">${formatKRW(passiveIncome4pct)}</div>
        <div class="metric-sub">자산의 4%를 월 생활비로 인출 시</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">평균 자본 수익 (12m)</div>
        <div class="metric-value ${getChangeClass(avgPerf12)}">${formatKRW(avgPerf12)}</div>
        <div class="metric-sub">최근 1년 월 평균 순수익</div>
      </div>
    </div>

    <div class="card mb-2xl animate-in animate-delay-4">
      <div class="card-title">${icons.chartLine()} 자산 추이</div>
      <div class="chart-container"><canvas id="asset-chart-2"></canvas></div>
    </div>

    <div class="card animate-in animate-delay-5">
      <div class="card-header-row">
        <span class="card-title" style="margin-bottom:0">${icons.barChart()} 월별 상세 지표</span>
      </div>
      <div class="table-wrapper" style="max-height:450px;overflow-y:auto">
        <table class="data-table">
          <thead><tr><th>년월</th><th class="text-right">총 소득</th><th class="text-right">총 자산</th><th class="text-right">투자</th><th class="text-right">현금</th><th class="text-right">월간 수익률</th><th class="text-right">누적 수익률</th><th class="text-right">저축액</th><th></th></tr></thead>
          <tbody>
            ${[...months].reverse().map(m => `
              <tr>
                <td style="font-weight:600">${m.yearMonth}</td>
                <td class="text-right" style="color:var(--color-primary);font-weight:500">${m.income ? formatFullKRW(m.income) : '-'}</td>
                <td class="text-right" style="font-weight:600">${formatFullKRW(m.totalAssets)}</td>
                <td class="text-right">${formatFullKRW(m.investTotal)}</td>
                <td class="text-right">${formatFullKRW(m.cashTotal)}</td>
                <td class="text-right"><span class="${getChangeClass(m.monthlyReturn)}">${formatPercent(m.monthlyReturn)}</span></td>
                <td class="text-right"><span class="${getChangeClass(m.cumReturn)}">${formatPercent(m.cumReturn)}</span></td>
                <td class="text-right">${formatKRW(m.savings)}</td>
                <td>
                  <div style="display:flex;gap:4px">
                    <button class="btn-delete" data-recalc-month="${m.id}" title="재계산" style="color:var(--color-primary)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0115.36-6.36L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 01-15.36 6.36L3 16"/></svg></button>
                    <button class="btn-delete" data-edit-month="${m.id}" title="수정" style="color:var(--color-text-secondary)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                    <button class="btn-delete" data-delete-month="${m.id}" title="삭제"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
    `}
  `;

  // Event Listeners
  const btnCloseMonth = container.querySelector('#btn-close-month');
  if (btnCloseMonth) btnCloseMonth.addEventListener('click', () => openAddModal());

  const btnAdd = container.querySelector('#btn-add-summary');
  if (btnAdd) btnAdd.addEventListener('click', () => openAddModal());

  container.querySelectorAll('[data-edit-month]').forEach(btn => {
    btn.addEventListener('click', () => openAddModal(months.find(m => m.id === Number(btn.dataset.editMonth))));
  });
  container.querySelectorAll('[data-recalc-month]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const m = months.find(m => m.id === Number(btn.dataset.recalcMonth));
      if (!m) return;
      const ok = await confirmDialog(`${m.yearMonth} 데이터를 재계산하시겠습니까?\n현금 잔액은 유지하고 수입/지출/투자 데이터를 다시 계산합니다.`, { confirmText: '재계산', danger: false });
      if (!ok) return;
      store.closeMonth(m.yearMonth, m.cashTotal || 0);
      showToast(`${m.yearMonth} 데이터가 재계산되었습니다`);
      window.__refreshSection('summary');
    });
  });
  container.querySelectorAll('[data-delete-month]').forEach(btn => {
    btn.addEventListener('click', () => deleteMonth(Number(btn.dataset.deleteMonth)));
  });

  // Month selector logic
  const monthSelector = container.querySelector('#month-selector');
  if (monthSelector) {
    // Scroll to the end (latest month) on load
    setTimeout(() => { monthSelector.scrollLeft = monthSelector.scrollWidth; }, 50);

    monthSelector.addEventListener('click', (e) => {
      const pill = e.target.closest('.month-pill');
      if (!pill) return;
      const idx = Number(pill.dataset.monthIdx);
      // Update active state
      monthSelector.querySelectorAll('.month-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      // Re-render auto-calc cards
      const calcContainer = container.querySelector('#auto-calc-container');
      if (calcContainer) {
        calcContainer.innerHTML = buildAutoCalcHTML(idx);
      }
    });
  }

  // Asset Chart
  const canvas = document.getElementById('asset-chart-2');
  if (canvas && assetHistory.some(v => v !== 0)) {
    new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels: assetLabels.slice(-12),
        datasets: [{
          label: '총 자산', data: assetHistory.slice(-12),
          borderColor: '#3182f6', backgroundColor: 'rgba(49,130,246,0.08)',
          fill: true, tension: 0.4, borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: '#3182f6'
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: { grid: { color: '#f0f2f4' }, ticks: { font: { size: 11 }, callback: v => formatKRW(v) } }
        }
      }
    });
  }
}

