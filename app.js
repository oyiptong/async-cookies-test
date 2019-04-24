"use strict";

let eventListElem;

function addLogEvent(message) {
  if (eventListElem) {
    let item = document.createElement("li");
    item.innerHTML = message;
    eventListElem.appendChild(item);
  } else {
    console.log("Could not find #event-list");
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async function() {
    eventListElem = document.querySelector("#event-list");
    try {
      let registration = await navigator.serviceWorker.register('/sw.js');
      console.log(`Service Worker registered with scope: ${registration.scope}`);
      document.querySelector('#btn-update-sw').addEventListener('click', () => {
        registration.update();
      });
    } catch(err) {
      console.err(`Service Worker registration failed: ${err}`);
      throw err;
    }

    navigator.serviceWorker.addEventListener('message', (event) => {
      // addLogEvent(`Client received message: ${JSON.stringify(event.data)}`);
      if (event.data.type == 'log') {
        addLogEvent(`SW: ${event.data.data}`);
      }
    });
  });
}

window.addEventListener('load', async function() {
  document.querySelector('#btn-clear').addEventListener('click', (event) => {
    let listElem = document.querySelector('#event-list');
    while (listElem.firstChild) {
      listElem.removeChild(listElem.firstChild);
    }
  });
});

cookieStore.addEventListener('change', (event) => {
  let statusElem = document.querySelector('#cookie-status');
  let output = {changes: [], deletions: []};
  for (const cookie of event.changed) {
    console.log(`cookie changed: ${cookie.name}`);
    output['changes'].push({
      name: cookie.name,
      value: cookie.value,
    });
  }

  for (const cookie of event.deleted) {
    console.log(`cookie deleted: ${cookie.name}`);
    output['deleted'].push({name: cookie.name});
  }

  statusElem.innerHTML = JSON.stringify(output, null, 2);
});

console.log("script app.js executed");
