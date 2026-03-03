import { formatPercent, getChangeClass, safe, safeNum } from './utils.js';
import { getCellValue, getRow } from './dataLoader.js';
import { icons } from './icons.js';
import { getExchangeRate } from './stockService.js';

export async function renderMarket(container, data) {
  const sheet = data['참고 자료'];
  if (!sheet) { container.innerHTML = '<div class="empty-state"><p>데이터 없음</p></div>'; return; }

  // Sector/market data starts from row 44+ (0-indexed: 43+)
  // BD=col56(name), BE=col57(ticker), BF=col58(startPrice), BG=col59(currentPrice)
  // BH=col60(change), BI=col61(changePct), BJ=col62(valueChange), BK=col63(returnPct)
  // BL=col64(vs52wkHigh), BM=col65(vs52wkLow), BN=col66(sent240d), BO=col67(sent120d), BP=col68(sent20d)
  const sectors = [];
  for (let r = 43; r <= 65; r++) {
    const row = getRow(sheet, r);
    if (!row || row.length < 57) continue;
    const name = safe(row[55]); // BD (0-indexed 55)
    const ticker = safe(row[56]); // BE
    if (!name || name === '-') continue;

    const startPrice = safeNum(row[57]); // BF
    const currentPrice = safeNum(row[58]); // BG
    const priceChange = safeNum(row[59]); // BH
    const changePct = typeof row[60] === 'number' ? row[60] : 0; // BI
    const valueChange = safeNum(row[61]); // BJ
    const returnPct = typeof row[62] === 'number' ? row[62] : 0; // BK
    const vs52High = typeof row[63] === 'number' ? row[63] : null; // BL
    const vs52Low = typeof row[64] === 'number' ? row[64] : null; // BM
    const sentiment240 = safe(row[65]); // BN
    const sentiment120 = safe(row[66]); // BO
    const sentiment20 = safe(row[67]); // BP

    sectors.push({ name, ticker, startPrice, currentPrice, priceChange, changePct, valueChange, returnPct, vs52High, vs52Low, sentiment240, sentiment120, sentiment20 });
  }

  // ETF daily performance tickers (rows 3-15, B col = ticker)
  const tickers = [];
  for (let r = 2; r < Math.min(sheet.json.length, 16); r++) {
    const row = getRow(sheet, r);
    const ticker = safe(row[1]); // B col
    if (!ticker || ticker === '-') continue;
    // Get latest data point
    let latestReturn = 0;
    for (let c = row.length - 1; c >= 2; c--) {
      if (typeof row[c] === 'number') { latestReturn = row[c]; break; }
    }
    tickers.push({ ticker, latestReturn });
  }

  const getSentimentBadge = (s) => {
    if (!s || s === '-') return `<span class="badge badge-neutral">-</span>`;
    let cls = 'badge-neutral';
    if (s.includes('극도 탐욕')) cls = 'badge-positive';
    else if (s.includes('탐')) cls = 'badge-warning';
    else if (s.includes('극도 공포')) cls = 'badge-negative';
    else if (s.includes('공')) cls = 'badge-negative';
    else if (s.includes('중')) cls = 'badge-neutral';
    return `<span class="badge ${cls}">${s}</span>`;
  };

  // Separate exchange rate & bitcoin from traditional sectors
  const specialItems = sectors.filter(s => ['환율', '비트코인'].includes(s.name));
  const indexItems = sectors.filter(s => ['S&P500', 'QQQ', '다우존스', '러셀2000', '슈드', '장기채권'].includes(s.name));
  const sectorItems = sectors.filter(s => !specialItems.includes(s) && !indexItems.includes(s));

  // If no exchange rate in data, fetch real-time USD/KRW
  if (!specialItems.find(s => s.name === '환율')) {
    try {
      const rate = await getExchangeRate();
      specialItems.unshift({
        name: '원/달러 환율', ticker: 'USD/KRW',
        startPrice: 0, currentPrice: rate, priceChange: 0,
        changePct: 0, valueChange: 0, returnPct: 0,
        vs52High: null, vs52Low: null,
        sentiment240: '-', sentiment120: '-', sentiment20: '-'
      });
    } catch (e) { /* silently fail */ }
  }

  const renderMarketCard = (s) => `
    <div class="market-item">
      <div class="market-item-header">
        <span class="market-item-name">${s.name}</span>
        <span class="market-item-ticker">${s.ticker}</span>
      </div>
      <div class="market-item-price">${(s.name === '환율' || s.name === '원/달러 환율') ? '₩' : '$'}${s.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      <div class="market-item-change ${getChangeClass(s.priceChange)}">
        ${s.priceChange >= 0 ? '+' : ''}${s.priceChange.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${formatPercent(s.changePct)})
      </div>
      <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
        ${s.vs52High !== null ? `<span class="text-xs neutral">고점대비 <span class="${getChangeClass(s.vs52High)}">${formatPercent(s.vs52High)}</span></span>` : ''}
        ${s.vs52Low !== null ? `<span class="text-xs neutral">저점대비 <span class="positive">${formatPercent(s.vs52Low)}</span></span>` : ''}
      </div>
      <div class="market-item-sentiment">
        ${getSentimentBadge(s.sentiment240)}
        ${getSentimentBadge(s.sentiment120)}
        ${getSentimentBadge(s.sentiment20)}
      </div>
    </div>
  `;

  container.innerHTML = `
    <div class="section-header">
      <h1 class="section-title">참고 자료</h1>
      <p class="section-subtitle">시장 섹터별 현황 및 투자 심리 분석</p>
    </div>

    ${specialItems.length > 0 ? `
    <div class="stats-row animate-in animate-delay-1">
      ${specialItems.map(s => `
        <div class="metric-card">
          <div class="metric-label">${s.name} (${s.ticker})</div>
          <div class="metric-value">${(s.name === '환율' || s.name === '원/달러 환율') ? '₩' : '$'}${s.currentPrice.toLocaleString()}</div>
          <div class="metric-sub ${getChangeClass(s.changePct)}">${formatPercent(s.changePct)}</div>
        </div>
      `).join('')}
    </div>` : ''}

    ${indexItems.length > 0 ? `
    <div class="card mb-2xl animate-in animate-delay-2">
      <div class="card-title">${icons.chartLine()} 주요 지수</div>
      <div class="market-grid">${indexItems.map(renderMarketCard).join('')}</div>
    </div>` : ''}

    ${sectorItems.length > 0 ? `
    <div class="card mb-2xl animate-in animate-delay-3">
      <div class="card-title">${icons.factory()} 섹터별 현황</div>
      <div class="market-grid">${sectorItems.map(renderMarketCard).join('')}</div>
    </div>` : ''}

    ${tickers.length > 0 ? `
    <div class="card animate-in animate-delay-4">
      <div class="card-title">${icons.barChart()} 주요 ETF 누적 수익률 (기준일 대비)</div>
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr><th>티커</th><th class="text-right">최근 수익률</th><th>상태</th></tr></thead>
          <tbody>
            ${tickers.map(t => `
              <tr>
                <td style="font-weight:600">${t.ticker}</td>
                <td class="text-right"><span class="${getChangeClass(t.latestReturn)}" style="font-weight:600">${formatPercent(t.latestReturn)}</span></td>
                <td>${t.latestReturn > 0.05 ? '<span class="badge badge-positive">강세</span>' : t.latestReturn < -0.05 ? '<span class="badge badge-negative">약세</span>' : '<span class="badge badge-neutral">보합</span>'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>` : ''}
  `;
}
