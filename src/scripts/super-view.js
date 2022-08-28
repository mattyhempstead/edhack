// This script is injected into the DOM manually to allow it to overrite the built in fetch function
// This means it can't access chrome extension related functions (like storage) the same way other content scripts can
// Assume this script is just normal js running in the DOM of the page and is not attached to any extension
// One concequence of this is you seem to also be able to make changes to the script without needing to refresh the extension

console.log('edhack activated')

// Listen for any POST requests to /api/threads/*/view
// This indicates the user is attempting to view a post
// Post will also contain the x-token required to spoof more views
// This also indicated the need to add a button after the response 
// (although maybe page updates should be after /api/threads/* as this is what returns the question body)

let xToken        // The current x-token extracted from request headers
let viewURL
let checkbox      // The BUMP toggle switch checkbox
let viewInterval  // The interval used to spam views

let originalFetch = fetch
fetch = (req, options={}) => {

  // If sending a normal fetch request, don't do special stuff
  if (!(req instanceof Request)) return originalFetch(req, options)

  // If any requests are made which don't contain the current thread string, disable the view spammer
  // This just a safety feature because edstem is single page which ensures that when users navigate
  // away from the discussion, the spammer is stopped
  // This will probably also cause the spammer to disable seemingly randomly, however that is probably fine
  if (req.url !== viewURL) toggleSuperView(false);


  // Keep the global x-token variable updated
  let xTokenNew = req.headers.get('x-token');
  if (xTokenNew !== null) {
    xToken = xTokenNew;
  }


  // If user sends a view request, create/configure BUMP switch
  if (req.url.endsWith('?view=1')) {
    getElement('dissho-thread').then((viewDiv) => {
      // console.log("disshothread", viewDiv);

      viewDiv = viewDiv.querySelector(".disthrb-head-layout");
      viewDiv = viewDiv.children[1];

      // Add bump switch if it does not already exist
      if (viewDiv.getElementsByClassName('super-view').length === 0) {

        // For some reason you need to add the switch this way rather than appending innerHTML to viewDiv
        // If you don't, the page no longer updates the view counter live
        superViewDiv = document.createElement('div');
        superViewDiv.className = 'disthrb-head-action super-view';
        superViewDiv.innerHTML = `
          <label class="switch">
            <input type="checkbox" class="super-view-checkbox">
            <span class="slider"></span>
          </label>
          <p class="disthrb-head-action-label">BUMP</p>
        `;
        viewDiv.appendChild(superViewDiv);

        // Listen for changes in the bump switch
        checkbox = viewDiv.getElementsByClassName('super-view-checkbox')[0]
        checkbox.addEventListener('change', (evt) => {
          toggleSuperView(evt.target.checked)
        })

      }


    })


    // If thread changes, turn off checkbox
    let newViewURL = req.url;
    if (newViewURL !== viewURL) {
      viewURL = newViewURL
      toggleSuperView(false)
    }

  }

  return originalFetch(req, options)
}



function toggleSuperView(state) {
  if (state === false) {
    if (checkbox) checkbox.checked = false
    if (viewInterval) {
      clearInterval(viewInterval)
      viewInterval = undefined
    }
  } else {
    if (!viewInterval) {
      // Start a view spammer interval
      viewInterval = setInterval(() => {
        fetch(
          viewURL, {
          method: 'GET',
          headers: {
            'x-token': xToken
          }
        })
        // console.log('spamming')
      }, 250) // 4 times per second
    }
  }
}


/*
 * A function that returns a Promise which resolves to a desired element
 * when it appears in the DOM.
 */
const getElement = (className) => {
  return new Promise((resolve, reject) => {
    // Instantly return element if it already exists in DOM
    let el = document.getElementsByClassName(className);
    //if (el.length === 1 || el.length === 2) {
    if (el.length >= 1) {
        resolve(el[0]);
    }
    //} else if (el.length > 1) {
      //reject('Found two elements with class');
    ///}

    // Create an observer that listens for object to be added to DOM
    const observer = new MutationObserver((mutationsList, observer) => {
      for (const mutation of mutationsList) {
        if (mutation.type !== 'childList') continue;
        if (mutation.addedNodes.length === 0) continue;

        for (let i=0; i<mutation.addedNodes.length; i++) {
          const addedNode = mutation.addedNodes[i];
          if (addedNode.getElementsByClassName === undefined) continue;

          const el = addedNode.getElementsByClassName(className);
          if (el.length === 1) {
            observer.disconnect();
            resolve(el[0]);
          } else if (el.length > 1) {
            console.log(el);
            reject("Two elements satisfying query");
          }
        }

      }
    });
    observer.observe(document.body, {childList:true, subtree:true});

  });
}
