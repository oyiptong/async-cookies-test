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

function sendMessage(action) {
  return new Promise(function(resolve, reject) {
    var messageChannel = new MessageChannel();
    messageChannel.port1.onmessage = function(event) {
      if (event.data && event.data.error) {
        reject(event.data.error);
      } else {
        resolve(event.data);
      }
    };

    navigator.serviceWorker.controller.postMessage(
        {
          type: "action",
          data: action,
        },
        [messageChannel.port2],
    );
  });
}

function setupServiceWorkerButtons(registration) {
  document.querySelector('#btn-update-sw').addEventListener('click', () => {
    registration.update();
  });

  document.querySelector('#btn-sw-get-cookie').addEventListener('click', async function() {
    let result = await sendMessage("get-cookie");
    addLogEvent(`Client received: postMessage(action: get-cookie): ${JSON.stringify(result)}`);
  });
  document.querySelector('#btn-sw-set-cookie').addEventListener('click', async function() {
    let result = await sendMessage("set-cookie");
    addLogEvent(`Client received: postMessage(action: set-cookie): ${JSON.stringify(result)}`);
  });
  document.querySelector('#btn-sw-delete-cookie').addEventListener('click', async function() {
    let result = await sendMessage("delete-cookie");
    addLogEvent(`Client received: postMessage(action: delete-cookie): ${JSON.stringify(result)}`);
  });
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async function() {
    eventListElem = document.querySelector("#event-list");
    try {
      let registration = await navigator.serviceWorker.register('/sw.js');
      console.log(`Service Worker registered with scope: ${registration.scope}`);

      setupServiceWorkerButtons(registration);
    } catch(err) {
      console.log(`Service Worker registration failed: ${err}`);
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
    addLogEvent(`Client detected cookie change: ${cookie.name}`);
    output['changes'].push({
      name: cookie.name,
      value: cookie.value,
    });
  }

  for (const cookie of event.deleted) {
    addLogEvent(`Client detected cookie deletion: ${cookie.name}`);
    output['deletions'].push({name: cookie.name});
  }

  statusElem.innerHTML = JSON.stringify(output, null, 2);
});

console.log("script app.js executed");
