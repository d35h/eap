import { describe, it, expect } from 'vitest';
import { json } from './json.js';

describe('json helper', () => {
  it('builds a JSON response with status and headers', () => {
    const res = json(201, { ok: true });
    expect(res.statusCode).toBe(201);
    expect(res.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(res.body)).toEqual({ ok: true });
  });
  it('defaults status to 200', () => {
    expect(json(undefined, {}).statusCode).toBe(200);
  });
});
