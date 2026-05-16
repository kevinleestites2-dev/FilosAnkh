'use strict';
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

async function get({ url, headers = {} }) {
  const r = await fetch(url, { headers });
  const text = await r.text();
  return { status: r.status, body: text };
}

async function post({ url, headers = {}, body = {} }) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  return { status: r.status, body: text };
}

module.exports = { get, post };
