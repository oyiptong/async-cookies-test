"use strict";

const CACHE_NAME = 'v0';
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

async function getCookie() {
  return await cookieStore.get('session');
}

async function setGetCookie() {
  await cookieStore.set('session', 'set-by-sw');
  return await getCookie();
}

async function executeAction(action) {
  switch(action) {
    case "get-cookie":
      return await getCookie();
    case "set-cookie":
      return await setGetCookie();
    case "delete-cookie":
    return await deleteSessionCookie();
  }
}

async function setupCookieSubscriptions() {
  if (cookieStore) {
    await cookieStore.subscribeToChanges([
      {
        name: 'session',
        matchType: 'equals',
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
    console.log("activating");
    await broadcastLogEvent('activating');
    await self.clients.claim();

    let keys = await caches.keys();
    for (let key of keys) {
      if (key !== CACHE_NAME) {
        caches.delete(key);
      }
    }
  });
});

self.addEventListener('message', async function(event) {
  if (event && event.data) {
    if (typeof(event.data) == "object") {
      switch(event.data.type) {
        case 'action':
          let action = event.data.data;
          let response = await executeAction(action);
          event.ports[0].postMessage(response);
          break;
        default:
          await broadcastLogEvent(`received unknown action ${JSON.stringify(event.data)}`);
          event.ports[0].postMessage("unknown action");
      }
    } else {
      await broadcastLogEvent(`cannot handle event: ${event.data}`);
    }
  }
});

self.addEventListener('cookiechange', async function(event) {
  console.log("SW cookie change detected.");
  for (const cookie of event.changed) {
    await broadcastLogEvent(`cookie changed: ${cookie.name}`);
  }
  for (const cookie of event.deleted) {
    await broadcastLogEvent(`cookie deleted: ${cookie.name}`);
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
  } else if (/^\/sw\/get\/cookie/.test(requestURL.pathname)) {
    return event.respondWith(async function() {
      let cookie = await getCookie();
      let message;
      if (cookie) {
        message = `GET session cookie value: ${cookie.value}`;
      } else {
        message = `no cookie found.`;
      }
      await broadcastLogEvent(`get cookie. found: ${!!cookie}`);
      return new Response(message);
    }());
  } else if (/^\/sw\/set\/cookie/.test(requestURL.pathname)) {
    return event.respondWith(async function() {
      let cookie = await setGetCookie();
      let message;
      if (cookie) {
        message = `SET session cookie value: ${cookie.value}`;
      } else {
        message = `no cookie found.`;
      }
      await broadcastLogEvent(`set cookie. found: ${!!cookie}`);
      return new Response(message);
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
