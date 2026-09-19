import { expect, it, vi } from 'vitest';
import pages from '../pages/_worker.js';
it('preserves the custom origin, request body and edge identity for the API binding', async () => {
  const request = new Request('https://ippo.kro.kr/api/chat', {method:'POST', headers:{Origin:'https://ippo.kro.kr','CF-Connecting-IP':'203.0.113.1','Content-Type':'application/json'},body:JSON.stringify({message:'synthetic'})});
  const reply = new Response('ok');
  const fetch = vi.fn().mockResolvedValue(reply);
  expect(await pages.fetch(request, {IPPO_API:{fetch}})).toBe(reply);
  expect(fetch).toHaveBeenCalledWith(request);
  expect(await request.json()).toEqual({message:'synthetic'});
});
it('serves non-API requests through Pages static assets', async () => {
  const request = new Request('https://ippo.kro.kr/sw.js');
  const fetch = vi.fn().mockResolvedValue(new Response('shell'));
  expect(await (await pages.fetch(request, {ASSETS:{fetch}})).text()).toBe('shell');
  expect(fetch).toHaveBeenCalledWith(request);
});
