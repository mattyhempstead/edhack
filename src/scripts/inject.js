
// Injects a script into the body which correctly overrides the built in 'fetch' function
// For some reason, running the script directly in this file does not have any effect on 'fetch'
let injectedScript = document.createElement('script')
injectedScript.src = chrome.runtime.getURL('scripts/super-view.js')
document.body.appendChild(injectedScript)
