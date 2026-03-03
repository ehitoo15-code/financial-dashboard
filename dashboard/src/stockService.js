// Stock service to handle price fetching and ticker search

const POPULAR_TICKERS = [
    { name: '삼성전자', ticker: '005930', exchange: 'KRX' },
    { name: 'SK하이닉스', ticker: '000660', exchange: 'KRX' },
    { name: '현대차', ticker: '005380', exchange: 'KRX' },
    { name: 'NAVER', ticker: '035420', exchange: 'KRX' },
    { name: '카카오', ticker: '035720', exchange: 'KRX' },
    { name: 'TIGER 미국배당다우존스', ticker: '458730', exchange: 'KRX' },
    { name: 'TIGER 미국S&P500', ticker: '360750', exchange: 'KRX' },
    { name: 'TIGER 미국나스닥100', ticker: '133690', exchange: 'KRX' },
    { name: 'KODEX 200', ticker: '069500', exchange: 'KRX' },
    { name: 'Apple Inc.', ticker: 'AAPL', exchange: 'NASDAQ' },
    { name: 'Microsoft Corp', ticker: 'MSFT', exchange: 'NASDAQ' },
    { name: 'Tesla, Inc.', ticker: 'TSLA', exchange: 'NASDAQ' },
    { name: 'NVIDIA Corp', ticker: 'NVDA', exchange: 'NASDAQ' },
    { name: 'Amazon.com Inc', ticker: 'AMZN', exchange: 'NASDAQ' },
    { name: 'SCHD', ticker: 'SCHD', exchange: 'NYSE' },
    { name: 'JEPI', ticker: 'JEPI', exchange: 'NYSE' },
    { name: 'O (Realty Income)', ticker: 'O', exchange: 'NYSE' },
];

// Using a CORS proxy for client-side fetches
const PROXY = 'https://corsproxy.io/?';

export async function searchStocks(query) {
    if (!query || query.length < 2) return [];

    // First check popular ones
    const q = query.toLowerCase();
    const localMatches = POPULAR_TICKERS.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.ticker.toLowerCase().includes(q)
    );

    try {
        const targetUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0&enableFuzzyQuery=false&enableEnhancedTrivialQuery=true`;
        const url = `${PROXY}${encodeURIComponent(targetUrl)}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.quotes) {
            const apiMatches = data.quotes.map(q => {
                let exch = 'NASDAQ';
                if (q.exchange === 'NMS' || q.exchange === 'NGM') exch = 'NASDAQ';
                else if (q.exchange === 'NYQ') exch = 'NYSE';
                else if (q.exchange === 'PCX') exch = 'AMEX';
                else if (q.exchange === 'KSC' || q.exchange === 'KS') exch = 'KRX';

                return {
                    name: q.shortname || q.longname || q.symbol,
                    ticker: q.symbol.split('.')[0],
                    exchange: exch,
                    fullSymbol: q.symbol
                };
            });
            // Merge local and API matches, priority to local
            const seen = new Set(localMatches.map(m => m.ticker));
            return [...localMatches, ...apiMatches.filter(m => !seen.has(m.ticker))];
        }
    } catch (e) {
        console.error('Failed to search stocks:', e);
    }
    return localMatches;
}

export async function fetchCurrentPrice(ticker, exchange) {
    try {
        let symbol = ticker;
        if (exchange === 'KRX') {
            symbol = (ticker.length === 6 && !isNaN(ticker)) ? ticker + '.KS' : ticker;
        } else if (exchange === 'KOSDAQ') {
            symbol = ticker + '.KQ';
        }

        const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`;
        const url = `${PROXY}${encodeURIComponent(targetUrl)}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.chart && data.chart.result && data.chart.result[0]) {
            return data.chart.result[0].meta.regularMarketPrice;
        }
    } catch (e) {
        console.error(`Failed to fetch price for ${ticker}:`, e);
    }
    return null;
}

export async function getExchangeRate() {
    try {
        const targetUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/USDKRW=X?interval=1m&range=1d';
        const url = `${PROXY}${encodeURIComponent(targetUrl)}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.chart && data.chart.result) return data.chart.result[0].meta.regularMarketPrice;
    } catch (e) { }
    return 1400; // Fallback
}
