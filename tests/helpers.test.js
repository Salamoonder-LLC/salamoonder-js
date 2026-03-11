import { describe, test, expect } from '@jest/globals';
import { extractSecChUa } from '../utils/helpers.js';

describe('helpers', () => {
    describe('extractSecChUa', () => {
        test('should extract version from Chrome user agent', () => {
            const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';
            const result = extractSecChUa(ua);
            expect(result).toBe('"Chromium";v="120", "Google Chrome";v="120", "Not?A_Brand";v="99"');
        });

        test('should handle Chrome 133', () => {
            const ua = 'Mozilla/5.0 Chrome/133.0.0.0';
            const result = extractSecChUa(ua);
            expect(result).toBe('"Chromium";v="133", "Google Chrome";v="133", "Not?A_Brand";v="99"');
        });

        test('should handle single digit version', () => {
            const ua = 'Chrome/90.0.0.0';
            const result = extractSecChUa(ua);
            expect(result).toBe('"Chromium";v="90", "Google Chrome";v="90", "Not?A_Brand";v="99"');
        });

        test('should return default if no Chrome version found', () => {
            const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Safari/537.36';
            const result = extractSecChUa(ua);
            expect(result).toBe('"Chromium";v="122", "Google Chrome";v="122", "Not?A_Brand";v="99"');
        });

        test('should return default for empty user agent', () => {
            const result = extractSecChUa('');
            expect(result).toBe('"Chromium";v="122", "Google Chrome";v="122", "Not?A_Brand";v="99"');
        });

        test('should return default for Firefox user agent', () => {
            const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0';
            const result = extractSecChUa(ua);
            expect(result).toBe('"Chromium";v="122", "Google Chrome";v="122", "Not?A_Brand";v="99"');
        });
    });
});
