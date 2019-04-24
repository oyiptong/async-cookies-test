"use strict";

const CACHE_NAME = 'v1';
const CACHED_URLS = new Set([
  '/',
  '/bootstrap.min.css',
  '/app.js',
]);
let msgChannel = new MessageChannel();

async function broadcastLogEvent(message) {
  let allClients = await clients.matchAll();
  for (let client of allClients) {
    client.postMessage({type: 'log', data: message});
  }
}

async function cacheURLs() {
  try {
    let cache = await caches.open(CACHE_NAME);
    console.log(`cache open: ${CACHE_NAME}`);
    return await cache.addAll(Array.from(CACHED_URLS));
  } catch(err) {
    console.log(`Failed to open cache for ${CACHE_NAME}`);
    throw err;
  }
}

async function setupCookieSubscriptions() {
  if (cookieStore) {
    await cookieStore.subscribeToChanges([
      {
        name: 'session',
        matchType: 'starts-with',
      },
    ]);
    console.log("subscribed to changes");
  } else {
    let msg = 'Failed to subscribe: cookieStore not available.';
    console.log(msg);
    await broadcastLogEvent(msg);
  }
}

async function deleteSessionCookie() {
  return await cookieStore.delete('session');
}

self.addEventListener('install', (event) => {
  event.waitUntil(async function() {
    //await cacheURLs();
    await setupCookieSubscriptions();
    await broadcastLogEvent('installed');
  });
});

self.addEventListener('activate', (event) => {
  event.waitUntil(async function() {
    await broadcastLogEvent('activating');

    let keys = await caches.keys();
    for (let key of keys) {
      if (key !== CACHE_NAME) {
        caches.delete(key);
      }
    }
  });
});

self.addEventListener('message', (event) => {
  console.log(`SW Received message: ${event.data}`);
});

self.addEventListener('cookiechange', (event) => {
  for (const cookie of event.deleted) {
    if (cookie.name === 'session') {
      broadcastLogEvent(`cookie deleted: ${cookie.name}`);
    }
  }
});

self.addEventListener('fetch', (event) => {
  const requestURL = new URL(event.request.url);

  if (/^\/sw\/generated\/?/.test(requestURL.pathname)) {
    let num = Math.floor(Math.random() * Math.floor(1000));
    return event.respondWith(async function() {
      await broadcastLogEvent(`generated response ${num}`);
      return new Response(`random int: ${num}`);
    }());
  } else if (/^\/sw\/delete\/cookie/.test(requestURL.pathname)) {
    return event.respondWith(async function() {
      await broadcastLogEvent('deleting cookie.');
      let status = await deleteSessionCookie();
      return new Response(`deleted cookie: ${status}`);
    }());
  } else if (/^\/sw\/delete\/cache/.test(requestURL.pathname)) {
    return event.respondWith(async function() {
      await broadcastLogEvent('clearing worker cache.');
      let status = await caches.delete(CACHE_NAME);
      return new Response(`worker cache cleared: ${status}`);
    }());
  }

  return event.respondWith(async function() {
    let response = await caches.match(event.request);
    if (response) {
      await broadcastLogEvent(`cache hit: ${event.request.url}`);
      return response;
    }

    await broadcastLogEvent(`fetching ${event.request.url}`);
    return fetch(event.request);
  }());
});
