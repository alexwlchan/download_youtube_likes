// API and OAuth credentials.
//
// TODO: Link to the app in the Google Cloud Console.
// Note: These OAuth credentials are scoped so they can only be used
// from alexwlchan.net.
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
          
          gapi.client.setToken(tokenResponse);
          
          completeSignin();
        }
      },
      error_callback: (error) => {
        console.error("Error during authorization:", error);
        updateLoginStatus({
          elementId: "#login-status",
          message: `Error during authorization: ${JSON.stringify(error)}`,
          state: "error"
        });
      }
    });
    
    /* Add a click handler so that when you click the "sign in" button,
     * you go through the Google OAuth login flow.
     */
    document.querySelector("button#signin").addEventListener(
      "click",
      () => tokenClient.requestAccessToken({ prompt: '' })
    );
    
    /* When you click the "sign out" button, remove the login token and
     * reload the page. */
    document.querySelector("button#signout").addEventListener(
      "click",
      () => {
        google.accounts.oauth2.revoke(accessToken, () => {
          console.log("Access token revoked");
        });
        gapi.client.setToken("");
        window.location.reload();
      }
    );
    
    /* Once the button is working, we can show the sign-in container
     * and hide the status element. */
    document.querySelector("#signin-container").style.display = "block";
    document.querySelector("#login-status").style.display = "none";
    
    console.log("Google API initialized successfully");
  } catch (error) {
    console.error("Error initializing GAPI:", error);
    updateStatus({
      elementId: "#login-status",
      message: `Error initializing API: ${error.message}`,
      state: "error"
    });
  }
}

function updateStatus({ elementId, message, state }) {
  const statusElement = document.querySelector(`${elementId}`);
  const statusMessage = document.querySelector(`${elementId} > p`)
  
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
  /* Hide the sign-in container */
  document.querySelector("#signin-container").style.display = "none";
  
  /* Show the new container where you can download videos. */
  document.querySelector("#likes-container").style.display = "block";
  document.querySelector("button#fetch-likes").addEventListener(
    "click",
    fetchLikedVideos
  );
}



async function fetchLikedVideos() {
  /* Hide the "Fetch likes" button, and show the "See preview" and
   * "Download HTML" buttons. */
  document.querySelector("button#fetch-likes").style.display = "none";
  document.querySelector("button#toggle-preview").style.display = "inline-block"
  document.querySelector("button#download-html").style.display = "inline-block"
  
  document.querySelector("button#toggle-preview").addEventListener(
    "click",
    () => {
      const previewContainer = document.querySelector("#preview-container");
      
      if (previewContainer.style.display === "block") {
        previewContainer.style.display = "none";
      } else {
        previewContainer.srcdoc = getListOfLikedVideosHtml(likedVideos);
        previewContainer.style.display = "block";        
      }
    },
  )
  
  /* When you click the "Download list" button, create a link containing
   * the HTML, and click it to start the download. */
  document.querySelector("button#download-html").addEventListener(
    "click",
    () => {
      const downloadLink = document.createElement("a");

      const html = getListOfLikedVideosHtml(likedVideos);
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      
      downloadLink.href = url;
      downloadLink.download = 'youtube_likes.html';
      document.body.appendChild(downloadLink);
      downloadLink.click();

      document.body.removeChild(downloadLink);
      window.URL.revokeObjectURL(url);
    }
  )
  
  updateStatus({
    elementId: "#fetch-status",
    message: "Fetching your liked videos…",
    state: "loading",
  });
  
  let likedVideos = [];
  let nextPageToken = null;
  
  try {
    do {
      const response = await gapi.client.youtube.playlistItems.list({
        part: "id,snippet,contentDetails,status",
        playlistId: "LL",
        maxResults: 50,
        pageToken: nextPageToken
      });
      
      likedVideos.push(
        ...response.result.items.map(item => ({
          'id': item.snippet.resourceId.videoId,
          'thumbnails': item.snippet.thumbnails,
          'channelId': item.snippet.videoOwnerChannelId,
          'channelName': item.snippet.videoOwnerChannelTitle,
          'title': item.snippet.title,
          'description': item.snippet.description,
          'publishedAt': item.snippet.publishedAt,
          'visibility': item.status.privacyStatus,
        }))
      );
      
      updateStatus({
        elementId: "#fetch-status",
        message: `Fetching liked videos… got ${likedVideos.length.toLocaleString()} so far`,
        state: "loading"
      });
      
      // If the preview container is visible, update it with the
      // new HTML for the updated list of videos.
      const previewContainer = document.querySelector("#preview-container");
      if (previewContainer.style.display === "block") {
        previewContainer.srcdoc = getListOfLikedVideosHtml(likedVideos);
      }
      
      nextPageToken = response.result.nextPageToken;
    } while (nextPageToken);
    
    updateStatus({
      elementId: "#fetch-status",
      message: `Fetched all ${likedVideos.length.toLocaleString()} of your liked videos!`,
      state: "success"
    });
  } catch (error) {
    console.error('Error fetching liked videos:', error);
    updateStatus({
      elementId: "#fetch-status",
      message: `Error fetching liked videos: ${error.message}`,
      state: "error"
    });
  }
}



function getListOfLikedVideosHtml(likedVideos) {
  return `
    <!DOCTYPE html>
    <html lang="en">

    <head>
      <meta charset="utf-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">

      <script id="likedVideosJson">
        const likedVideos = ${JSON.stringify(likedVideos, null, 2)};
      </script>

      <script>
        function LikedVideo(video) {
          const wrapper = document.createElement("li");
          wrapper.classList.add("video-item");
          
          const videoUrl = \`https://www.youtube.com/watch?v=\${video.id}\`;
          
          /* e.g.
           *
           *    <img
           *      src="https://yt.thumbnails.com/123.jpg"
           *      style="aspect-ratio: 4 / 3">
           */
          const thumbnailLink = document.createElement("a");
          thumbnailLink.setAttribute("href", videoUrl);
          thumbnailLink.setAttribute("target", "_blank");

          const thumbnailElem = document.createElement("img");
          thumbnailElem.setAttribute("loading", "lazy");
          const thumbnail = video.thumbnails.standard;

          if (typeof thumbnail !== 'undefined') {
            thumbnailElem.setAttribute("src", thumbnail.url);
            thumbnailElem.setAttribute(
              "style", \`aspect-ratio: \${thumbnail.width} / \${thumbnail.height}\`
            );
          }

          thumbnailLink.appendChild(thumbnailElem);
          wrapper.appendChild(thumbnailLink);
          
          /* e.g.
           *
           *   <div class="video-info">
           *     <div class="video-title">My great video</div>
           *     <div class="video-channel">
           *       Channel: [My great channel]</div>
           *     <div class="video-published">
           *       Published: 7 May 2025
           *     </div>
           *     <div class="video-visibility">
           *       Visibility: [public/private]
           *     </div>
           *     <a href="https://www.youtube.com/watch?v=123" target="_blank">Watch on YouTube</a>
           *   </div>
           */
          const infoElem = document.createElement("div");
          infoElem.classList.add("video-info");
          
          // Title of the video
          const titleLink = document.createElement("a");
          titleLink.classList.add("video-title");
          titleLink.setAttribute("href", videoUrl);
          titleLink.setAttribute("target", "_blank");
          titleLink.innerText = video.title;
          infoElem.appendChild(titleLink);
          
          // Channel who published the video, and a link to their profile
          const channelElem = document.createElement("div");
          channelElem.classList.add("video-channel");
          channelElem.innerText = "Channel: ";

          const channelLink = document.createElement("a");
          channelLink.setAttribute(
            "href",
            \`https://www.youtube.com/channel/\${video.channelId}\`
          );
          channelLink.innerText = video.channelName;
          channelElem.appendChild(channelLink);
          
          infoElem.appendChild(channelElem);
          
          // Date the video was published
          const publishedElem = document.createElement("div");
          publishedElem.classList.add("video-published");
          publishedElem.innerText = "Published: ";
          
          const timeElem = document.createElement("time");
          timeElem.setAttribute("datetime", video.publishedAt);
          timeElem.innerText = new Date(video.publishedAt).toLocaleDateString(
            'en-US', { day: 'numeric', month: 'short', year: 'numeric' }
          );
          publishedElem.appendChild(timeElem);
          
          infoElem.appendChild(publishedElem);
          
          // Is the video public or private?
          const visibilityElem = document.createElement("div");
          visibilityElem.classList.add("video-visibility");
          visibilityElem.innerText = \`Visibility: \${video.visibility}\`;
          infoElem.appendChild(visibilityElem);
          
          // Link to the source video.
          const sourceLink = document.createElement("a");
          sourceLink.setAttribute("href", videoUrl);
          sourceLink.setAttribute("target", "_blank");
          sourceLink.innerText = "Watch on YouTube";
          infoElem.appendChild(sourceLink);
          
          wrapper.appendChild(infoElem);
          
          return wrapper;
        }
        
        document.addEventListener("DOMContentLoaded", () => {
          try {
            likedVideos.forEach(video =>
              document
                .querySelector("#videos")
                .appendChild(LikedVideo(video))
            )
          } catch (error) {
            const body = document.querySelector("body");
            
            body.innerHTML =
              \`<p style='color: red;'>Something went wrong: \${error}</p>\` +
              body.innerHTML;
          }
        });
      </script>
        
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
        
      <style>
        :root {
          --max-width: 34rem;
          --padding:   1em;
        }
        
        body {
          font-family: "Roboto", sans-serif;
          font-optical-sizing: auto;
          font-weight: 400;
          font-style: normal;
          font-variation-settings: "wdth" 100;
        }
        
        #videos {
          list-style-type: none;
          padding: 0;
        }
        
        .video-item {
          display: grid;
          grid-template-columns: 200px 1fr;
          grid-gap:      var(--padding);
          margin-bottom: var(--padding);
        }
        
        .video-item img {
          width: 100%;
          border-radius: 8px;
        }
        
        .video-info {
          font-size: 0.85em;
          line-height: 1.4em;
          padding-top: 8px;
        }
        
        .video-info, .video-info a {
          color: rgb(96, 96, 96);
        }
        
        .video-title {
          font-weight: 500;
          font-size: 1.35em;
          line-height: 1.35em;
          display: block;
          color: black !important;
          text-decoration: none;
          margin-bottom: 8px;
        }
      </style>
    </head>

    <body>
      <noscript>You need to enable JavaScript to see this list!</noscript>
        
      <ul id="videos"></ul>
    </body>

    </html>
  `;
}
