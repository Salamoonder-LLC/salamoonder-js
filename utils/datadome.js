import { URLSearchParams } from 'url';
import { getLogger } from '../logger.js';

const logger = getLogger('salamoonder.utils.datadome');

export class Datadome {
    constructor(client) {
        this.client = client;
    }

    parseSliderUrl(html, datadomeCoookie, referer) {
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
            return captchaUrl;
        } catch (e) {
            logger.error('Failed to parse object: %s', e);
            throw new Error('Failed to parse object.');
        }
    }

    parseInterstitialUrl(html, datadomeCoookie, referer) {
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
            return interstitialUrl;
        } catch (e) {
            logger.error('Failed to parse object: %s', e);
            throw new Error('Failed to parse object.');
        }
    }
}

export default Datadome;
