import { URL } from 'url';
import { getLogger } from './logger.js';

const logger = getLogger('salamoonder.client');

export class APIError extends Error {
    constructor(message) {
        super(message);
        this.name = 'APIError';
    }
}

export class MissingAPIKeyError extends Error {
    constructor(message) {
        super(message);
        this.name = 'MissingAPIKeyError';
    }
}

export class SessionCookies {
    constructor() {
        this.cookies = new Map();
    }

    set(name, value, domain = null, path = '/') {
        this.cookies.set(`${domain || ''}:${path}:${name}`, { name, value, domain, path });
    }

    get(name) {
        for (const [, c] of this.cookies) {
            if (c.name === name) return c.value;
        }
        return undefined;
    }

    getDict() {
        const result = {};
        for (const [, c] of this.cookies) result[c.name] = c.value;
        return result;
    }

    getDictForUrl(urlString) {
        try {
            const url = new URL(urlString);
            const result = {};
            for (const [, c] of this.cookies) {
                if (!c.domain || url.hostname.endsWith(c.domain.replace(/^\./, '')))
                    result[c.name] = c.value;
            }
            return result;
        } catch {
            return {};
        }
    }

    clear() {
        this.cookies.clear();
    }
}

let _tlsClasses = null;

async function getTlsClasses() {
    if (!_tlsClasses) {
        try {
            const mod = await import('tlsclientwrapper');
            _tlsClasses = { SessionClient: mod.SessionClient, ModuleClient: mod.ModuleClient };
        } catch (e) {
            console.warn('tlsclientwrapper not available:', e.message);
            _tlsClasses = { available: false };
        }
    }
    return _tlsClasses;
}

let _sharedModuleClient = null;

async function getModuleClient() {
    const cls = await getTlsClasses();
    if (cls.available === false) return null;
    if (!_sharedModuleClient) _sharedModuleClient = new cls.ModuleClient();
    return _sharedModuleClient;
}

function flattenHeaders(headers) {
    const flat = {};
    for (const [k, v] of Object.entries(headers || {}))
        flat[k.toLowerCase()] = Array.isArray(v) ? v[0] : v;
    return flat;
}

export class SalamoonderSession {
    constructor(apiKey, baseUrl = 'https://salamoonder.com/api', impersonate = 'chrome_133') {
        if (!apiKey || !apiKey.trim()) {
            logger.error('Attempted to initialize client without API key');
            throw new MissingAPIKeyError('API key is required. Pass it when creating the client.');
        }
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.impersonate = impersonate;
        this.headers = {};
        this.cookies = new SessionCookies();
        this._session = null;
        logger.debug('Client initialized with base_url: %s, impersonate: %s', baseUrl, impersonate);
    }

    async _getSession(options = {}) {
        if (!this._session) {
            const cls = await getTlsClasses();
            if (cls.available === false) return null;
            this._session = new cls.SessionClient(await getModuleClient(), {
                tlsClientIdentifier: options.impersonate || this.impersonate,
                randomTlsExtensionOrder: true,
                timeoutSeconds: 30,
                followRedirects: false,
                isByteRequest: false,
            });
        }
        return this._session;
    }

    async _createSession(sessionOpts = {}) {
        const cls = await getTlsClasses();
        if (cls.available === false) return null;
        return new cls.SessionClient(await getModuleClient(), {
            tlsClientIdentifier: this.impersonate,
            randomTlsExtensionOrder: true,
            timeoutSeconds: 30,
            followRedirects: false,
            isByteRequest: false,
            ...sessionOpts,
        });
    }

    async _executeRequest(method, url, options = {}) {
        const session = options._session || await this._getSession(options);
        const headers = { ...this.headers, ...options.headers };

        const cookieDict = this.cookies.getDictForUrl(url);
        if (Object.keys(cookieDict).length) {
            const str = Object.entries(cookieDict).map(([k, v]) => `${k}=${v}`).join('; ');
            headers['cookie'] = headers['cookie'] ? `${headers['cookie']}; ${str}` : str;
        }

        const reqOpts = { headers };
        if (options.proxy) reqOpts.proxy = options.proxy;

        if (!session) throw new Error('tlsclientwrapper is not available');

        let response;
        const m = method.toUpperCase();

        if (m === 'GET') {
            response = await session.get(url, reqOpts);
        } else if (m === 'POST') {
            let body = '';
            if (options.json) {
                body = JSON.stringify(options.json);
                if (!headers['content-type']) headers['content-type'] = 'application/json';
            } else if (options.data != null) {
                body = options.data instanceof Buffer
                    ? options.data.toString('base64')
                    : (typeof options.data === 'string' ? options.data : JSON.stringify(options.data));
            }
            response = await session.post(url, body, reqOpts);
        } else {
            response = await session.request(url, { ...reqOpts, method: m });
        }

        const flatHeaders = flattenHeaders(response.headers);
        this._extractCookies(response.headers, url);

        return {
            statusCode: response.status,
            text: response.body || '',
            body: response.body || '',
            headers: flatHeaders,
            cookies: this.cookies,
            url: response.target || url,
            json: () => {
                try { return JSON.parse(response.body || '{}'); }
                catch { throw new Error(`Invalid JSON response (status=${response.status}): ${(response.body || '').substring(0, 200)}`); }
            },
        };
    }

    _extractCookies(headers, url) {
        if (!headers) return;
        const key = Object.keys(headers).find(k => k.toLowerCase() === 'set-cookie');
        if (!key) return;

        const values = Array.isArray(headers[key]) ? headers[key] : [headers[key]];
        for (const setCookie of values) {
            const parts = setCookie.split(';').map(p => p.trim());
            const [nameValue] = parts;
            if (!nameValue) continue;
            const eqIdx = nameValue.indexOf('=');
            const name = eqIdx >= 0 ? nameValue.substring(0, eqIdx) : nameValue;
            const value = eqIdx >= 0 ? nameValue.substring(eqIdx + 1) : '';
            const domainPart = parts.find(p => p.toLowerCase().startsWith('domain='));
            const pathPart = parts.find(p => p.toLowerCase().startsWith('path='));
            if (name) this.cookies.set(name, value, domainPart?.substring(7) || null, pathPart?.substring(5) || '/');
        }
    }

    async _post(url, payload, proxy = null) {
        if (!this.apiKey || !this.apiKey.trim()) {
            logger.error('API key missing during request');
            throw new MissingAPIKeyError('API key is required');
        }

        logger.debug(proxy ? 'POST %s (via proxy: %s)' : 'POST %s', url, proxy);

        const response = await this._executeRequest('POST', url, {
            json: { api_key: this.apiKey, ...payload },
            proxy,
        });

        try {
            const data = response.json();
            if (response.statusCode >= 400) {
                const msg = data.error_description || data.error || 'Request failed';
                logger.error('API error (status=%d): %s', response.statusCode, msg);
                throw new APIError(msg);
            }
            logger.debug('Request successful (status=%d)', response.statusCode);
            return data;
        } catch (e) {
            if (e instanceof APIError) throw e;
            logger.error('Invalid JSON response (status=%d)', response.statusCode);
            throw new APIError(`Invalid response from API (${response.statusCode}): ${response.text?.substring(0, 200)}`);
        }
    }

    async get(url, options = {}) {
        logger.debug(options.proxy ? 'GET %s (via proxy: %s)' : 'GET %s', url, options.proxy);
        return this._executeRequest('GET', url, options);
    }

    async post(url, options = {}) {
        logger.debug(options.proxy ? 'POST %s (via proxy: %s)' : 'POST %s', url, options.proxy);
        return this._executeRequest('POST', url, options);
    }

    get session() { return this; }

    async close() {
        if (this._session) {
            try { await this._session.destroySession(); } catch {}
            this._session = null;
        }
    }
}

export const Client = SalamoonderSession;
export default Client;
