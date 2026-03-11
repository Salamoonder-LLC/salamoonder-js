import { describe, test, expect, beforeEach } from '@jest/globals';
import {
    SalamoonderSession,
    MissingAPIKeyError,
    APIError,
    SessionCookies,
} from '../client.js';

describe('SessionCookies', () => {
    let cookies;

    beforeEach(() => {
        cookies = new SessionCookies();
    });

    test('should set and get a cookie', () => {
        cookies.set('test', 'value');
        expect(cookies.get('test')).toBe('value');
    });

    test('should return undefined for non-existent cookie', () => {
        expect(cookies.get('nonexistent')).toBeUndefined();
    });

    test('should get cookie dict', () => {
        cookies.set('cookie1', 'value1');
        cookies.set('cookie2', 'value2');
        const dict = cookies.getDict();
        expect(dict.cookie1).toBe('value1');
        expect(dict.cookie2).toBe('value2');
    });

    test('should get cookies for URL with matching domain', () => {
        cookies.set('global', 'value1');
        cookies.set('example', 'value2', '.example.com');
        const dict = cookies.getDictForUrl('https://example.com');
        expect(dict.global).toBe('value1');
        expect(dict.example).toBe('value2');
    });

    test('should not get cookies for non-matching domain', () => {
        cookies.set('example', 'value', '.example.com');
        const dict = cookies.getDictForUrl('https://other.com');
        expect(dict.example).toBeUndefined();
    });

    test('should handle invalid URL gracefully', () => {
        cookies.set('test', 'value');
        const dict = cookies.getDictForUrl('not-a-valid-url');
        expect(dict).toEqual({});
    });

    test('should clear all cookies', () => {
        cookies.set('cookie1', 'value1');
        cookies.set('cookie2', 'value2');
        cookies.clear();
        expect(cookies.get('cookie1')).toBeUndefined();
        expect(cookies.get('cookie2')).toBeUndefined();
    });
});

describe('SalamoonderSession', () => {
    test('should throw MissingAPIKeyError if API key is empty', () => {
        expect(() => new SalamoonderSession('')).toThrow(MissingAPIKeyError);
    });

    test('should throw MissingAPIKeyError if API key is null', () => {
        expect(() => new SalamoonderSession(null)).toThrow(MissingAPIKeyError);
    });

    test('should throw MissingAPIKeyError if API key is undefined', () => {
        expect(() => new SalamoonderSession(undefined)).toThrow(MissingAPIKeyError);
    });

    test('should initialize with valid API key', () => {
        const client = new SalamoonderSession('test-api-key');
        expect(client.apiKey).toBe('test-api-key');
        expect(client.baseUrl).toBe('https://salamoonder.com/api');
        expect(client.impersonate).toBe('chrome_133');
    });

    test('should allow custom base URL', () => {
        const client = new SalamoonderSession('test-key', 'https://custom.com/api');
        expect(client.baseUrl).toBe('https://custom.com/api');
    });

    test('should allow custom impersonate value', () => {
        const client = new SalamoonderSession('test-key', undefined, 'chrome_120');
        expect(client.impersonate).toBe('chrome_120');
    });

    test('should have cookies instance', () => {
        const client = new SalamoonderSession('test-key');
        expect(client.cookies).toBeInstanceOf(SessionCookies);
    });

    test('should have empty headers by default', () => {
        const client = new SalamoonderSession('test-key');
        expect(client.headers).toEqual({});
    });

    test('should have session property', () => {
        const client = new SalamoonderSession('test-key');
        expect(client.session).toBe(client);
    });
});

describe('APIError', () => {
    test('should create an error with correct message', () => {
        const error = new APIError('Test error');
        expect(error.message).toBe('Test error');
        expect(error.name).toBe('APIError');
    });

    test('should be instance of Error', () => {
        const error = new APIError('Test');
        expect(error).toBeInstanceOf(Error);
    });
});

describe('MissingAPIKeyError', () => {
    test('should create an error with correct message', () => {
        const error = new MissingAPIKeyError('No API key');
        expect(error.message).toBe('No API key');
        expect(error.name).toBe('MissingAPIKeyError');
    });

    test('should be instance of Error', () => {
        const error = new MissingAPIKeyError('Test');
        expect(error).toBeInstanceOf(Error);
    });
});
