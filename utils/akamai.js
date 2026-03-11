import { URL } from 'url';
import { getLogger } from '../logger.js';
import { extractSecChUa } from './helpers.js';

const logger = getLogger('salamoonder.utils.akamai');

export class AkamaiWeb {
    constructor(client) {
        this.client = client;
    }

    _getAkamaiUrl(html, websiteUrl) {
        const match = html.match(/<script type="text\/javascript".*?src="((\/[0-9A-Za-z\-\_]+)+)">/);
        const akamaiUrlPath = match?.[1];

        if (!akamaiUrlPath) {
            logger.warning('Failed to extract Akamai URL path from HTML');
            return [null, null];
        }

        const parsed = new URL(websiteUrl);
        const baseUrl = `${parsed.protocol}//${parsed.hostname}`;
        const akamaiUrl = new URL(akamaiUrlPath, baseUrl).toString();
        logger.debug('Extracted Akamai URL: %s', akamaiUrl);
        return [baseUrl, akamaiUrl];
    }

    async fetchAndExtract(websiteUrl, userAgent, proxy = null) {
        logger.info('Starting Akamai extraction for: %s', websiteUrl);
        this.client.headers = {};

        const secChUa = extractSecChUa(userAgent);
        logger.debug('Generated sec-ch-ua: %s', secChUa);

        const headers = {
            'sec-ch-ua': secChUa,
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'upgrade-insecure-requests': '1',
            'user-agent': userAgent,
            accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'sec-fetch-site': 'none',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-user': '?1',
            'sec-fetch-dest': 'document',
            'accept-language': 'en-US,en;q=0.9',
            priority: 'u=0, i',
        };

        logger.info('Fetching initial page...');
        const resp = await this.client.get(websiteUrl, { headers, proxy, verify: false, impersonate: 'chrome133a' });

        if (resp.statusCode !== 200) {
            logger.error('Initial request failed with status %d: %s', resp.statusCode, resp.text);
            return null;
        }

        const [baseUrl, akamaiUrl] = this._getAkamaiUrl(resp.text, websiteUrl);
        if (!akamaiUrl) {
            logger.error('Failed to parse Akamai URL from response');
            return null;
        }
        logger.info('Akamai URL: %s', akamaiUrl);

        const abck = resp.cookies.get('_abck');
        if (!abck) {
            logger.error('_abck cookie not found in initial response');
            return null;
        }
        logger.debug('Found _abck cookie: %s...', abck.substring(0, 50));

        Object.assign(headers, {
            referer: websiteUrl,
            origin: baseUrl,
            accept: '*/*',
            'sec-fetch-site': 'same-origin',
            'sec-fetch-dest': 'script',
            'sec-fetch-mode': 'no-cors',
        });
        
        delete headers['upgrade-insecure-requests'];
        delete headers['sec-fetch-user'];
        delete headers['priority'];

        logger.info('Fetching Akamai script...');
        const scriptResp = await this.client.get(akamaiUrl, { headers, proxy, verify: false, impersonate: 'chrome133a' });

        if (scriptResp.statusCode !== 200) {
            logger.error('Script fetch failed with status %d', scriptResp.statusCode);
            return null;
        }

        const bmSz = this.client.cookies.get('bm_sz');
        if (!bmSz) {
            logger.error('bm_sz cookie not found');
            return null;
        }

        logger.info('Successfully extracted all Akamai data');
        logger.debug('bm_sz: %s', bmSz);
        logger.debug('Script data length: %d bytes', scriptResp.text.length);

        return { base_url: baseUrl, akamai_url: akamaiUrl, script_data: scriptResp.text, abck, bm_sz: bmSz };
    }

    async postSensor(akamaiUrl, sensorData, userAgent, websiteUrl, proxy = null) {
        logger.info('Posting sensor data to Akamai endpoint');
        logger.debug('Current session cookies: %s', JSON.stringify(this.client.cookies.getDict()));

        const parsed = new URL(websiteUrl);
        const baseUrl = `${parsed.protocol}//${parsed.hostname}`;

        const headers = {
            'sec-ch-ua': extractSecChUa(userAgent),
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'user-agent': userAgent,
            'content-type': 'application/json',
            accept: '*/*',
            origin: baseUrl,
            referer: websiteUrl,
            'sec-fetch-site': 'same-origin',
            'sec-fetch-mode': 'cors',
            'sec-fetch-dest': 'empty',
            'accept-language': 'en-US,en;q=0.9',
        };

        const payload = { sensor_data: sensorData };
        logger.debug('Posting sensor data, payload size: %d bytes', JSON.stringify(payload).length);

        const resp = await this.client.post(akamaiUrl, { headers, json: payload, proxy, verify: false, impersonate: 'chrome133a' });

        if (resp.statusCode !== 201) {
            logger.error('Sensor post failed with status %d: %s', resp.statusCode, resp.text.substring(0, 200));
            try {
                if (JSON.parse(resp.text).success === 'false') {
                    logger.error('Response indicates failure: %s', resp.text);
                    return null;
                }
            } catch {}
            return null;
        }

        logger.info('Sensor post response: status=%d', resp.statusCode);

        const abck = resp.cookies.get('_abck');
        if (!abck) {
            logger.warning('No updated _abck cookie found in response');
            return null;
        }

        const bmSz = resp.cookies.get('bm_sz') || this.client.cookies.get('bm_sz');
        logger.info('Successfully posted sensor data and received updated _abck');
        logger.debug('Updated _abck: %s...', abck.substring(0, 50));
        logger.debug('Session cookies after request: %s', JSON.stringify(this.client.cookies.getDict()));

        return { _abck: abck, bm_sz: bmSz, cookies: this.client.cookies.getDict() };
    }
}

export class AkamaiSBSD {
    constructor(client) {
        this.client = client;
    }

    _getSbsdUrl(html, baseUrl) {
        const match = html.match(/<script[^>]+src=["']([^"']*\/\.well-known\/sbsd\/[^"']+)["']/i);
        if (!match) return null;
        try { return new URL(match[1], baseUrl).toString(); }
        catch { return null; }
    }

    async fetchAndExtract(websiteUrl, userAgent, proxy = null) {
        logger.info('Starting SBSD extraction for: %s', websiteUrl);
        this.client.headers = {};

        const headers = {
            'sec-ch-ua': extractSecChUa(userAgent),
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'upgrade-insecure-requests': '1',
            'user-agent': userAgent,
            accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'sec-fetch-site': 'none',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-user': '?1',
            'sec-fetch-dest': 'document',
            'accept-language': 'en-US,en;q=0.9',
            priority: 'u=0, i',
        };

        logger.info('Fetching initial page...');
        const resp = await this.client.get(websiteUrl, { headers, proxy, verify: false, impersonate: 'chrome133a' });

        if (resp.statusCode !== 200) {
            logger.error('Initial request failed: %d', resp.statusCode);
            return null;
        }

        const parsed = new URL(websiteUrl);
        const baseUrl = `${parsed.protocol}//${parsed.hostname}`;
        const sbsdUrl = this._getSbsdUrl(resp.text, baseUrl);

        if (!sbsdUrl) {
            logger.error('Failed to parse SBSD URL');
            return null;
        }
        logger.info('SBSD URL: %s', sbsdUrl);

        Object.assign(headers, {
            referer: websiteUrl,
            origin: baseUrl,
            accept: '*/*',
            'sec-fetch-site': 'same-origin',
            'sec-fetch-dest': 'script',
            'sec-fetch-mode': 'no-cors',
        });
        delete headers['upgrade-insecure-requests'];
        delete headers['sec-fetch-user'];
        delete headers['priority'];

        logger.info('Fetching SBSD script...');
        const scriptResp = await this.client.get(sbsdUrl, { headers, proxy, verify: false, impersonate: 'chrome133a' });

        if (scriptResp.statusCode !== 200) {
            logger.error('SBSD script fetch failed: %d', scriptResp.statusCode);
            return null;
        }

        const cookies = this.client.cookies;
        const bmSo = cookies.get('bm_so');
        const sbsdO = cookies.get('sbsd_o');

        let cookieName, cookieValue;
        if (bmSo) { cookieName = 'bm_so'; cookieValue = bmSo; }
        else if (sbsdO) { cookieName = 'sbsd_o'; cookieValue = sbsdO; }
        else {
            logger.error('Neither bm_so nor sbsd_o cookie found');
            return null;
        }

        logger.info('Successfully extracted SBSD data');
        logger.debug('Using cookie: %s', cookieName);
        logger.debug('Script data length: %d bytes', scriptResp.text.length);

        return { base_url: baseUrl, sbsd_url: sbsdUrl, script_data: scriptResp.text, cookie_name: cookieName, cookie_value: cookieValue };
    }

    async postSbsd(sbsdPayload, postUrl, userAgent, websiteUrl, proxy = null) {
        logger.info('Posting SBSD payload');

        let decoded;
        try { decoded = Buffer.from(sbsdPayload, 'base64').toString('utf-8'); }
        catch (e) {
            logger.error('SBSD payload decode failed: %s', e);
            return null;
        }

        const parsed = new URL(websiteUrl);
        const baseUrl = `${parsed.protocol}//${parsed.hostname}`;
        const parsedPost = new URL(postUrl);
        const cleanPostUrl = `${parsedPost.protocol}//${parsedPost.hostname}${parsedPost.pathname}`;

        const headers = {
            'sec-ch-ua': extractSecChUa(userAgent),
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'user-agent': userAgent,
            'content-type': 'application/json',
            accept: '*/*',
            origin: baseUrl,
            referer: websiteUrl,
            'sec-fetch-site': 'same-origin',
            'sec-fetch-mode': 'cors',
            'sec-fetch-dest': 'empty',
            'accept-language': 'en-US,en;q=0.9',
            priority: 'u=1, i',
        };

        logger.debug('SBSD post payload size: %d bytes', decoded.length);
        logger.debug('SBSD post URL: %s', cleanPostUrl);

        const resp = await this.client.post(cleanPostUrl, { headers, json: { body: decoded }, proxy, verify: false, impersonate: 'chrome133a' });
        logger.info('SBSD response status: %d', resp.statusCode);

        if (resp.statusCode !== 200) {
            logger.error('SBSD post failed: %s', resp.text.substring(0, 200));
            return null;
        }

        const cookies = this.client.cookies.getDict();
        if (!Object.keys(cookies).length) {
            logger.warning('No cookies set after SBSD post');
            return null;
        }

        logger.info('SBSD post succeeded');
        logger.debug('Session cookies: %s', JSON.stringify(cookies));
        return { cookies };
    }
}

export default { AkamaiWeb, AkamaiSBSD };
