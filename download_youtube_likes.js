// API and OAuth credentials.
//
// TODO: Link to the app in the Google Cloud Console.
const API_KEY = "AIzaSyDtVJFOlTwoJLqUrAZE-3RhoZ74xJ--TCE";
const CLIENT_ID = "218261713726-isd59r74csn8bi3s1gq6v0afn8ussdvj.apps.googleusercontent.com";

// Discovery document URL for the YouTube Data API v3
const DISCOVERY_DOCS = [
  "https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest"
];

// Scopes required by the API.
//
// We're only reading a list of videos from a playlist, so read-only
// scopes are fine.
const SCOPES = 'https://www.googleapis.com/auth/youtube.readonly';

let tokenClient = null;

async function initializeGapiClient() {
  try {
    /* Initialize the GoogleAuth object.  We need to call this first,
     * before calling any other methods.
     * See https://developers.google.com/identity/sign-in/web/reference */
    await gapi.client.init({
      apiKey: API_KEY,
      discoveryDocs: DISCOVERY_DOCS,
    });
    
    /* Initialize the token client.
     * See https://developers.google.com/identity/oauth2/web/guides/use-token-model */
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (tokenResponse) => {
        if (tokenResponse && tokenResponse.access_token) {
          accessToken = tokenResponse.access_token;
          
          gapi.client.setToken({
            access_token: tokenResponse.access_token
          });
          
          completeSignin();
        }
      },
      error_callback: (error) => {
        console.error("Error during authorization:", error);
        updateStatus(
          `Error during authorization: ${JSON.stringify(error)}`,
          "error"
        );
      }
    });
    
    /* Add a click handler so that when you click the "sign in" button,
     * you go through the Google OAuth login flow. */
    document.querySelector("button#signin").addEventListener(
      "click",
      () => tokenClient.requestAccessToken({ prompt: 'consent' })
    );
    
    /* Once the button is working, we can show the sign-in container
     * and hide the status element. */
    document.querySelector("#signin-container").style.display = "block";
    document.querySelector("#status").style.display = "none";
    
    console.log("Google API initialized successfully");
  } catch (error) {
    console.error("Error initializing GAPI:", error);
    updateStatus(`Error initializing API: ${error.message}`, "error");
  }
}

function updateStatus(message, state) {
  const statusElement = document.querySelector("#status");
  const statusMessage = document.querySelector("#status > p")
  
  statusElement.setAttribute("data-state", state);
  statusElement.style.display = "block";
  statusMessage.innerText = message;
  
  if (state === "error") {
    statusElement.innerHTML += `
      <p>
        Try reloading the page to see if the error goes away.
        If the error persists, please let me know by emailing <a href=\"mailto:alex@alexwlchan.net\">alex@alexwlchan.net</a>.
      </p>
    `;
  }
}

function completeSignin() {
  console.log("Sign in complete!");
}
