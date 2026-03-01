import { describe, test, expect } from '@jest/globals';
import Salamoonder, { Tasks, AkamaiWeb, AkamaiSBSD, Datadome, Kasada } from '../index.js';

describe('Salamoonder', () => {
  test('should initialize with API key', () => {
    const salamoonder = new Salamoonder('test-api-key');
    expect(salamoonder._client).toBeDefined();
    expect(salamoonder._client.apiKey).toBe('test-api-key');
  });

  test('should have task instance', () => {
    const salamoonder = new Salamoonder('test-api-key');
    expect(salamoonder.task).toBeInstanceOf(Tasks);
  });

  test('should have akamai instance', () => {
    const salamoonder = new Salamoonder('test-api-key');
    expect(salamoonder.akamai).toBeInstanceOf(AkamaiWeb);
  });

  test('should have akamai_sbsd instance', () => {
    const salamoonder = new Salamoonder('test-api-key');
    expect(salamoonder.akamai_sbsd).toBeInstanceOf(AkamaiSBSD);
  });

  test('should have datadome instance', () => {
    const salamoonder = new Salamoonder('test-api-key');
    expect(salamoonder.datadome).toBeInstanceOf(Datadome);
  });

  test('should have kasada instance', () => {
    const salamoonder = new Salamoonder('test-api-key');
    expect(salamoonder.kasada).toBeInstanceOf(Kasada);
  });

  test('should have get method', () => {
    const salamoonder = new Salamoonder('test-api-key');
    expect(typeof salamoonder.get).toBe('function');
  });

  test('should have post method', () => {
    const salamoonder = new Salamoonder('test-api-key');
    expect(typeof salamoonder.post).toBe('function');
  });

  test('should have session property', () => {
    const salamoonder = new Salamoonder('test-api-key');
    expect(salamoonder.session).toBeDefined();
  });

  test('should be exported as default', () => {
    expect(Salamoonder).toBeDefined();
  });
});
