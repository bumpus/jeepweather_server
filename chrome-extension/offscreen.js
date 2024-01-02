chrome.runtime.onMessage.addListener(handleMessages);
function handleMessages(message, sender, sendResponse) {
  // Return early if this message isn't meant for the offscreen document.
  if (message.target !== 'offscreen') {
    return;
  }

  if (message.type !== 'get-geolocation') {
    console.warn(`Unexpected message type received: '${message.type}'.`);
    return;
  }

  // You can directly respond to the message from the service worker with the
  // provided `sendResponse()` callback. But in order to be able to send an async
  // response, you need to explicitly return `true` in the onMessage handler
  // As a result, you can't use async/await here. You'd implicitly return a Promise.
  getLocation().then((loc) => sendResponse(loc)).catch((err) => sendResponse(null));

  return true;
}

// getCurrentPosition() returns a prototype-based object, so the properties
// end up being stripped off when sent to the service worker. To get
// around this, create a deep clone.
function clone(obj) {
  const copy = {};
  // Return the value of any non true object (typeof(null) is "object") directly.
  // null will throw an error if you try to for/in it. Just return
  // the value early.
  if (obj === null || !(obj instanceof Object)) {
    return obj;
  } else {
    for (const p in obj) {
      copy[p] = clone(obj[p]);
    }
  }
  return copy;
}

async function getLocation() {
  // Use a raw Promise here so you can pass `resolve` and `reject` into the
  // callbacks for getCurrentPosition().
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (loc) => resolve(clone(loc)),
      // in case the user doesnt have/is blocking `geolocation`
      (err) => reject(err)
    );
  });
}
