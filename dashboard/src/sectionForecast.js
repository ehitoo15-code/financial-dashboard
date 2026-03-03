import { formatFullKRW, formatKRW, formatPercent, getChangeClass, COLORS, calculateXIRR, getMonthlyHistory } from './utils.js';
import { icons } from './icons.js';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

export function renderForecast(container, data, store) {
  const months = store.getSummaryMonths();
  const expenses = store.getExpenses();
  const dividends = store.getDividends();
  const holdings = store.getHoldings();

  if (months.length === 0) {
    container.innerHTML = `
            <div class="section-header">
                <h1 class="section-title">자산 목표 및 성과 분석</h1>
                <p class="section-subtitle">데이터가 충분하지 않습니다. 월간 기록을 먼저 작성해 주세요.</p>
            </div>
            <div class="empty-state">
                <div class="empty-state-icon">${icons.crystal(32)}</div>
                <p class="empty-state-text">통계 데이터가 없습니다.</p>
            </div>
        `;
    return;
  }

  // 1. Calculations
  const latest = months[months.length - 1];
  const totalAssets = latest.totalAssets;
  const last12MonthsYM = months.slice(-12).map(m => m.yearMonth);

  // Target 1: Avg living expenses (Target line 1)
  const recentExpenses = expenses.filter(e => last12MonthsYM.includes(e.period));
  const avgMonthlyExp = recentExpenses.length > 0
    ? recentExpenses.reduce((s, e) => s + Math.abs(e.amount), 0) / 12
    : 3500000; // Fallback to 3.5M KRW if no data

  // Target 2: Salary replacement (Target line 2)
  const avgMonthlyIncome = months.slice(-12).reduce((s, m) => s + (m.income || 0), 0) / 12 || 6000000;

  // Performance Data (12m list)
  // Monthly Net Profit = (CurrAssets - PrevAssets) - Savings
  const perfHistory = months.map((m, i) => {
    if (i === 0) return 0;
    const prev = months[i - 1];
    return (m.totalAssets - prev.totalAssets) - m.savings;
  });

  const avgPerf12 = perfHistory.slice(-12).reduce((a, b) => a + b, 0) / 12;

  // Monthly Dividends
  const divMap = {};
  dividends.forEach(d => {
    const ym = d.payDate ? d.payDate.substring(0, 7) : 'unknown';
    divMap[ym] = (divMap[ym] || 0) + d.netAmount;
  });
  const recentDivs = last12MonthsYM.map(ym => divMap[ym] || 0);
  const avgDiv12 = recentDivs.reduce((a, b) => a + b, 0) / 12;

  // B. Principal vs Eval
  let cumSavings = months[0].totalAssets;
  const principalHistory = months.map((m, i) => {
    if (i > 0) cumSavings += m.savings;
    return cumSavings;
  });
  const evalHistory = months.map(m => m.totalAssets);
  const chartLabels = months.map(m => m.yearMonth);

  // Note: To calculate XIRR, we treat investment as outflow (-) and current value as inflow (+)
  const payments = [
    ...months.map((m, i) => ({
      date: m.yearMonth + '-01',
      amount: i === 0 ? -m.totalAssets : -m.savings
    })),
    { date: new Date().toISOString().substring(0, 10), amount: totalAssets }
  ];
  const xirr = calculateXIRR(payments);

  // Mock S&P 500 for comparison (growth index starting at totalAssets of month 0)
  let sp500Val = months[0].totalAssets;
  const sp500History = months.map((m, i) => {
    if (i > 0) {
      sp500Val = (sp500Val * 1.008) + m.savings; // 0.8% monthly approx S&P 500 avg
    }
    return sp500Val;
  });

  container.innerHTML = `
        <div class="section-header">
            <h1 class="section-title">자산 예상 (Forecast)</h1>
            <p class="section-subtitle">투자 실적(Capital Gain)과 저축(Savings)을 분리하여 성과를 측정합니다.</p>
        </div>

        <div class="stats-row animate-in animate-delay-1">
            <div class="metric-card">
                <div class="metric-label">투자 성과율 (XIRR)</div>
                <div class="metric-value ${getChangeClass(xirr)}">${formatPercent(xirr)}</div>
                <div class="metric-sub">매월 현금 흐름을 반영한 연환산 수익률</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">자산 유지 기간 (Burn Rate)</div>
                <div class="metric-value">${avgPerf12 > avgMonthlyExp ? '영구 유지' : `${Math.floor(totalAssets / avgMonthlyExp)}개월`}</div>
                <div class="metric-sub">현재 지출 수준에서의 자산 수명</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">자본 수익 기여도</div>
                <div class="metric-value neutral">${((avgPerf12 / (avgPerf12 + (latest.savings || 1))) * 100).toFixed(1)}%</div>
                <div class="metric-sub">총 자산 증가분 중 투자 기여 비중</div>
            </div>
        </div>

        <div class="summary-grid animate-in animate-delay-2">
            <div class="card">
                <div class="card-title">${icons.target()} 목표 달성 그래프 (Goal Tracking)</div>
                <div class="chart-container"><canvas id="goal-tracking-chart"></canvas></div>
                <div class="chart-info-box">
                    <span><strong>실적선:</strong> 자본 순수익(손익+배당) 1년 평균</span>
                    <span><strong>목표선:</strong> 생활비 수준 vs 현재 급여 수준</span>
                </div>
            </div>
            <div class="card">
                <div class="card-title">${icons.chartLine()} 원금 vs 평가금 (Principal vs Eval)</div>
                <div class="chart-container"><canvas id="asset-growth-chart"></canvas></div>
                <div class="chart-info-box">
                    <span>바 차트는 월별 <strong>배당금</strong>(세후) 수령액입니다.</span>
                </div>
            </div>
        </div>

        <div class="card animate-in animate-delay-3" style="margin-top:var(--space-2xl)">
            <div class="card-title">${icons.trendingUp()} 벤치마크 성과 비교 (Portfolio vs S&P 500)</div>
            <div class="chart-container"><canvas id="benchmark-chart"></canvas></div>
            <div class="chart-info-box">
                <span>동일 금액을 <strong>S&P 500</strong>에 투자했을 때와 비교한 초과 수익률(Alpha) 시각화</span>
            </div>
        </div>
  `;

  // Charts

  // A. Goal Tracking
  const last12Perf = last12MonthsYM.map((ym) => {
    const idx = months.findIndex(m => m.yearMonth === ym);
    return idx > -1 ? perfHistory[idx] : 0;
  });

  new Chart(document.getElementById('goal-tracking-chart').getContext('2d'), {
    type: 'line',
    data: {
      labels: last12MonthsYM,
      datasets: [
        { label: '자본 수익 실적 (12m Avg)', data: Array(last12MonthsYM.length).fill(avgPerf12), borderColor: '#3182f6', borderDash: [5, 5], borderWidth: 2, pointRadius: 0 },
        { label: '실제 월간 자본 수익', data: last12Perf, borderColor: 'rgba(49,130,246,0.3)', borderWidth: 1.5, pointRadius: 2, fill: false },
        { label: '생활비 목표선', data: Array(last12MonthsYM.length).fill(avgMonthlyExp), borderColor: '#e17055', borderDash: [2, 2], borderWidth: 1, pointRadius: 0 },
        { label: '급여 대체 목표선', data: Array(last12MonthsYM.length).fill(avgMonthlyIncome), borderColor: '#6c5ce7', borderDash: [2, 2], borderWidth: 1, pointRadius: 0 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 12, boxHeight: 12, padding: 16, font: { size: 12, family: 'Pretendard', weight: '500' }, color: '#4e5968' }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(0,0,0,0.04)' },
          border: { display: false },
          suggestedMax: Math.max(avgMonthlyIncome * 1.2, 5000000),
          ticks: { callback: v => formatKRW(v), font: { family: 'Pretendard', size: 11 }, color: '#8b95a1', padding: 8 }
        },
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { font: { family: 'Pretendard', size: 11 }, color: '#8b95a1', padding: 8 }
        }
      }
    }
  });

  // B. Asset Growth & Dividends (Mixed)
  new Chart(document.getElementById('asset-growth-chart').getContext('2d'), {
    type: 'bar',
    data: {
      labels: chartLabels,
      datasets: [
        { type: 'bar', label: '세후 배당금', data: chartLabels.map(ym => divMap[ym] || 0), backgroundColor: 'rgba(0,184,148,0.5)', borderRadius: 2, yAxisID: 'yDiv' },
        { type: 'line', label: '총 자격 평가금', data: evalHistory, borderColor: '#3182f6', backgroundColor: 'rgba(49,130,246,0.1)', fill: true, tension: 0.4, borderWidth: 3 },
        { type: 'line', label: '누적 원금(저축)', data: principalHistory, borderColor: '#94a3b8', borderDash: [5, 5], fill: false, tension: 0, borderWidth: 2 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, boxHeight: 12, padding: 16, font: { size: 12, family: 'Pretendard', weight: '500' }, color: '#4e5968' } }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(0,0,0,0.04)' },
          border: { display: false },
          suggestedMax: 10000000,
          ticks: { callback: v => formatKRW(v), font: { family: 'Pretendard', size: 11 }, color: '#8b95a1', padding: 8 }
        },
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { font: { family: 'Pretendard', size: 11 }, color: '#8b95a1', padding: 8 }
        },
        yDiv: { position: 'right', display: false, beginAtZero: true }
      }
    }
  });

  // C. Benchmark
  new Chart(document.getElementById('benchmark-chart').getContext('2d'), {
    type: 'line',
    data: {
      labels: chartLabels,
      datasets: [
        { label: '내 포트폴리오', data: evalHistory, borderColor: '#3182f6', borderWidth: 3, pointRadius: 0, fill: false },
        { label: 'S&P 500 (Virtual)', data: sp500History, borderColor: '#e17055', borderDash: [3, 3], borderWidth: 2, pointRadius: 0, fill: false }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, boxHeight: 12, padding: 16, font: { size: 12, family: 'Pretendard', weight: '500' }, color: '#4e5968' } }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(0,0,0,0.04)' },
          border: { display: false },
          suggestedMax: 10000000,
          ticks: { callback: v => formatKRW(v), font: { family: 'Pretendard', size: 11 }, color: '#8b95a1', padding: 8 }
        },
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { font: { family: 'Pretendard', size: 11 }, color: '#8b95a1', padding: 8 }
        }
      }
    }
  });
}
