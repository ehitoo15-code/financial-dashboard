// LocalStorage-based data store for financial dashboard
// Initial seed from Excel, then all CRUD via localStorage

const STORAGE_KEY = 'financial_dashboard_data';

const DEFAULT_DATA = {
    // 자산 요약 - monthly snapshots
    summaryMonths: [],
    // 주식 보유 종목
    holdings: [],
    // 거래 기록
    trades: [],
    // 배당 기록
    dividends: [],
    // 지출 내역
    expenses: [],
    // 수입 내역
    incomes: [],
    // 자산 증가 예상
    forecasts: [],
    // 참고자료 (시장 데이터)
    marketData: [],
    // 메타
    meta: { lastUpdated: null, initialized: false }
};

class DataStore {
    constructor() {
        this._data = null;
    }

    load() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                this._data = JSON.parse(stored);
                return true;
            }
        } catch (e) { console.warn('Failed to load from localStorage:', e); }
        return false;
    }

    save() {
        try {
            this._data.meta.lastUpdated = new Date().toISOString();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data));
        } catch (e) { console.error('Failed to save to localStorage:', e); }
    }

    getData() { return this._data; }

    isInitialized() {
        return this._data && this._data.meta && this._data.meta.initialized;
    }

    // Seed from parsed Excel data
    seedFromExcel(excelData) {
        this._data = JSON.parse(JSON.stringify(DEFAULT_DATA));

        // Seed incomes
        this._seedIncomes(excelData);
        // Seed expenses
        this._seedExpenses(excelData);
        // Seed holdings
        this._seedHoldings(excelData);
        // Seed trades
        this._seedTrades(excelData);
        // Seed dividends
        this._seedDividends(excelData);
        // Seed summary months
        this._seedSummary(excelData);
        // Seed forecasts
        this._seedForecasts(excelData);
        // Seed market data
        this._seedMarketData(excelData);

        this._data.meta.initialized = true;
        this.save();
    }

    // Reset and re-seed
    resetFromExcel(excelData) {
        localStorage.removeItem(STORAGE_KEY);
        this.seedFromExcel(excelData);
    }

    exportData() {
        return JSON.stringify(this._data, null, 2);
    }

    importData(jsonString) {
        try {
            const parsed = JSON.parse(jsonString);
            if (!parsed.meta || !parsed.summaryMonths) throw new Error('올바른 백업 파일이 아닙니다.');
            this._data = parsed;
            this.save();
            return true;
        } catch (e) {
            console.error('Import failed:', e);
            throw e;
        }
    }

    clearAll() {
        localStorage.removeItem(STORAGE_KEY);
        this._data = JSON.parse(JSON.stringify(DEFAULT_DATA));
    }

    // --- CRUD: Incomes ---
    getIncomes() { return this._data.incomes || []; }
    addIncome(income) {
        income.id = Date.now();
        this._data.incomes.unshift(income);
        this.save();
        return income;
    }
    deleteIncome(id) {
        this._data.incomes = this._data.incomes.filter(i => i.id !== id);
        this.save();
    }

    // --- CRUD: Expenses ---
    getExpenses() { return this._data.expenses || []; }
    addExpense(expense) {
        expense.id = Date.now();
        this._data.expenses.unshift(expense);
        this.save();
        return expense;
    }
    deleteExpense(id) {
        this._data.expenses = this._data.expenses.filter(e => e.id !== id);
        this.save();
    }
    updateExpense(id, updates) {
        const idx = this._data.expenses.findIndex(e => e.id === id);
        if (idx >= 0) { Object.assign(this._data.expenses[idx], updates); this.save(); }
    }

    // --- CRUD: Trades ---
    getTrades() { return this._data.trades || []; }
    addTrade(trade) {
        trade.id = Date.now();
        this._data.trades.unshift(trade);
        this.save();
        return trade;
    }
    deleteTrade(id) {
        this._data.trades = this._data.trades.filter(t => t.id !== id);
        this.save();
    }
    updateTrade(id, updates) {
        const idx = this._data.trades.findIndex(t => t.id === id);
        if (idx >= 0) { Object.assign(this._data.trades[idx], updates); this.save(); }
    }

    // --- CRUD: Dividends ---
    getDividends() { return this._data.dividends || []; }
    addDividend(dividend) {
        dividend.id = Date.now();
        this._data.dividends.unshift(dividend);
        this.save();
        return dividend;
    }
    deleteDividend(id) {
        this._data.dividends = this._data.dividends.filter(d => d.id !== id);
        this.save();
    }

    // --- CRUD: Holdings ---
    getHoldings() { return this._data.holdings || []; }
    addHolding(holding) {
        holding.id = Date.now();
        this._data.holdings.push(holding);
        this.save();
        return holding;
    }
    updateHolding(id, updates) {
        const idx = this._data.holdings.findIndex(h => h.id === id);
        if (idx >= 0) { Object.assign(this._data.holdings[idx], updates); this.save(); }
    }
    deleteHolding(id) {
        this._data.holdings = this._data.holdings.filter(h => h.id !== id);
        this.save();
    }

    // --- CRUD: Summary Months ---
    getSummaryMonths() { return this._data.summaryMonths || []; }
    addSummaryMonth(monthData) {
        monthData.id = Date.now();
        this._data.summaryMonths.push(monthData);
        this._data.summaryMonths.sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
        this.save();
        return monthData;
    }
    updateSummaryMonth(id, updates) {
        const idx = this._data.summaryMonths.findIndex(m => m.id === id);
        if (idx >= 0) { Object.assign(this._data.summaryMonths[idx], updates); this.save(); }
    }
    deleteSummaryMonth(id) {
        this._data.summaryMonths = this._data.summaryMonths.filter(m => m.id !== id);
        this.save();
    }

    // --- CRUD: Forecasts ---
    getForecasts() { return this._data.forecasts || []; }

    // --- Aggregation Helpers ---
    getMonthlyIncomeTotal(yearMonth) {
        return this._data.incomes
            .filter(i => i.period && i.period.substring(0, 7) === yearMonth)
            .reduce((sum, i) => sum + (i.amount || 0), 0);
    }

    getMonthlyExpenseTotal(yearMonth) {
        return this._data.expenses
            .filter(e => e.period && e.period.substring(0, 7) === yearMonth)
            .reduce((sum, e) => sum + Math.abs(e.amount || 0), 0);
    }

    getMonthlyDividendTotal(yearMonth) {
        return this._data.dividends
            .filter(d => d.payDate && d.payDate.substring(0, 7) === yearMonth)
            .reduce((sum, d) => sum + (d.netAmount || 0), 0);
    }

    getCurrentHoldingsTotal() {
        return this._data.holdings.reduce((sum, h) => sum + (h.evalAmount || 0), 0);
    }

    getIncomeByCategoryForMonth(yearMonth, category) {
        return this._data.incomes
            .filter(i => i.period && i.period.substring(0, 7) === yearMonth && i.category === category)
            .reduce((sum, i) => sum + (i.amount || 0), 0);
    }

    getIncomeExcludingCategoriesForMonth(yearMonth, excludeCategories) {
        return this._data.incomes
            .filter(i => i.period && i.period.substring(0, 7) === yearMonth && !excludeCategories.includes(i.category))
            .reduce((sum, i) => sum + (i.amount || 0), 0);
    }

    // --- CRUD: Market data ---
    getMarketData() { return this._data.marketData || []; }

    // --- Seed helpers ---
    _safeNum(v) { return typeof v === 'number' && !isNaN(v) ? v : 0; }
    _safeStr(v) { if (v === null || v === undefined || v === '#N/A' || v === '#DIV/0!') return ''; return String(v).replace(/\n/g, ' ').trim(); }
    _getRow(sheet, r) { return (sheet && sheet.json && r >= 0 && r < sheet.json.length) ? (sheet.json[r] || []) : []; }
    _getCell(sheet, r, c) { const row = this._getRow(sheet, r); return c >= 0 && c < row.length ? row[c] : null; }
    _dateStr(v) {
        if (!v) return '';
        if (v instanceof Date) return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`;
        return String(v);
    }

    _seedIncomes(data) {
        const sheet = data['급여 및 수입 상세 내역'];
        if (!sheet) return;
        for (let r = 3; r < sheet.json.length; r++) {
            const row = this._getRow(sheet, r);
            if (row[1] === null || row[1] === undefined) continue;
            this._data.incomes.push({
                id: 1000 + r,
                date: this._dateStr(row[3]),
                period: this._dateStr(row[2]),
                category: this._safeStr(row[4]) || '급여',
                amount: this._safeNum(row[5]),
                detail: this._safeStr(row[6])
            });
        }
    }

    _seedExpenses(data) {
        const sheet = data['생활비 및 지출 상세 내역'];
        if (!sheet) return;
        for (let r = 3; r < sheet.json.length; r++) {
            const row = this._getRow(sheet, r);
            if (row[1] === null || row[1] === undefined) continue;
            this._data.expenses.push({
                id: 2000 + r,
                date: this._safeStr(row[3]),
                period: this._dateStr(row[2]),
                status: this._safeStr(row[4]),
                category: this._safeStr(row[5]) || '기타',
                amount: this._safeNum(row[6]),
                account: this._safeStr(row[7]),
                detail: this._safeStr(row[8])
            });
        }
    }

    _seedHoldings(data) {
        const sheet = data['실시간 주식 계좌 현황'];
        if (!sheet) return;
        let currentGroup = '', currentAccount = '';
        for (let r = 4; r < Math.min(sheet.json.length, 70); r++) {
            const row = this._getRow(sheet, r);
            if (row[1] && typeof row[1] === 'string' && row[1].length > 2) currentGroup = this._safeStr(row[1]);
            const acct = row[3];
            if (acct && typeof acct === 'string' && acct.length > 1) currentAccount = this._safeStr(acct);
            const name = this._safeStr(row[4]);
            if (!name || name.includes('숨김') || name.includes('오류')) continue;
            const cleanName = name.replace(/\(\s*US[A-Z0-9]+\s*\)/g, '').trim();
            this._data.holdings.push({
                id: 3000 + r,
                name: cleanName,
                ticker: this._safeStr(row[5]) || this._safeStr(row[6]),
                account: currentAccount,
                group: currentGroup,
                price: this._safeNum(row[7]),
                qty: this._safeNum(row[9]),
                avgPrice: this._safeNum(row[12]),
                cost: this._safeNum(row[14]),
                evalAmount: this._safeNum(row[15]),
                profit: this._safeNum(row[17]),
                returnPct: this._safeNum(row[18])
            });
        }
    }

    _seedTrades(data) {
        const sheet = data['거래 기록 및 차익 실현 기록'];
        if (!sheet) return;
        for (let r = 11; r < sheet.json.length; r++) {
            const row = this._getRow(sheet, r);
            if (typeof row[1] !== 'number') continue;
            this._data.trades.push({
                id: 4000 + r,
                date: this._dateStr(row[2]),
                type: this._safeStr(row[3]),
                account: this._safeStr(row[4]),
                name: this._safeStr(row[5]),
                ticker: this._safeStr(row[7]),
                qty: this._safeNum(row[11]),
                amount: this._safeNum(row[12]),
                fees: this._safeNum(row[13]),
                profit: this._safeNum(row[14]),
                profitRate: typeof row[15] === 'number' ? row[15] : null
            });
        }
    }

    _seedDividends(data) {
        const sheet = data['배당 기록'];
        if (!sheet) return;
        for (let r = 21; r < sheet.json.length; r++) {
            const row = this._getRow(sheet, r);
            if (typeof row[1] !== 'number') continue;
            this._data.dividends.push({
                id: 5000 + r,
                exDate: this._dateStr(row[2]),
                payDate: this._dateStr(row[3]),
                account: this._safeStr(row[4]),
                name: this._safeStr(row[5]),
                ticker: this._safeStr(row[7]),
                perShare: this._safeNum(row[9]),
                qty: this._safeNum(row[10]),
                grossAmount: this._safeNum(row[11]),
                netAmount: this._safeNum(row[14])
            });
        }
    }

    _seedSummary(data) {
        const sheet = data['금융 자산 기록 (요약)'];
        if (!sheet) return;
        const headerRow = this._getRow(sheet, 1);
        const labels = {};
        for (let r = 0; r < sheet.json.length; r++) {
            const lbl = this._getCell(sheet, r, 2);
            if (typeof lbl === 'string') labels[lbl.replace(/\n/g, ' ').trim()] = r;
        }

        // Flexible label finding
        const findLabel = (search) => {
            const entry = Object.entries(labels).find(([k, v]) => k.replace(/\s/g, '').includes(search.replace(/\s/g, '')));
            return entry ? entry[1] : -1;
        };

        const lblAssets = findLabel('자산합계');
        const lblInvest = findLabel('투자합계');
        const lblCash = findLabel('저축합계') !== -1 ? findLabel('저축합계') : findLabel('현금합계');
        const lblPension = findLabel('연금합계');
        const lblMoReturn = findLabel('월간순수익률');
        const lblCumReturn = findLabel('누적순수익률');
        const lblMoGrowth = findLabel('월간자산증가율');
        const lblCumGrowth = findLabel('누적자산증가율');
        const lblSavings = findLabel('저축금액');
        const lblSavingsRate = findLabel('저축률');

        for (let c = 3; c < headerRow.length; c++) {
            const monthVal = headerRow[c];
            if (!monthVal) continue;
            const ym = this._dateStr(monthVal).substring(0, 7);
            if (ym.length < 7) continue;

            this._data.summaryMonths.push({
                id: 6000 + c,
                yearMonth: ym,
                income: 0, // Not typically in the summary sheet, but we'll store it now
                totalAssets: this._safeNum(this._getCell(sheet, lblAssets !== -1 ? lblAssets : 6, c)), // Fallback to row 6 if not found
                investTotal: this._safeNum(this._getCell(sheet, lblInvest, c)),
                cashTotal: this._safeNum(this._getCell(sheet, lblCash, c)),
                pensionTotal: this._safeNum(this._getCell(sheet, lblPension, c)),
                monthlyReturn: this._safeNum(this._getCell(sheet, lblMoReturn, c)),
                cumReturn: this._safeNum(this._getCell(sheet, lblCumReturn, c)),
                monthlyGrowth: this._safeNum(this._getCell(sheet, lblMoGrowth, c)),
                cumGrowth: this._safeNum(this._getCell(sheet, lblCumGrowth, c)),
                savings: this._safeNum(this._getCell(sheet, lblSavings, c)),
                savingsRate: this._safeNum(this._getCell(sheet, lblSavingsRate, c)),
            });
        }
    }

    _seedForecasts(data) {
        const sheet = data['자산 증가 예상'];
        if (!sheet) return;
        for (let r = 2; r < Math.min(sheet.json.length, 25); r++) {
            const row = this._getRow(sheet, r);
            if (!row[1]) continue;
            const isHeader = (typeof row[1] === 'string' && row[1].includes('연도'));
            if (isHeader) continue;
            this._data.forecasts.push({
                id: 7000 + r,
                year: row[1] instanceof Date ? row[1].getFullYear() : row[1],
                tenure: this._safeStr(row[2]),
                returnRate: typeof row[3] === 'number' ? row[3] : null,
                totalIncome: typeof row[5] === 'number' ? row[5] : null,
                totalExpense: typeof row[7] === 'number' ? row[7] : null,
                additionalSavings: typeof row[9] === 'number' ? row[9] : null,
                dividend: typeof row[11] === 'number' ? row[11] : null,
                netProfit: typeof row[13] === 'number' ? row[13] : null,
                totalAssets: typeof row[15] === 'number' ? row[15] : null,
                isConfirmed: r < 4
            });
        }
    }

    _seedMarketData(data) {
        const sheet = data['참고 자료'];
        if (!sheet) return;
        for (let r = 43; r <= 65; r++) {
            const row = this._getRow(sheet, r);
            if (!row || row.length < 57) continue;
            const name = this._safeStr(row[55]);
            if (!name) continue;
            this._data.marketData.push({
                id: 8000 + r,
                name,
                ticker: this._safeStr(row[56]),
                startPrice: this._safeNum(row[57]),
                currentPrice: this._safeNum(row[58]),
                priceChange: this._safeNum(row[59]),
                changePct: typeof row[60] === 'number' ? row[60] : 0,
                vs52High: typeof row[63] === 'number' ? row[63] : null,
                vs52Low: typeof row[64] === 'number' ? row[64] : null,
                sentiment240: this._safeStr(row[65]),
                sentiment120: this._safeStr(row[66]),
                sentiment20: this._safeStr(row[67])
            });
        }
    }
}

export const store = new DataStore();
