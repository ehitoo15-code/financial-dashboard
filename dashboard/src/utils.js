// Utility functions for formatting
export function formatKRW(num) {
    if (num === null || num === undefined || isNaN(num)) return '-';
    const rounded = Math.round(num);
    const abs = Math.abs(rounded);
    if (abs >= 100000000) return (rounded / 100000000).toFixed(1) + '억';
    if (abs >= 10000) return (rounded / 10000).toFixed(0) + '만';
    return rounded.toLocaleString('ko-KR') + '원';
}

export function formatFullKRW(num) {
    if (num === null || num === undefined || isNaN(num)) return '-';
    return Math.round(num).toLocaleString('ko-KR') + '원';
}

export function formatPercent(num) {
    if (num === null || num === undefined || isNaN(num)) return '-';
    const val = (num * 100).toFixed(2);
    return (num >= 0 ? '+' : '') + val + '%';
}

export function formatDate(val) {
    if (!val) return '-';
    if (val instanceof Date) {
        return `${val.getFullYear()}.${String(val.getMonth() + 1).padStart(2, '0')}`;
    }
    return String(val);
}

export function formatFullDate(val) {
    if (!val) return '-';
    if (val instanceof Date) {
        return `${val.getFullYear()}.${String(val.getMonth() + 1).padStart(2, '0')}.${String(val.getDate()).padStart(2, '0')}`;
    }
    return String(val);
}

export function getChangeClass(val) {
    if (val === null || val === undefined || isNaN(val) || val === 0) return 'neutral';
    return val > 0 ? 'positive' : 'negative';
}

export function getBadgeClass(val) {
    if (val === null || val === undefined || isNaN(val) || val === 0) return 'badge-neutral';
    return val > 0 ? 'badge-positive' : 'badge-negative';
}

export function safe(val, fallback = '-') {
    if (val === null || val === undefined || val === '' || val === '#N/A' || val === '#DIV/0!' || val === '#NUM!') return fallback;
    return val;
}

export function safeNum(val) {
    if (typeof val === 'number' && !isNaN(val)) return val;
    return 0;
}

export function excelDateToJS(serial) {
    if (serial instanceof Date) return serial;
    if (typeof serial !== 'number') return null;
    const utc_days = Math.floor(serial - 25569);
    return new Date(utc_days * 86400 * 1000);
}

export const COLORS = [
    '#3182f6', '#6c5ce7', '#00b894', '#fdcb6e', '#e17055',
    '#0984e3', '#00cec9', '#fab1a0', '#a29bfe', '#55efc4',
    '#ff7675', '#74b9ff', '#ffeaa7', '#dfe6e9', '#b2bec3'
];

/**
 * XIRR (Internal Rate of Return for irregular cash flows)
 * Newton-Raphson implementation
 */
export function calculateXIRR(payments) {
    if (payments.length < 2) return 0;

    // Convert dates to fractional years from start
    const startTime = new Date(payments[0].date).getTime();
    const flows = payments.map(p => ({
        amount: p.amount,
        t: (new Date(p.date).getTime() - startTime) / (365.2425 * 24 * 60 * 60 * 1000)
    }));

    let rate = 0.1; // Initial guess
    const maxIteration = 50;
    const precision = 1e-7;

    for (let i = 0; i < maxIteration; i++) {
        let f = 0;
        let df = 0;

        for (const { amount, t } of flows) {
            const factor = Math.pow(1 + rate, t);
            f += amount / factor;
            df -= (t * amount) / (factor * (1 + rate));
        }

        const nextRate = rate - f / df;
        if (Math.abs(nextRate - rate) < precision) return nextRate;
        rate = nextRate;
        if (isNaN(rate) || !isFinite(rate)) break;
    }
    return rate;
}

export function getMonthlyHistory(items, dateField, amountField, months) {
    const map = {};
    items.forEach(item => {
        const d = item[dateField];
        if (!d) return;
        const ym = String(d).substring(0, 7);
        map[ym] = (map[ym] || 0) + (item[amountField] || 0);
    });
    return months.map(m => map[m] || 0);
}
