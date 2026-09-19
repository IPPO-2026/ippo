// Preserve the original URL, Origin and edge client identity for the existing
// Worker's same-origin, Turnstile hostname and daily-budget checks.
export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname.startsWith('/api/')) {
      return env.IPPO_API.fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
};
