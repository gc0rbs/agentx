/**
 * Proxy resolution tests for the X browser client.
 * Verifies PROXY_URL parsing without launching a browser.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { XBrowserClient } from '../../src/integrations/x/browser';

// resolveProxy is private; exercise it via a typed cast (unit-level check).
function resolve(client: XBrowserClient): unknown {
  return (client as unknown as { resolveProxy: () => unknown }).resolveProxy();
}

describe('proxy resolution', () => {
  const original = process.env.PROXY_URL;
  afterEach(() => {
    if (original === undefined) delete process.env.PROXY_URL;
    else process.env.PROXY_URL = original;
  });

  it('returns undefined when no proxy configured', () => {
    delete process.env.PROXY_URL;
    const client = new XBrowserClient();
    expect(resolve(client)).toBeUndefined();
  });

  it('prefers explicit config over env', () => {
    process.env.PROXY_URL = 'http://env:env@1.2.3.4:8080';
    const client = new XBrowserClient({ proxy: { server: 'http://10.0.0.1:9000' } });
    expect(resolve(client)).toEqual({ server: 'http://10.0.0.1:9000' });
  });

  it('parses PROXY_URL with credentials', () => {
    process.env.PROXY_URL = 'http://user:pass@proxy.example.com:8000';
    const client = new XBrowserClient();
    expect(resolve(client)).toEqual({
      server: 'http://proxy.example.com:8000',
      username: 'user',
      password: 'pass',
    });
  });

  it('parses PROXY_URL without credentials', () => {
    process.env.PROXY_URL = 'http://proxy.example.com:8000';
    const client = new XBrowserClient();
    expect(resolve(client)).toEqual({ server: 'http://proxy.example.com:8000' });
  });

  it('url-decodes credentials', () => {
    process.env.PROXY_URL = 'http://user%40acme:p%3Ass@proxy.example.com:8000';
    const client = new XBrowserClient();
    expect(resolve(client)).toEqual({
      server: 'http://proxy.example.com:8000',
      username: 'user@acme',
      password: 'p:ss',
    });
  });

  it('ignores an invalid PROXY_URL', () => {
    process.env.PROXY_URL = 'not-a-url';
    const client = new XBrowserClient();
    expect(resolve(client)).toBeUndefined();
  });
});
