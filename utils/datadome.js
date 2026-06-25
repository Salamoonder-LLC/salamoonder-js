import { URLSearchParams } from 'url';
import { getLogger } from '../logger.js';

const logger = getLogger('salamoonder.utils.datadome');

export class Datadome {
    constructor(client) {
        this.client = client;
    }

    async getSliderChallenge(html, datadomeCoookie, referer, { headers = {}, user_agent } = {}) {
        logger.info('Parsing DataDome slider URL from HTML');
        try {
            const parsed = JSON.parse(html.split('var dd=')[1].split('</script>')[0].replace(/'/g, '"'));
            logger.debug('Successfully parsed object');

            if (parsed.t === 'bv') {
                logger.error('IP is blocked (t=bv), exiting...');
                return null;
            }

            const captchaUrl = `https://geo.captcha-delivery.com/captcha/?${new URLSearchParams({
                initialCid: parsed.cid,
                hash: parsed.hsh,
                cid: datadomeCoookie,
                t: parsed.t,
                referer,
                s: String(parsed.s || ''),
                e: parsed.e,
                dm: 'cd',
            })}`;
            logger.info('Constructed slider URL: %s', captchaUrl.substring(0, 80) + '...');

            const requestHeaders = user_agent
                ? { 'User-Agent': user_agent, ...headers }
                : { ...headers };
            const response = await this.client.get(captchaUrl, { headers: requestHeaders });
            const challengePage = Buffer.from(response.body).toString('base64');

            return { captcha_url: captchaUrl, challenge_page: challengePage };
        } catch (e) {
            logger.error('Failed to parse object: %s', e);
            throw new Error('Failed to parse object.');
        }
    }

    async getInterstitialChallenge(html, datadomeCoookie, referer, { headers = {}, user_agent } = {}) {
        logger.info('Parsing DataDome interstitial URL from HTML');
        try {
            const parsed = JSON.parse(html.split('var dd=')[1].split('</script>')[0].replace(/'/g, '"'));
            logger.debug('Successfully parsed object');

            const interstitialUrl = `https://geo.captcha-delivery.com/interstitial/?${new URLSearchParams({
                initialCid: parsed.cid,
                hash: parsed.hsh,
                cid: datadomeCoookie,
                referer,
                s: String(parsed.s || ''),
                e: String(parsed.e || ''),
                b: String(parsed.b || ''),
                dm: 'cd',
            })}`;
            logger.info('Constructed interstitial URL: %s', interstitialUrl.substring(0, 80) + '...');

            const requestHeaders = user_agent
                ? { 'User-Agent': user_agent, ...headers }
                : { ...headers };
            const response = await this.client.get(interstitialUrl, { headers: requestHeaders });
            const challengePage = Buffer.from(response.body).toString('base64');

            return { captcha_url: interstitialUrl, challenge_page: challengePage };
        } catch (e) {
            logger.error('Failed to parse object: %s', e);
            throw new Error('Failed to parse object.');
        }
    }
}

export default Datadome;
