import { URL } from 'url';
import { getLogger } from '../logger.js';
import { extractSecChUa } from './helpers.js';

const logger = getLogger('salamoonder.utils.kasada');

export class Kasada {
    constructor(client) {
        this.client = client;
    }

    _getScriptUrl(html, baseUrl) {
        const externalScripts = html.match(/<script\s+src=["']([^"']+)["']/g) || [];
        const scriptUrls = externalScripts
            .map(tag => tag.match(/src=["']([^"']+)["']/)?.[1])
            .filter(Boolean);
        const inlineScripts = html.match(/<script[^>]*>(.*?)<\/script>/gs) || [];

        logger.debug('Found %d external and %d inline scripts', scriptUrls.length, inlineScripts.length);

        for (const script of inlineScripts) {
            const content = script.match(/<script[^>]*>(.*?)<\/script>/s)?.[1];
            if (!content) continue;
            if (content.includes('KPSDK.scriptStart') || content.includes('ips.js')) {
                logger.debug('Found inline Kasada script: %d bytes', content.length);
                return { type: 'inline', content: content.trim() };
            }
        }

        const resolvedUrls = scriptUrls.map(src => {
            src = src.replace(/&amp;/g, '&');
            return src.startsWith('http') ? src : `${baseUrl.replace(/\/$/, '')}/${src.replace(/^\//, '')}`;
        });

        logger.debug('Resolved %d external script URLs', resolvedUrls.length);
        return { type: 'external', urls: resolvedUrls };
    }

    async parseKasadaScript(url, userAgent, proxy = null) {
        logger.info('Starting Kasada script extraction for: %s', new URL(url).hostname);

        const parsedUrl = new URL(url);
        if (!new URLSearchParams(parsedUrl.search).has('x-kpsdk-v')) {
            logger.warning('x-kpsdk-v parameter not found in URL');
            return null;
        }

        this.client.headers = {};
        const baseUrl = `https://${parsedUrl.hostname}`;
        const fingerprintUrl = `${baseUrl}/149e9513-01fa-4fb0-aad4-566afd725d1b/2d206a39-8ed7-437e-a3be-862e0f06eea3/fp?x-kpsdk-v=j-1.2.170`;

        const headers = {
            'sec-ch-ua': extractSecChUa(userAgent),
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'upgrade-insecure-requests': '1',
            'user-agent': userAgent,
            accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'sec-fetch-site': 'same-site',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-dest': 'iframe',
            'accept-language': 'en-US,en;q=0.9',
            referer: `${baseUrl}/`,
            priority: 'u=0, i',
        };

        logger.info('Fetching fingerprint endpoint...');
        const resp = await this.client.get(fingerprintUrl, { headers, proxy, verify: false, impersonate: 'chrome133a' });

        if (resp.statusCode !== 429) {
            logger.warning('Expected 429 status code, got %d', resp.statusCode);
            return null;
        }

        const scriptData = this._getScriptUrl(resp.text, baseUrl);
        let scriptsContent = '';
        let scriptUrl = '';

        if (scriptData.type === 'inline') {
            scriptsContent = scriptData.content;
            logger.info('Using inline Kasada script');
        } else {
            logger.info('Fetching external Kasada script(s), %d URLs to check', scriptData.urls.length);
            for (let i = 0; i < scriptData.urls.length; i++) {
                const src = scriptData.urls[i];
                logger.debug('Fetching external script %d/%d: %s', i + 1, scriptData.urls.length, src.substring(0, 80));

                const scriptResp = await this.client.get(src, { headers, proxy, verify: false, impersonate: 'chrome133a' });
                if (scriptResp.text.includes('ips.js') || scriptResp.text.includes('KPSDK.scriptStart')) {
                    scriptsContent = scriptResp.text;
                    scriptUrl = scriptResp.url || src;
                    logger.info('Successfully fetched Kasada script from URL: %s', src.substring(0, 80));
                    break;
                }
            }
        }

        logger.debug('Final script size: %d bytes', scriptsContent.length);
        logger.info('Kasada extraction complete');

        return {
            script_content: `window.KPSDK={};KPSDK.now=typeof performance!=='undefined'&&performance.now?performance.now.bind(performance):Date.now.bind(Date);KPSDK.start=KPSDK.now(); ${scriptsContent}`,
            script_url: scriptUrl,
        };
    }

    async postPayload(url, solution, userAgent, proxy = null, mfc = false) {
        logger.info('Starting Kasada payload post for: %s', new URL(url).hostname);
        this.client.headers = {};

        const parsedUrl = new URL(url);
        const baseUrl = `https://${parsedUrl.hostname}`;
        const tlUrl = `${baseUrl}/149e9513-01fa-4fb0-aad4-566afd725d1b/2d206a39-8ed7-437e-a3be-862e0f06eea3/tl`;

        const headers = {
            'content-type': 'application/octet-stream',
            'sec-ch-ua-platform': '"Windows"',
            'sec-ch-ua': extractSecChUa(userAgent),
            'sec-ch-ua-mobile': '?0',
            'user-agent': userAgent,
            accept: '*/*',
            origin: baseUrl,
            'sec-fetch-site': 'same-origin',
            'sec-fetch-mode': 'cors',
            'sec-fetch-dest': 'empty',
            referer: `${baseUrl}/149e9513-01fa-4fb0-aad4-566afd725d1b/2d206a39-8ed7-437e-a3be-862e0f06eea3/fp?x-kpsdk-v=${solution.headers['x-kpsdk-v']}`,
            'accept-encoding': 'gzip, deflate, br, zstd',
            'accept-language': 'en-US,en;q=0.9',
            priority: 'u=1, i',
            'x-kpsdk-ct': solution.headers['x-kpsdk-ct'],
            'x-kpsdk-dt': solution.headers['x-kpsdk-dt'],
            'x-kpsdk-im': solution.headers['x-kpsdk-im'],
            'x-kpsdk-h': '01',
            'x-kpsdk-v': solution.headers['x-kpsdk-v'],
        };

        const payloadB64 = solution.payload;
        logger.debug('Payload size: %d bytes', Buffer.from(payloadB64, 'base64').length);

        const byteSession = await this.client._createSession({
            isByteRequest: true, forceHttp1: true, defaultHeaders: null,
            ...(proxy ? { proxyUrl: proxy } : {}),
        });
        if (!byteSession) throw new Error('tlsclientwrapper not available — cannot post binary payload');

        logger.info('Posting payload to /tl endpoint...');
        let resp;
        try { resp = await byteSession.post(tlUrl, payloadB64, { headers }); }
        finally { try { await byteSession.destroySession(); } catch {} }

        const flatHeaders = {};
        for (const [k, v] of Object.entries(resp.headers || {}))
            flatHeaders[k.toLowerCase()] = Array.isArray(v) ? v[0] : v;

        logger.info('Payload post response: status=%d', resp.status);

        if (resp.status !== 200) {
            logger.warning('Unexpected response status: %d - %s', resp.status, (resp.body || '').substring(0, 200));
            return null;
        }

        try {
            if (JSON.parse(resp.body).reload !== true) {
                logger.error('Response missing or has reload!=true: %s', resp.body);
                return null;
            }
        } catch {
            logger.error('Failed to parse response JSON: %s', (resp.body || '').substring(0, 200));
            return null;
        }

        const kpsdkR = flatHeaders['x-kpsdk-r'];
        if (!kpsdkR) { logger.error('Missing x-kpsdk-r header in response'); return null; }
        if (kpsdkR === '1-AA' || kpsdkR === '1-AQ') { logger.error('Bad fingerprint or proxy detected: x-kpsdk-r=%s', kpsdkR); return null; }

        const result = {
            response: { status_code: resp.status, text: resp.body, cookies: this.client.cookies.getDict(), headers: flatHeaders },
            'x-kpsdk-ct': flatHeaders['x-kpsdk-ct'] || null,
            'x-kpsdk-r': flatHeaders['x-kpsdk-r'] || null,
            'x-kpsdk-st': flatHeaders['x-kpsdk-st'] || null,
            'x-kpsdk-v': solution.headers['x-kpsdk-v'] || null,
        };

        if (mfc) {
            const mfcUrl = `${baseUrl}/149e9513-01fa-4fb0-aad4-566afd725d1b/2d206a39-8ed7-437e-a3be-862e0f06eea3/mfc`;
            const mfcResp = await this.client.get(mfcUrl, {
                headers: {
                    'sec-ch-ua-platform': '"Windows"',
                    'x-kpsdk-h': '01',
                    'sec-ch-ua': extractSecChUa(userAgent),
                    'sec-ch-ua-mobile': '?0',
                    'x-kpsdk-v': solution.headers['x-kpsdk-v'],
                    'user-agent': userAgent,
                    accept: '*/*',
                    'sec-fetch-site': 'same-origin',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-dest': 'empty',
                    referer: url,
                    'accept-encoding': 'gzip, deflate, br, zstd',
                    'accept-language': 'en-US,en;q=0.9',
                    priority: 'u=1, i',
                },
                proxy,
            });
            if (mfcResp.statusCode === 200) {
                result['x-kpsdk-h'] = mfcResp.headers['x-kpsdk-h'] || null;
                result['x-kpsdk-fc'] = mfcResp.headers['x-kpsdk-fc'] || null;
            }
        }

        return result;
    }
}

export default Kasada;
