import { formatFullKRW, formatPercent, getChangeClass, safe, safeNum, COLORS } from './utils.js';
import { openModal, formField, formRow, showToast, updateFormField } from './modal.js';
import { searchStocks, fetchCurrentPrice, getExchangeRate } from './stockService.js';
import { icons } from './icons.js';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

export function renderPortfolio(container, data, store) {
  const items = store.getHoldings();

  const totalValue = items.reduce((s, h) => s + (h.evalAmount || h.cost || 0), 0);
  const totalCost = items.reduce((s, h) => s + (h.cost || 0), 0);
  const totalProfit = totalValue - totalCost;
  const returnRate = totalCost ? totalProfit / totalCost : 0;

  const openAddModal = (existing = null) => {
    openModal(existing ? '보유 종목 수정' : '보유 종목 추가', `
      <div id="stock-search-container" style="position:relative">
        ${formField('name', '종목명 (자동완성)', 'text', {
      required: true,
      value: existing?.name || '',
      placeholder: '자세한 종목명을 입력하세요 (예: Apple, 삼성전자)',
      autocomplete: 'off'
    })}
        <div id="stock-autocomplete-results" class="autocomplete-results" style="display:none"></div>
      </div>
      ${formRow(
      formField('ticker', '티커 (종목번호)', 'text', { required: true, value: existing?.ticker || '', placeholder: 'AAPL' }),
      formField('exchange', '거래소', 'select', { required: true, value: existing?.exchange || 'KRX', selectOptions: ['KRX', 'NASDAQ', 'NYSE', 'AMEX', 'KOSDAQ'] })
    )}
      <div style="margin-bottom: var(--space-lg); display: flex; justify-content: flex-end; gap: 8px; align-items: center;">
        <span id="rate-info" style="font-size: 11px; color: var(--color-text-tertiary)"></span>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-fetch-price">⚡ 현재가 불러오기</button>
      </div>
      ${formRow(
      formField('account', '계좌', 'select', { required: true, value: existing?.account || '', selectOptions: ['연저펀1', '연저펀2', 'IRP', 'ISA 중개형', '일반 국내', '일반 해외', '토스증권', '기타'] }),
      formField('group', '분류 그룹', 'select', {
        required: true,
        value: existing?.group || '',
        selectOptions: [
          '지수형 (미국)', '지수형 (국내)', '빅테크/성장주', '미국 배당성장주', '고배당/커버드콜',
          '섹터 배당주', '배당주 모음', '채권/현금성', '개별주 (해외)', '개별주 (국내)',
          '암호화폐', '금/원자재', '기타'
        ]
      })
    )}
      <div class="divider" style="margin: var(--space-lg) 0; height: 1px; background: var(--color-border-light)"></div>
      ${formRow(
      formField('qty', '보유 수량 (최대 소수점 8자리)', 'number', { required: true, value: existing?.qty || '', step: '0.00000001' }),
      formField('avgPrice', '매입 평단가 (원화 기준)', 'number', { required: true, value: existing?.avgPrice || '', step: '0.01' })
    )}
      ${formRow(
      formField('price', '현재가 (원화 기준)', 'number', { required: true, value: existing?.price || '', step: '0.01' }),
      `<div class="form-group" style="display:none">
              <input type="hidden" name="cost" id="field-cost" value="${existing?.cost || 0}">
              <input type="hidden" name="evalAmount" id="field-evalAmount" value="${existing?.evalAmount || 0}">
              <input type="hidden" name="returnPct" id="field-returnPct" value="${existing ? (existing.returnPct * 100).toFixed(2) : 0}">
            </div>`
    )}
      <p style="font-size:12px; color:var(--color-text-tertiary); margin-top: -8px;">
        * 매입금액, 평가금액, 수익률은 입력한 값을 바탕으로 자동 계산되어 저장됩니다.<br/>
        * 해외 종목의 경우 "현재가 불러오기" 클릭 시 실시간 환율이 자동 적용됩니다.
      </p>
    `, async (formData) => {
      const qty = Number(formData.qty);
      const avg = Number(formData.avgPrice);
      const cur = Number(formData.price);
      const cost = qty * avg;
      const evalAmt = qty * cur;
      const retCount = cost > 0 ? (evalAmt - cost) / cost : 0;

      const payload = {
        name: formData.name,
        ticker: formData.ticker,
        exchange: formData.exchange,
        account: formData.account,
        group: formData.group,
        qty: qty,
        avgPrice: avg,
        price: cur,
        cost: cost,
        evalAmount: evalAmt,
        profit: evalAmt - cost,
        returnPct: retCount
      };

      if (existing) {
        store.updateHolding(existing.id, payload);
        showToast('종목 정보가 수정되었습니다');
      } else {
        store.addHolding(payload);
        showToast('종목이 추가되었습니다');
      }
      window.__refreshSection('portfolio');
    });

    // --- Automated Logic in Modal ---
    const modal = document.querySelector('.modal');
    if (!modal) return;

    const nameInput = modal.querySelector('#field-name');
    const tickerInput = modal.querySelector('#field-ticker');
    const exchangeInput = modal.querySelector('#field-exchange');
    const fetchBtn = modal.querySelector('#btn-fetch-price');
    const resultsDiv = modal.querySelector('#stock-autocomplete-results');
    const rateInfo = modal.querySelector('#rate-info');

    // Real-time Autocomplete
    let searchTimeout;
    nameInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const val = e.target.value;
      if (val.length < 2) { resultsDiv.style.display = 'none'; return; }

      searchTimeout = setTimeout(async () => {
        const results = await searchStocks(val);
        if (results.length > 0) {
          resultsDiv.innerHTML = results.map(r => `
            <div class="autocomplete-item" data-ticker="${r.ticker}" data-exch="${r.exchange}" data-name="${r.name}">
              <span class="ac-name">${r.name}</span>
              <span class="ac-ticker">${r.ticker} (${r.exchange})</span>
            </div>
          `).join('');
          resultsDiv.style.display = 'block';

          resultsDiv.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => {
              nameInput.value = item.dataset.name;
              updateFormField('ticker', item.dataset.ticker);
              updateFormField('exchange', item.dataset.exch);
              resultsDiv.style.display = 'none';
              fetchBtn.click();
            });
          });
        } else {
          resultsDiv.style.display = 'none';
        }
      }, 300);
    });

    // Close results on blur
    document.addEventListener('click', (e) => {
      if (!nameInput.contains(e.target) && !resultsDiv.contains(e.target)) {
        resultsDiv.style.display = 'none';
      }
    });

    // Price fetching
    fetchBtn.addEventListener('click', async () => {
      const ticker = tickerInput.value;
      const exch = exchangeInput.value;
      if (!ticker) return;

      fetchBtn.disabled = true;
      fetchBtn.textContent = '⌛...';

      const price = await fetchCurrentPrice(ticker, exch);
      if (price !== null) {
        let finalPrice = price;
        if (exch !== 'KRX' && exch !== 'KOSDAQ') {
          const rate = await getExchangeRate();
          finalPrice = price * rate;
          rateInfo.textContent = `실시간 환율: ₩${rate.toFixed(1)}`;
          showToast(`현재가 $${price.toFixed(2)} 반영 완료`);
        } else {
          showToast(`현재가 ₩${price.toLocaleString()} 반영 완료`);
          rateInfo.textContent = '';
        }
        updateFormField('price', finalPrice);
      }
      fetchBtn.disabled = false;
      fetchBtn.textContent = '⚡ 현재가 불러오기';
    });
  };

  const deleteItem = (id) => {
    store.deleteHolding(id);
    showToast('종목이 삭제되었습니다');
    window.__refreshSection('portfolio');
  };

  // Group processing
  const groups = {};
  items.forEach(h => {
    const gn = h.group || '기타';
    if (!groups[gn]) groups[gn] = { total: 0, cost: 0 };
    groups[gn].total += h.evalAmount || h.cost || 0;
    groups[gn].cost += h.cost || 0;
  });
  const groupNames = Object.keys(groups).sort();
  const groupValues = groupNames.map(gn => groups[gn].total);

  container.innerHTML = `
    <div class="section-header-row">
      <div>
        <h1 class="section-title">주식 계좌 현황</h1>
        <p class="section-subtitle">실시간 포트폴리오 및 보유 종목 현황</p>
      </div>
      <button class="btn-add" id="btn-add-stock">+ 종목 추가</button>
    </div>

    <div class="stats-row animate-in animate-delay-1">
      <div class="metric-card"><div class="metric-label">포트폴리오 평가금</div><div class="metric-value">${formatFullKRW(totalValue)}</div></div>
      <div class="metric-card"><div class="metric-label">포트폴리오 매입금</div><div class="metric-value">${formatFullKRW(totalCost)}</div></div>
      <div class="metric-card">
        <div class="metric-label">포트폴리오 수익금</div>
        <div class="metric-value ${getChangeClass(totalProfit)}">${formatFullKRW(totalProfit)}</div>
        <div class="metric-sub ${getChangeClass(returnRate)}">${formatPercent(returnRate)}</div>
      </div>
    </div>

    <div class="summary-grid animate-in animate-delay-2">
      <div class="card">
        <div class="card-title">${icons.chartPie()} 자산 배분 (그룹별)</div>
        <div class="donut-wrapper">
          <div class="donut-chart-container"><canvas id="portfolio-donut-2"></canvas></div>
          <div class="donut-legend">
            ${groupNames.map((gn, i) => `
              <div class="donut-legend-item">
                <div class="donut-legend-left"><div class="donut-legend-color" style="background:${COLORS[i % COLORS.length]}"></div><span class="donut-legend-name">${gn}</span></div>
                <span class="donut-legend-value">${totalValue ? ((groups[gn].total / totalValue) * 100).toFixed(1) : 0}%</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-title">${icons.briefcase()} 계좌별 현황</div>
        <div id="account-list"></div>
      </div>
    </div>

    <div class="card animate-in animate-delay-3">
      <div class="card-header-row">
        <span class="card-title" style="margin-bottom:0">${icons.clipboard()} 전체 보유 종목 (${items.length}개)</span>
      </div>
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr><th>종목명</th><th>분류/계좌</th><th class="text-right">현재가</th><th class="text-right">수량</th><th class="text-right">평가금</th><th class="text-right">수익률</th><th></th></tr></thead>
          <tbody>
            ${items.map(h => `
              <tr>
                <td style="font-weight:600">${h.name} <br/><span style="font-size:11px;color:var(--color-text-tertiary)">${h.ticker || ''}</span></td>
                <td><div style="font-size:11px;color:var(--color-text-tertiary);margin-bottom:4px">${h.group}</div><span class="account-tag ${h.account.includes('연저펀') ? 'account-tag-pension' : h.account.includes('ISA') ? 'account-tag-isa' : 'account-tag-general'}">${h.account}</span></td>
                <td class="text-right">${formatFullKRW(h.price)}</td>
                <td class="text-right">${Number(h.qty)}</td>
                <td class="text-right" style="font-weight:600">${formatFullKRW(h.evalAmount)}</td>
                <td class="text-right"><span class="${getChangeClass(h.returnPct)}">${formatPercent(h.returnPct)}</span></td>
                <td>
                  <div style="display:flex;gap:4px">
                    <button class="btn-delete" data-edit-stock="${h.id}" title="수정" style="color:var(--color-text-secondary)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                    <button class="btn-delete" data-delete-stock="${h.id}" title="삭제"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.querySelector('#btn-add-stock').addEventListener('click', () => openAddModal());
  container.querySelectorAll('[data-edit-stock]').forEach(btn => {
    btn.addEventListener('click', () => openAddModal(items.find(h => h.id === Number(btn.dataset.editStock))));
  });
  container.querySelectorAll('[data-delete-stock]').forEach(btn => {
    btn.addEventListener('click', () => deleteItem(Number(btn.dataset.deleteStock)));
  });

  // Account list
  const accounts = {};
  items.forEach(h => {
    if (!accounts[h.account]) accounts[h.account] = { value: 0, count: 0 };
    accounts[h.account].value += h.evalAmount || h.cost || 0;
    accounts[h.account].count++;
  });
  document.getElementById('account-list').innerHTML = Object.keys(accounts).map(acc => `
    <div class="portfolio-item">
      <div class="portfolio-left">
        <div class="portfolio-icon">${acc.substring(0, 2)}</div>
        <div><div class="portfolio-name">${acc}</div><div class="portfolio-ticker">${accounts[acc].count}개 종목</div></div>
      </div>
      <div class="portfolio-right"><div class="portfolio-value">${formatFullKRW(accounts[acc].value)}</div></div>
    </div>
  `).join('');

  // Donut chart
  if (totalValue > 0) {
    new Chart(document.getElementById('portfolio-donut-2').getContext('2d'), {
      type: 'doughnut',
      data: { labels: groupNames, datasets: [{ data: groupValues, backgroundColor: COLORS.slice(0, groupNames.length), borderWidth: 0, borderRadius: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { display: false } } }
    });
  }
}
