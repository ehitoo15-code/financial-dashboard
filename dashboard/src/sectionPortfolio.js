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

  const FOREIGN_EXCHANGES = ['NASDAQ', 'NYSE', 'AMEX'];
  const isUsdExchange = (exch) => FOREIGN_EXCHANGES.includes(exch);

  const openAddModal = (existing = null) => {
    const existingIsUsd = existing && isUsdExchange(existing.exchange);

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
      formField('ticker', '티커 (종목번호/코인심볼)', 'text', { required: true, value: existing?.ticker || '', placeholder: 'AAPL · 005930 · BTC' }),
      formField('exchange', '거래소', 'select', { required: true, value: existing?.exchange || 'KRX', selectOptions: ['KRX', 'KOSDAQ', 'NASDAQ', 'NYSE', 'AMEX', 'UPBIT'] })
    )}
      <div style="margin-bottom: var(--space-lg); display: flex; justify-content: flex-end; gap: 8px; align-items: center;">
        <span id="rate-info" style="font-size: 11px; color: var(--color-text-tertiary)"></span>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-fetch-price">⚡ 현재가 불러오기</button>
      </div>
      ${formRow(
      formField('account', '계좌', 'select', { required: true, value: existing?.account || '', selectOptions: ['연저펀1', '연저펀2', 'IRP', 'ISA 중개형', '일반 국내', '일반 해외', '토스증권', '업비트', '기타'] }),
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

      <!-- USD 환율 입력 행 (해외 거래소 선택 시에만 표시) -->
      <div id="usd-rate-row" style="display:${existingIsUsd ? 'flex' : 'none'}; align-items:center; gap:8px; margin-bottom:var(--space-lg); padding:10px 14px; background:rgba(49,130,246,0.07); border-radius:10px; border:1px solid rgba(49,130,246,0.2)">
        <span style="font-size:13px">💱</span>
        <span style="font-size:12px; font-weight:600; color:var(--color-primary); white-space:nowrap">USD/KRW 환율</span>
        <input id="field-fxrate" type="number" step="0.1" value="${existing?.fxRate || ''}" placeholder="예: 1380.5" style="flex:1; padding:6px 10px; border-radius:8px; border:1px solid var(--color-border-light); font-size:13px; background:var(--color-bg-primary)">
        <button type="button" id="btn-fetch-rate" class="btn btn-secondary btn-sm" style="white-space:nowrap">⚡ 실시간</button>
        <span style="font-size:11px; color:var(--color-text-tertiary); white-space:nowrap">원/달러</span>
      </div>

      ${formRow(
      formField('qty', '보유 수량 (최대 소수점 8자리)', 'number', { required: true, value: existing?.qty || '', step: '0.00000001' }),
      `<div class="form-group">
        <label class="form-label" id="label-avgPrice">매입 평단가</label>
        <input type="number" name="avgPrice" id="field-avgPrice" required step="0.01"
          value="${existingIsUsd ? (existing?.avgPriceUsd || existing?.avgPrice || '') : (existing?.avgPrice || '')}"
          placeholder="${existingIsUsd ? '달러 금액 (예: 185.50)' : '원화 금액'}" class="form-input">
      </div>`
    )}
      ${formRow(
      `<div class="form-group">
        <label class="form-label" id="label-price">현재가</label>
        <input type="number" name="price" id="field-price" required step="0.01"
          value="${existingIsUsd ? (existing?.priceUsd || existing?.price || '') : (existing?.price || '')}"
          placeholder="${existingIsUsd ? '달러 금액 (예: 190.00)' : '원화 금액'}" class="form-input">
      </div>`,
      `<div class="form-group" style="display:none">
              <input type="hidden" name="cost" id="field-cost" value="${existing?.cost || 0}">
              <input type="hidden" name="evalAmount" id="field-evalAmount" value="${existing?.evalAmount || 0}">
              <input type="hidden" name="returnPct" id="field-returnPct" value="${existing ? (existing.returnPct * 100).toFixed(2) : 0}">
            </div>`
    )}
      <!-- KRW 환산 미리보기 (USD 모드일 때) -->
      <div id="krw-preview" style="display:${existingIsUsd ? 'flex' : 'none'}; gap:16px; padding:8px 12px; border-radius:8px; background:var(--color-bg-secondary); margin-bottom:8px; font-size:11px; color:var(--color-text-tertiary)">
        <span>평단가 ≈ <strong id="krw-avg">-</strong></span>
        <span>현재가 ≈ <strong id="krw-cur">-</strong></span>
        <span>평가금 ≈ <strong id="krw-eval">-</strong></span>
      </div>
      <p style="font-size:12px; color:var(--color-text-tertiary); margin-top: -4px;">
        * 매입금액, 평가금액, 수익률은 입력한 값을 바탕으로 자동 계산되어 저장됩니다.<br/>
        * <span id="hint-usd" style="display:${existingIsUsd ? 'inline' : 'none'}; color:var(--color-primary); font-weight:600">해외 종목: 달러(USD)로 입력 → 환율 적용해 원화로 저장됩니다.</span>
        <span id="hint-krw" style="display:${existingIsUsd ? 'none' : 'inline'}">해외 주식의 경우 "현재가 불러오기" 클릭 시 실시간 환율이 자동 적용됩니다.</span><br/>
        * 업비트(암호화폐)의 경우 원화 현재가가 직접 적용됩니다.
      </p>
    `, async (formData) => {
      const exch = formData.exchange;
      const qty = Number(formData.qty);
      const isUsd = isUsdExchange(exch);
      const modal = document.querySelector('.modal');
      const fxRateField = modal?.querySelector('#field-fxrate');
      const fxRate = fxRateField ? Number(fxRateField.value || 0) : 0;

      let avg, cur, avgUsd, curUsd;
      if (isUsd && fxRate > 0) {
        avgUsd = Number(formData.avgPrice);
        curUsd = Number(formData.price);
        avg = avgUsd * fxRate;
        cur = curUsd * fxRate;
      } else {
        avg = Number(formData.avgPrice);
        cur = Number(formData.price);
        avgUsd = null;
        curUsd = null;
      }

      const cost = qty * avg;
      const evalAmt = qty * cur;
      const retCount = cost > 0 ? (evalAmt - cost) / cost : 0;

      const payload = {
        name: formData.name,
        ticker: formData.ticker,
        exchange: exch,
        account: formData.account,
        group: formData.group,
        qty,
        avgPrice: avg,
        price: cur,
        ...(avgUsd !== null && { avgPriceUsd: avgUsd, priceUsd: curUsd, fxRate }),
        cost,
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
    const usdRateRow = modal.querySelector('#usd-rate-row');
    const krwPreview = modal.querySelector('#krw-preview');
    const fxRateInput = modal.querySelector('#field-fxrate');
    const fetchRateBtn = modal.querySelector('#btn-fetch-rate');
    const labelAvg = modal.querySelector('#label-avgPrice');
    const labelCur = modal.querySelector('#label-price');
    const priceInput = modal.querySelector('#field-price');
    const avgInput = modal.querySelector('#field-avgPrice');
    const qtyInput = modal.querySelector('#field-qty');
    const hintUsd = modal.querySelector('#hint-usd');
    const hintKrw = modal.querySelector('#hint-krw');

    // Switch between KRW and USD input mode
    const updateCurrencyMode = () => {
      const exch = exchangeInput.value;
      const usd = isUsdExchange(exch);
      usdRateRow.style.display = usd ? 'flex' : 'none';
      krwPreview.style.display = usd ? 'flex' : 'none';
      hintUsd.style.display = usd ? 'inline' : 'none';
      hintKrw.style.display = usd ? 'none' : 'inline';
      if (labelAvg) labelAvg.textContent = usd ? '매입 평단가 (USD $)' : '매입 평단가 (원화 ₩)';
      if (labelCur) labelCur.textContent = usd ? '현재가 (USD $)' : '현재가 (원화 ₩)';
      if (usd) {
        priceInput?.setAttribute('placeholder', '달러 금액 (예: 190.00)');
        avgInput?.setAttribute('placeholder', '달러 금액 (예: 185.50)');
      } else {
        priceInput?.setAttribute('placeholder', '원화 금액');
        avgInput?.setAttribute('placeholder', '원화 금액');
      }
      updateKrwPreview();
    };

    // Live KRW preview
    const updateKrwPreview = () => {
      const rate = Number(fxRateInput?.value || 0);
      const avg = Number(avgInput?.value || 0);
      const cur = Number(priceInput?.value || 0);
      const qty = Number(qtyInput?.value || 0);
      if (!isUsdExchange(exchangeInput.value) || rate <= 0) return;
      const fmt = (v) => v ? '₩' + Math.round(v).toLocaleString() : '-';
      const krwAvg = modal.querySelector('#krw-avg');
      const krwCur = modal.querySelector('#krw-cur');
      const krwEval = modal.querySelector('#krw-eval');
      if (krwAvg) krwAvg.textContent = fmt(avg * rate);
      if (krwCur) krwCur.textContent = fmt(cur * rate);
      if (krwEval) krwEval.textContent = fmt(cur * rate * qty);
    };

    exchangeInput?.addEventListener('change', updateCurrencyMode);
    [fxRateInput, priceInput, avgInput, qtyInput].forEach(el =>
      el?.addEventListener('input', updateKrwPreview)
    );

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
              updateCurrencyMode();
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

    // Fetch live exchange rate
    if (fetchRateBtn) {
      fetchRateBtn.addEventListener('click', async () => {
        fetchRateBtn.textContent = '⌛...';
        fetchRateBtn.disabled = true;
        const rate = await getExchangeRate();
        if (fxRateInput) fxRateInput.value = rate.toFixed(1);
        rateInfo.textContent = `환율: ₩${rate.toFixed(1)}`;
        updateKrwPreview();
        fetchRateBtn.textContent = '⚡ 실시간';
        fetchRateBtn.disabled = false;
      });
    }

    // Price fetching
    fetchBtn.addEventListener('click', async () => {
      const ticker = tickerInput.value;
      const exch = exchangeInput.value;
      if (!ticker) return;

      fetchBtn.disabled = true;
      fetchBtn.textContent = '⌛...';

      const price = await fetchCurrentPrice(ticker, exch);
      if (price !== null) {
        if (exch === 'UPBIT') {
          updateFormField('price', price);
          showToast(`현재가 ₩${price.toLocaleString()} 반영 완료`);
          rateInfo.textContent = '';
        } else if (isUsdExchange(exch)) {
          // USD 모드: USD 가격을 price 필드에 그대로 넣고, 환율도 채워줌
          const rate = await getExchangeRate();
          if (fxRateInput) fxRateInput.value = rate.toFixed(1);
          updateFormField('price', price.toFixed(2));
          rateInfo.textContent = `환율: ₩${rate.toFixed(1)}`;
          showToast(`현재가 $${price.toFixed(2)}, 환율 ₩${rate.toFixed(1)} 반영`);
          updateKrwPreview();
        } else {
          updateFormField('price', price);
          showToast(`현재가 ₩${price.toLocaleString()} 반영 완료`);
          rateInfo.textContent = '';
        }
      }
      fetchBtn.disabled = false;
      fetchBtn.textContent = '⚡ 현재가 불러오기';
    });

    // Init mode on open
    updateCurrencyMode();
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
              <td class="text-right">${h.priceUsd ? `$${h.priceUsd.toLocaleString('en-US', {minimumFractionDigits:2,maximumFractionDigits:2})}<br><span style="font-size:10px;color:var(--color-text-tertiary)">${formatFullKRW(h.price)}</span>` : formatFullKRW(h.price)}</td>
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
