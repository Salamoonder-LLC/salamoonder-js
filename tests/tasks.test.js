import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { Tasks } from '../tasks.js';
import { APIError } from '../client.js';

describe('Tasks', () => {
    let mockClient;
    let tasks;

    beforeEach(() => {
        mockClient = {
            _post: jest.fn(),
        };
        tasks = new Tasks(mockClient);
    });

    test('should initialize with correct URLs', () => {
        expect(tasks.createUrl).toBe('https://salamoonder.com/api/createTask');
        expect(tasks.getUrl).toBe('https://salamoonder.com/api/getTaskResult');
    });

    test('should create a Kasada captcha solver task', async () => {
        mockClient._post.mockResolvedValueOnce({ taskId: '12345' });

        const taskId = await tasks.createTask('KasadaCaptchaSolver', {
            pjs_url: 'https://example.com/p.js',
            cd_only: "true",
        });

        expect(taskId).toBe('12345');
        expect(mockClient._post).toHaveBeenCalledWith(
            'https://salamoonder.com/api/createTask',
            {
                task: {
                    type: 'KasadaCaptchaSolver',
                    pjs: 'https://example.com/p.js',
                    cdOnly: "true",
                },
            }
        );
    });

    test('should create an Akamai Web Sensor task', async () => {
        mockClient._post.mockResolvedValueOnce({ taskId: '67890' });

        const taskId = await tasks.createTask('AkamaiWebSensorSolver', {
            url: 'https://example.com',
            abck: 'abck_value',
            bmsz: 'bmsz_value',
            script: 'sensor_script',
            sensor_url: 'https://sensor.url',
            count: 5,
            data: 'sensor_data',
            user_agent: 'Mozilla/5.0',
        });

        expect(taskId).toBe('67890');
        expect(mockClient._post).toHaveBeenCalledWith(
            'https://salamoonder.com/api/createTask',
            expect.objectContaining({
                task: expect.objectContaining({
                    type: 'AkamaiWebSensorSolver',
                }),
            })
        );
    });

    test('should create a DataDome Slider task', async () => {
        mockClient._post.mockResolvedValueOnce({ taskId: 'dd123' });

        const taskId = await tasks.createTask('DataDomeSliderSolver', {
            captcha_url: 'https://captcha.url',
            country_code: 'US',
        });

        expect(taskId).toBe('dd123');
        expect(mockClient._post).toHaveBeenCalled();
    });

    test('should create a task with optional parameters', async () => {
        mockClient._post.mockResolvedValueOnce({ taskId: 'task123' });

        await tasks.createTask('AkamaiWebSensorSolver', {
            url: 'https://example.com',
            abck: 'abck_value',
            bmsz: 'bmsz_value',
            script: 'script',
            sensor_url: 'https://sensor.url',
            count: 1,
            data: 'data',
            user_agent: 'Custom UA',
        });

        expect(mockClient._post).toHaveBeenCalledWith(
            'https://salamoonder.com/api/createTask',
            expect.objectContaining({
                task: expect.objectContaining({
                    user_agent: 'Custom UA',
                }),
            })
        );
    });

    test('should create a task without predefined mapping', async () => {
        mockClient._post.mockResolvedValueOnce({ taskId: 'unmapped' });

        const taskId = await tasks.createTask('UnmappedTaskType', {
            custom_field: 'value',
        });

        expect(taskId).toBe('unmapped');
        expect(mockClient._post).toHaveBeenCalledWith(
            'https://salamoonder.com/api/createTask',
            {
                task: {
                    type: 'UnmappedTaskType',
                },
            }
        );
    });

    test('should poll task status until ready', async () => {
        mockClient._post
            .mockResolvedValueOnce({ status: 'PENDING' })
            .mockResolvedValueOnce({ status: 'PENDING' })
            .mockResolvedValueOnce({ status: 'ready', solution: 'solver_result' });

        const solution = await tasks.getTaskResult('task123', 0.1);

        expect(solution).toBe('solver_result');
        expect(mockClient._post).toHaveBeenCalledTimes(3);
    });

    test('should throw error on unexpected status', async () => {
        mockClient._post.mockResolvedValueOnce({ status: 'FAILED' });

        await expect(tasks.getTaskResult('task123')).rejects.toThrow(
            'Unexpected task status: FAILED'
        );
    });

    test('should use default polling interval', async () => {
        mockClient._post.mockResolvedValueOnce({ status: 'ready', solution: 'result' });

        const solution = await tasks.getTaskResult('task123');

        expect(solution).toBe('result');
    });
});
