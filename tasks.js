import { APIError } from './client.js';
import { getLogger } from './logger.js';

const logger = getLogger('salamoonder.tasks');

const TASK_FIELD_MAP = {
    KasadaCaptchaSolver: { required: { pjs: 'pjs_url', cdOnly: 'cd_only' } },
    KasadaPayloadSolver: { required: { url: 'url', script_content: 'script_content' }, optional: ['script_url'] },
    Twitch_PublicIntegrity: { required: { access_token: 'access_token', proxy: 'proxy' }, optional: ['device_id', 'client_id'] },
    IncapsulaReese84Solver: { required: { website: 'website', submit_payload: 'submit_payload' }, optional: ['reese_url', 'user_agent'] },
    IncapsulaUTMVCSolver: { required: { website: 'website' }, optional: ['user_agent'] },
    AkamaiWebSensorSolver: { required: { url: 'url', abck: 'abck', bmsz: 'bmsz', script: 'script', sensor_url: 'sensor_url', count: 'count', data: 'data' }, optional: ['user_agent'] },
    AkamaiSBSDSolver: { required: { url: 'url', cookie: 'cookie', sbsd_url: 'sbsd_url', script: 'script' }, optional: ['user_agent'] },
    DataDomeSliderSolver: { required: { captcha_url: 'captcha_url', country_code: 'country_code' }, optional: ['user_agent'] },
    DataDomeInterstitialSolver: { required: { captcha_url: 'captcha_url', country_code: 'country_code' }, optional: ['user_agent'] },
};

export class Tasks {
    constructor(client) {
        this.client = client;
        this.createUrl = 'https://salamoonder.com/api/createTask';
        this.getUrl = 'https://salamoonder.com/api/getTaskResult';
    }

    async createTask(taskType, kwargs = {}) {
        const task = { type: taskType };
        const mapping = TASK_FIELD_MAP[taskType];

        if (mapping) {
            for (const [taskKey, kwargKey] of Object.entries(mapping.required || {}))
                task[taskKey] = kwargs[kwargKey];
            for (const key of mapping.optional || [])
                if (kwargs[key] !== undefined) task[key] = kwargs[key];
        }

        logger.info('Creating task of type: %s', taskType);
        const data = await this.client._post(this.createUrl, { task });
        logger.info('Task created with ID: %s', data.taskId);
        return data.taskId;
    }

    async getTaskResult(taskId, interval = 1) {
        logger.info('Polling task %s (interval=%ds)', taskId, interval);
        let attempts = 0;

        while (true) {
            attempts++;
            const data = await this.client._post(this.getUrl, { taskId });
            logger.debug('Task %s status: %s (attempt %d)', taskId, data.status, attempts);

            if (data.status === 'PENDING') {
                await new Promise(r => setTimeout(r, interval * 1000));
                continue;
            }
            if (data.status === 'ready') {
                logger.info('Task %s completed after %d attempts', taskId, attempts);
                return data.solution;
            }

            logger.error('Task %s failed with status: %s', taskId, data.status);
            throw new APIError(`Unexpected task status: ${data.status}`);
        }
    }
}

export default Tasks;
