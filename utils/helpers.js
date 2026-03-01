export function extractSecChUa(userAgent) {
    const chromeMatch = userAgent.match(/Chrome\/(\d+)/);
    if (!chromeMatch) return '"Chromium";v="122", "Google Chrome";v="122", "Not?A_Brand";v="99"';
    const v = chromeMatch[1];
    return `"Chromium";v="${v}", "Google Chrome";v="${v}", "Not?A_Brand";v="99"`;
}
