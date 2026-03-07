// Stock service to handle price fetching and ticker search

const POPULAR_TICKERS = [
    // ── 국내 코스피 대형주 ──────────────────────────────
    { name: '삼성전자', ticker: '005930', exchange: 'KRX' },
    { name: '삼성전자우', ticker: '005935', exchange: 'KRX' },
    { name: 'SK하이닉스', ticker: '000660', exchange: 'KRX' },
    { name: 'LG에너지솔루션', ticker: '373220', exchange: 'KRX' },
    { name: '삼성바이오로직스', ticker: '207940', exchange: 'KRX' },
    { name: '현대차', ticker: '005380', exchange: 'KRX' },
    { name: '기아', ticker: '000270', exchange: 'KRX' },
    { name: '셀트리온', ticker: '068270', exchange: 'KRX' },
    { name: 'KB금융', ticker: '105560', exchange: 'KRX' },
    { name: '신한지주', ticker: '055550', exchange: 'KRX' },
    { name: '하나금융지주', ticker: '086790', exchange: 'KRX' },
    { name: '우리금융지주', ticker: '316140', exchange: 'KRX' },
    { name: 'POSCO홀딩스', ticker: '005490', exchange: 'KRX' },
    { name: 'LG화학', ticker: '051910', exchange: 'KRX' },
    { name: 'LG전자', ticker: '066570', exchange: 'KRX' },
    { name: 'NAVER', ticker: '035420', exchange: 'KRX' },
    { name: '카카오', ticker: '035720', exchange: 'KRX' },
    { name: 'SK이노베이션', ticker: '096770', exchange: 'KRX' },
    { name: 'SK텔레콤', ticker: '017670', exchange: 'KRX' },
    { name: 'KT&G', ticker: '033780', exchange: 'KRX' },
    { name: '한국전력', ticker: '015760', exchange: 'KRX' },
    { name: '현대모비스', ticker: '012330', exchange: 'KRX' },
    { name: '삼성물산', ticker: '028260', exchange: 'KRX' },
    { name: '삼성생명', ticker: '032830', exchange: 'KRX' },
    { name: '고려아연', ticker: '010130', exchange: 'KRX' },
    { name: 'HD현대일렉트릭', ticker: '267260', exchange: 'KRX' },
    { name: 'HD한국조선해양', ticker: '009540', exchange: 'KRX' },
    { name: '한화에어로스페이스', ticker: '012450', exchange: 'KRX' },
    { name: 'KT', ticker: '030200', exchange: 'KRX' },
    { name: 's-oil', ticker: '010950', exchange: 'KRX' },

    // ── 국내 코스닥 주요주 ──────────────────────────────
    { name: '에코프로비엠', ticker: '247540', exchange: 'KOSDAQ' },
    { name: '에코프로', ticker: '086520', exchange: 'KOSDAQ' },
    { name: 'HLB', ticker: '028300', exchange: 'KOSDAQ' },
    { name: '알테오젠', ticker: '196170', exchange: 'KOSDAQ' },
    { name: '리가켐바이오', ticker: '141080', exchange: 'KOSDAQ' },
    { name: '클래시스', ticker: '214150', exchange: 'KOSDAQ' },
    { name: '레인보우로보틱스', ticker: '277810', exchange: 'KOSDAQ' },
    { name: '엔씨소프트', ticker: '036570', exchange: 'KOSDAQ' },
    { name: '카카오게임즈', ticker: '293490', exchange: 'KOSDAQ' },
    { name: '크래프톤', ticker: '259960', exchange: 'KRX' },
    { name: '펄어비스', ticker: '263750', exchange: 'KOSDAQ' },

    // ── 국내 ETF - 미국 지수 ────────────────────────────
    { name: 'TIGER 미국S&P500', ticker: '360750', exchange: 'KRX' },
    { name: 'TIGER 미국나스닥100', ticker: '133690', exchange: 'KRX' },
    { name: 'TIGER 미국배당다우존스', ticker: '458730', exchange: 'KRX' },
    { name: 'TIGER 미국테크TOP10 INDXX', ticker: '381170', exchange: 'KRX' },
    { name: 'KODEX 미국S&P500TR', ticker: '379800', exchange: 'KRX' },
    { name: 'KODEX 미국나스닥100TR', ticker: '379810', exchange: 'KRX' },
    { name: 'KINDEX 미국S&P500', ticker: '360200', exchange: 'KRX' },
    { name: 'ACE 미국S&P500', ticker: '360200', exchange: 'KRX' },
    { name: 'TIGER 미국배당+3%프리미엄다우존스', ticker: '481490', exchange: 'KRX' },
    { name: 'ACE 미국배당다우존스', ticker: '402970', exchange: 'KRX' },
    { name: 'SOL 미국배당다우존스', ticker: '446720', exchange: 'KRX' },
    { name: 'RISE 미국배당다우존스', ticker: '441680', exchange: 'KRX' },
    { name: 'TIGER 미국나스닥100+15%프리미엄', ticker: '472160', exchange: 'KRX' },

    // ── 국내 ETF - 국내 지수 ────────────────────────────
    { name: 'KODEX 200', ticker: '069500', exchange: 'KRX' },
    { name: 'TIGER 200', ticker: '102110', exchange: 'KRX' },
    { name: 'KODEX 코스닥150', ticker: '229200', exchange: 'KRX' },
    { name: 'TIGER 코스닥150', ticker: '232080', exchange: 'KRX' },
    { name: 'KODEX 레버리지', ticker: '122630', exchange: 'KRX' },
    { name: 'KODEX 인버스', ticker: '114800', exchange: 'KRX' },

    // ── 국내 ETF - 채권/현금 ───────────────────────────
    { name: 'KODEX KOFR금리액티브(합성)', ticker: '453850', exchange: 'KRX' },
    { name: 'TIGER CD금리투자KIS(합성)', ticker: '462340', exchange: 'KRX' },
    { name: 'KODEX 단기채권PLUS', ticker: '214980', exchange: 'KRX' },
    { name: 'ACE 미국30년국채액티브(H)', ticker: '453010', exchange: 'KRX' },
    { name: 'TIGER 미국채10년선물', ticker: '305080', exchange: 'KRX' },
    { name: 'KODEX 미국채울트라30년선물(H)', ticker: '304660', exchange: 'KRX' },

    // ── 국내 ETF - 글로벌/테마 ─────────────────────────
    { name: 'TIGER 차이나CSI300', ticker: '192090', exchange: 'KRX' },
    { name: 'TIGER 일본니케이225', ticker: '241180', exchange: 'KRX' },
    { name: 'TIGER 금은선물(H)', ticker: '284430', exchange: 'KRX' },
    { name: 'ACE KRX금현물', ticker: '411060', exchange: 'KRX' },

    // ── 미국 주식 - 빅테크/성장주 ──────────────────────
    { name: 'Apple Inc.', ticker: 'AAPL', exchange: 'NASDAQ' },
    { name: 'Microsoft Corp', ticker: 'MSFT', exchange: 'NASDAQ' },
    { name: 'NVIDIA Corp', ticker: 'NVDA', exchange: 'NASDAQ' },
    { name: 'Amazon.com Inc', ticker: 'AMZN', exchange: 'NASDAQ' },
    { name: 'Alphabet (Google) Class A', ticker: 'GOOGL', exchange: 'NASDAQ' },
    { name: 'Alphabet (Google) Class C', ticker: 'GOOG', exchange: 'NASDAQ' },
    { name: 'Meta Platforms', ticker: 'META', exchange: 'NASDAQ' },
    { name: 'Tesla, Inc.', ticker: 'TSLA', exchange: 'NASDAQ' },
    { name: 'Broadcom Inc.', ticker: 'AVGO', exchange: 'NASDAQ' },
    { name: 'Netflix Inc.', ticker: 'NFLX', exchange: 'NASDAQ' },
    { name: 'Adobe Inc.', ticker: 'ADBE', exchange: 'NASDAQ' },
    { name: 'Salesforce Inc.', ticker: 'CRM', exchange: 'NYSE' },
    { name: 'Advanced Micro Devices', ticker: 'AMD', exchange: 'NASDAQ' },
    { name: 'Intel Corp', ticker: 'INTC', exchange: 'NASDAQ' },
    { name: 'Qualcomm Inc.', ticker: 'QCOM', exchange: 'NASDAQ' },
    { name: 'Taiwan Semiconductor (TSM)', ticker: 'TSM', exchange: 'NYSE' },
    { name: 'ASML Holding', ticker: 'ASML', exchange: 'NASDAQ' },
    { name: 'Palantir Technologies', ticker: 'PLTR', exchange: 'NASDAQ' },
    { name: 'Super Micro Computer', ticker: 'SMCI', exchange: 'NASDAQ' },

    // ── 미국 주식 - 금융/전통주 ────────────────────────
    { name: 'Berkshire Hathaway B', ticker: 'BRK-B', exchange: 'NYSE' },
    { name: 'JPMorgan Chase', ticker: 'JPM', exchange: 'NYSE' },
    { name: 'Visa Inc.', ticker: 'V', exchange: 'NYSE' },
    { name: 'Mastercard Inc.', ticker: 'MA', exchange: 'NYSE' },
    { name: 'Johnson & Johnson', ticker: 'JNJ', exchange: 'NYSE' },
    { name: 'UnitedHealth Group', ticker: 'UNH', exchange: 'NYSE' },
    { name: 'Eli Lilly', ticker: 'LLY', exchange: 'NYSE' },
    { name: 'ExxonMobil Corp', ticker: 'XOM', exchange: 'NYSE' },
    { name: 'Chevron Corp', ticker: 'CVX', exchange: 'NYSE' },
    { name: 'Walmart Inc.', ticker: 'WMT', exchange: 'NYSE' },
    { name: 'Home Depot', ticker: 'HD', exchange: 'NYSE' },
    { name: 'Procter & Gamble', ticker: 'PG', exchange: 'NYSE' },
    { name: 'Coca-Cola Co', ticker: 'KO', exchange: 'NYSE' },
    { name: 'PepsiCo Inc.', ticker: 'PEP', exchange: 'NASDAQ' },
    { name: 'McDonald\'s Corp', ticker: 'MCD', exchange: 'NYSE' },
    { name: 'Starbucks Corp', ticker: 'SBUX', exchange: 'NASDAQ' },

    // ── 미국 ETF - 지수형 ──────────────────────────────
    { name: 'VOO (Vanguard S&P500)', ticker: 'VOO', exchange: 'NYSE' },
    { name: 'VTI (Vanguard Total Market)', ticker: 'VTI', exchange: 'NYSE' },
    { name: 'QQQ (Invesco Nasdaq100)', ticker: 'QQQ', exchange: 'NASDAQ' },
    { name: 'SPY (SPDR S&P500)', ticker: 'SPY', exchange: 'NYSE' },
    { name: 'IVV (iShares S&P500)', ticker: 'IVV', exchange: 'NYSE' },
    { name: 'VGT (Vanguard IT)', ticker: 'VGT', exchange: 'NYSE' },
    { name: 'SOXL (Semiconductors 3x Lev)', ticker: 'SOXL', exchange: 'NYSE' },
    { name: 'TQQQ (Nasdaq100 3x Lev)', ticker: 'TQQQ', exchange: 'NASDAQ' },
    { name: 'SPXL (S&P500 3x Lev)', ticker: 'SPXL', exchange: 'NYSE' },

    // ── 미국 ETF - 배당형 ──────────────────────────────
    { name: 'SCHD (Schwab US Dividend)', ticker: 'SCHD', exchange: 'NYSE' },
    { name: 'VYM (Vanguard High Dividend)', ticker: 'VYM', exchange: 'NYSE' },
    { name: 'DVY (iShares Dividend)', ticker: 'DVY', exchange: 'NASDAQ' },
    { name: 'JEPI (JPMorgan Equity Premium)', ticker: 'JEPI', exchange: 'NYSE' },
    { name: 'JEPQ (JPMorgan Nasdaq Premium)', ticker: 'JEPQ', exchange: 'NASDAQ' },
    { name: 'QYLD (Nasdaq Covered Call)', ticker: 'QYLD', exchange: 'NASDAQ' },
    { name: 'XYLD (S&P500 Covered Call)', ticker: 'XYLD', exchange: 'NYSE' },
    { name: 'RYLD (Russell Covered Call)', ticker: 'RYLD', exchange: 'NYSE' },
    { name: 'O (Realty Income REIT)', ticker: 'O', exchange: 'NYSE' },
    { name: 'MAIN (Main Street Capital)', ticker: 'MAIN', exchange: 'NYSE' },
    { name: 'AGNC Investment Corp', ticker: 'AGNC', exchange: 'NASDAQ' },

    // ── 미국 ETF - 채권/원자재 ─────────────────────────
    { name: 'TLT (iShares 20Y Treasury)', ticker: 'TLT', exchange: 'NASDAQ' },
    { name: 'BND (Vanguard Total Bond)', ticker: 'BND', exchange: 'NASDAQ' },
    { name: 'GLD (SPDR Gold)', ticker: 'GLD', exchange: 'NYSE' },
    { name: 'IAU (iShares Gold)', ticker: 'IAU', exchange: 'NYSE' },
    { name: 'SLV (iShares Silver)', ticker: 'SLV', exchange: 'NYSE' },
    { name: 'USO (US Oil Fund)', ticker: 'USO', exchange: 'NYSE' },

    // ── 암호화폐 (업비트 KRW 마켓) ─────────────────────
    { name: '비트코인 (BTC)', ticker: 'BTC', exchange: 'UPBIT' },
    { name: '이더리움 (ETH)', ticker: 'ETH', exchange: 'UPBIT' },
    { name: '리플 (XRP)', ticker: 'XRP', exchange: 'UPBIT' },
    { name: '솔라나 (SOL)', ticker: 'SOL', exchange: 'UPBIT' },
    { name: '에이다 (ADA)', ticker: 'ADA', exchange: 'UPBIT' },
    { name: '도지코인 (DOGE)', ticker: 'DOGE', exchange: 'UPBIT' },
    { name: '아발란체 (AVAX)', ticker: 'AVAX', exchange: 'UPBIT' },
    { name: '폴리곤 (POL)', ticker: 'POL', exchange: 'UPBIT' },
    { name: '도트 (DOT)', ticker: 'DOT', exchange: 'UPBIT' },
    { name: '체인링크 (LINK)', ticker: 'LINK', exchange: 'UPBIT' },
    { name: '코스모스 (ATOM)', ticker: 'ATOM', exchange: 'UPBIT' },
    { name: '수이 (SUI)', ticker: 'SUI', exchange: 'UPBIT' },
    { name: '트론 (TRX)', ticker: 'TRX', exchange: 'UPBIT' },
    { name: '샌드박스 (SAND)', ticker: 'SAND', exchange: 'UPBIT' },
    { name: '더그래프 (GRT)', ticker: 'GRT', exchange: 'UPBIT' },
    { name: '클레이튼 (KLAY)', ticker: 'KLAY', exchange: 'UPBIT' },
    { name: '스텔라루멘 (XLM)', ticker: 'XLM', exchange: 'UPBIT' },
    { name: '이오스 (EOS)', ticker: 'EOS', exchange: 'UPBIT' },
    { name: '니어프로토콜 (NEAR)', ticker: 'NEAR', exchange: 'UPBIT' },
    { name: '앱토스 (APT)', ticker: 'APT', exchange: 'UPBIT' },
    { name: '아비트럼 (ARB)', ticker: 'ARB', exchange: 'UPBIT' },
    { name: '옵티미즘 (OP)', ticker: 'OP', exchange: 'UPBIT' },
    { name: '인젝티브 (INJ)', ticker: 'INJ', exchange: 'UPBIT' },
    { name: '비트코인캐시 (BCH)', ticker: 'BCH', exchange: 'UPBIT' },
    { name: '이더리움클래식 (ETC)', ticker: 'ETC', exchange: 'UPBIT' },
    { name: '라이트코인 (LTC)', ticker: 'LTC', exchange: 'UPBIT' },
    { name: '시바이누 (SHIB)', ticker: 'SHIB', exchange: 'UPBIT' },
];

// Using a CORS proxy for client-side fetches
// api.allorigins.win wraps responses in { contents: "..." }
const PROXY_BASE = 'https://api.allorigins.win/get?url=';

async function proxiedFetch(targetUrl) {
    const url = `${PROXY_BASE}${encodeURIComponent(targetUrl)}`;
    const response = await fetch(url);
    const wrapper = await response.json();
    return JSON.parse(wrapper.contents);
}

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
        const data = await proxiedFetch(targetUrl);

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

// Upbit 공개 API로 암호화폐 현재가 조회 (KRW 원화 기준, 프록시 불필요)
async function fetchCryptoPrice(ticker) {
    try {
        const market = `KRW-${ticker.toUpperCase()}`;
        const response = await fetch(`https://api.upbit.com/v1/ticker?markets=${market}`);
        const data = await response.json();
        if (data && data[0] && data[0].trade_price) {
            return data[0].trade_price;
        }
    } catch (e) {
        console.error(`Failed to fetch crypto price for ${ticker}:`, e);
    }
    return null;
}

export async function fetchCurrentPrice(ticker, exchange) {
    // 암호화폐(업비트)는 별도 API 사용
    if (exchange === 'UPBIT') {
        return fetchCryptoPrice(ticker);
    }

    try {
        let symbol = ticker;
        if (exchange === 'KRX') {
            symbol = (ticker.length === 6 && !isNaN(ticker)) ? ticker + '.KS' : ticker;
        } else if (exchange === 'KOSDAQ') {
            symbol = ticker + '.KQ';
        }

        const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`;
        const data = await proxiedFetch(targetUrl);

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
        const data = await proxiedFetch(targetUrl);
        if (data.chart && data.chart.result) return data.chart.result[0].meta.regularMarketPrice;
    } catch (e) { }
    return 1400; // Fallback
}
