// Icon helper using Google Material Symbols Rounded
// Usage: icon('bar_chart'), icon('savings', 20)

export function icon(name, size = 18) {
    return `<span class="material-symbols-rounded mi" style="font-size:${size}px">${name}</span>`;
}

// Predefined icon shortcuts for common use
export const icons = {
    // Charts & Data
    chartBar: (s) => icon('bar_chart', s),
    chartLine: (s) => icon('show_chart', s),
    chartPie: (s) => icon('donut_large', s),
    barChart: (s) => icon('leaderboard', s),
    trendingUp: (s) => icon('trending_up', s),

    // Finance
    wallet: (s) => icon('account_balance_wallet', s),
    dollarSign: (s) => icon('payments', s),
    target: (s) => icon('track_changes', s),
    flag: (s) => icon('flag', s),
    briefcase: (s) => icon('work', s),

    // File & Data
    save: (s) => icon('save', s),
    folder: (s) => icon('folder_open', s),
    clipboard: (s) => icon('assignment', s),
    fileText: (s) => icon('description', s),

    // UI
    lock: (s) => icon('lock', s),
    inbox: (s) => icon('inbox', s),
    alertTriangle: (s) => icon('warning', s),
    crystal: (s) => icon('auto_awesome', s),
    factory: (s) => icon('factory', s),
};
