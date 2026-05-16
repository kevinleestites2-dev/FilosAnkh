'use strict';
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
const config = require('../config');

async function search({ query, numResults = 5 }) {
  const cfg = config.load();

  // Try SearxNG / Vane first
  if (cfg.searxUrl) {
    try {
      const r = await fetch(`${cfg.searxUrl}/search?q=${encodeURIComponent(query)}&format=json`);
      const data = await r.json();
      const results = (data.results || []).slice(0, numResults).map(item => ({
        title: item.title,
        url: item.url,
        snippet: item.content || '',
      }));
      return { results, source: 'searx' };
    } catch {}
  }

  // Fallback: DuckDuckGo instant answer
  try {
    const r = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
    const data = await r.json();
    const results = [];
    if (data.AbstractText) results.push({ title: data.Heading, url: data.AbstractURL, snippet: data.AbstractText });
    for (const r of (data.RelatedTopics || []).slice(0, numResults - 1)) {
      if (r.Text) results.push({ title: r.Text.slice(0, 60), url: r.FirstURL || '', snippet: r.Text });
    }
    return { results, source: 'ddg' };
  } catch (err) {
    return { error: `Search failed: ${err.message}` };
  }
}

module.exports = { search };
