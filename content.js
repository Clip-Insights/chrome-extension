// content.js
let notesDatabase = ""; // Store the notes database

//const API_URL = 'https://app.clipinsights.com'
const API_URL = "http://127.0.0.1:8000";

const ENCRYPTION_KEY = "my-strong-encryption-key"; // Replace with a secret key (keep this secure)

// Add these constants near the top of the file
const CHAT_MEMORY_ENABLED = true; // Toggle chat memory feature
const CHAT_MEMORY_WINDOW_SIZE = 4; // Number of messages to remember

// Injects ClipInsights Notepad content from popup.html into the YouTube sidebar
function injectClipInsightsNotepad() {
  console.log("inside injectClipInsightsNotepad");

  const itemsDiv = document.querySelector(
    "#related.style-scope.ytd-watch-flexy"
  );
  if (!itemsDiv || !isYouTubeVideoPage()) {
    // If the sidebar doesn't exist or it's not a YouTube video page, then remove the previous ClipInsights Notepad and return
    const existingNotepad = document.getElementById("clip-insights-notepad");
    const existingNotepadStyles = document.getElementById(
      "clip-insights-notepad-styles"
    );
    if (existingNotepad) {
      existingNotepad?.remove();
      existingNotepadStyles?.remove();
      console.log("removed existing notepad");
    }

    return;
  }

  const notesDatabase2 = new YouTubeNotesDatabase();
  notesDatabase = notesDatabase2;
  console.log("injectClipInsightsNotepad before");

  // Remove existing ClipInsights Notepad if it exists (to handle page navigation on video change)
  const existingNotepad = document.getElementById("clip-insights-notepad");
  const existingNotepadStyles = document.getElementById(
    "clip-insights-notepad-styles"
  );
  if (existingNotepad) {
    existingNotepad?.remove();
    existingNotepadStyles?.remove();
  }
  //--------delete old screenshots-----//
  const fiveDaysInMillis = 5 * 24 * 60 * 60 * 1000;
  console.log("Time set");
  const currentTime = Date.now();
  
  const oldRecordsDeleted = deleteOldRecords(
    fiveDaysInMillis,
    currentTime
  );
  
  oldRecordsDeleted.then((deletedCounts) => {
    console.log(
      `Deleted records - Keypoints: ${deletedCounts.keypoints}, Screenshots: ${deletedCounts.screenshots}, Summaries: ${deletedCounts.summaries}, TextNotes: ${deletedCounts.textNotes}`
    );
  });
  //----------------------------------//

  // Create a new div for ClipInsights Notepad
  const ClipInsightsNotepadDiv = document.createElement("div");
  ClipInsightsNotepadDiv.id = "clip-insights-notepad";
  // console.log("injectClipInsightsNotepad after");

  // Fetch popup.html content and inject it into the new div
  fetch(chrome.runtime.getURL("popup.html"))
    .then((response) => response.text())
    .then((html) => {
      ClipInsightsNotepadDiv.innerHTML = html;
      itemsDiv.prepend(ClipInsightsNotepadDiv); // Add Notepad div to sidebar

      // Add CSS styling to the document head
      const style = document.createElement("style");
      style.id = "clip-insights-notepad-styles";
      style.textContent = `
        /* Global Styles */
        #clip-insights-notepad {
          font-family: "Roboto", sans-serif;
          background-color: #F7FAFF;
          margin: 0;
          padding: 20px;
          color: #333;
          border-radius: 16px;
          margin-bottom: 20px;
          height: 494px; /* Set fixed height */
          overflow-y: auto;
        }
        /* Additional styles... */
      `;
      document.head.appendChild(style);
      const chatContainer = ClipInsightsNotepadDiv.querySelector(
        "#clipinsights__chatContainer"
      );
      const loginBtn = ClipInsightsNotepadDiv.querySelector(
        "#clipinsights__loginBtn"
      );
      const backBtn = ClipInsightsNotepadDiv.querySelector(
        "#clipinsights__backBtn"
      );
      const mainContent = ClipInsightsNotepadDiv.querySelector(
        "#clipinsights__mainContent"
      );
      const loginContainer = ClipInsightsNotepadDiv.querySelector(
        "#clipinsights__loginContainer"
      );

      // Show the login page and hide the main content
      loginBtn.addEventListener("click", () => {
        mainContent.style.display = "none";
        loginContainer.style.display = "block";
      });
      // Go back to the main content and hide the login page
      backBtn.addEventListener("click", () => {
        loginContainer.style.display = "none";
        mainContent.style.display = "block";
      });

      ClipInsightsNotepadDiv.querySelector(
        "#clipinsights__noteInput"
      ).addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault(); // Prevent the default action (form submission, etc.)
          addNote(); // Call the addNote function
        }
      });

      const noteInput = ClipInsightsNotepadDiv.querySelector(
        "#clipinsights__noteInput"
      );

      // Scroll the multi-line note input
      noteInput.addEventListener("input", () => {
        // If content exceeds the max height, scroll it within
        if (noteInput.scrollHeight > noteInput.clientHeight) {
          noteInput.scrollTop = noteInput.scrollHeight; // Scroll to the bottom
        }
      });

      restoreScreenshotsAndNotes(); // Restore notes and screenshots from localStorage when extension is loaded
      // Event listeners for buttons
      ClipInsightsNotepadDiv.querySelector("#clipinsights__addNoteBtn")?.addEventListener("click", addNote);
ClipInsightsNotepadDiv.querySelector("#clipinsights__screenshotBtn")?.addEventListener("click", takeScreenshot);
ClipInsightsNotepadDiv.querySelector("#clipinsights__summaryBtn")?.addEventListener("click", showSummary);
ClipInsightsNotepadDiv.querySelector("#clipinsights__closeSummary").addEventListener("click", hideSummary);
ClipInsightsNotepadDiv.querySelector("#clipinsights__keypointsBtn")?.addEventListener("click", showKeyPoints);
ClipInsightsNotepadDiv.querySelector("#clipinsights__closeKeyPoints").addEventListener("click", hideKeyPoints);
ClipInsightsNotepadDiv.querySelector("#clipinsights__clearBtn")?.addEventListener("click", clearAllScreenshotsAndNotes);
ClipInsightsNotepadDiv.querySelector("#clipinsights__sendChatBtn")?.addEventListener("click", sendMessage);
ClipInsightsNotepadDiv.querySelector("#clipinsights__copyTranscriptBtn")?.addEventListener("click", handleCopyTranscript);
ClipInsightsNotepadDiv.querySelector("#clipinsights__sendChatBtn")?.addEventListener("click", sendMessage);

const saveButton = ClipInsightsNotepadDiv.querySelector("#clipinsights__saveBtn");
saveButton?.addEventListener("click", async () => {
  // Disable the button
  saveButton.disabled = true;
  // Save the original content (HTML) to restore it later
  const originalContent = saveButton.innerHTML;
  // Update the button content for the loading state
  saveButton.innerHTML = "Saving...";
  try {
    // Call your save function
    await saveAsPDF();
  } catch (error) {
    console.error("Error saving as PDF:", error);
  } finally {
    // Restore the original content and re-enable the button
    saveButton.innerHTML = originalContent;
    saveButton.disabled = false;
  }
});

const uploadButton = ClipInsightsNotepadDiv.querySelector("#clipinsights__uploadBtn");
uploadButton?.addEventListener("click", async () => {
  // Save the original content BEFORE disabling the button
  const originalContent = uploadButton.innerHTML;
  // Now disable the button and update its content
  uploadButton.disabled = true;
  uploadButton.innerHTML = "Uploading...";
  try {        
    await uploadPDF(); // Handles uploading to server
  } catch (error) {
    console.error("Error uploading PDF:", error);
  } finally {
    uploadButton.innerHTML = originalContent;
    uploadButton.disabled = false;
  }
});

// Adding keyboard shortcuts for all actions (using Ctrl + Shift + [Key])
document.addEventListener("keydown", (event) => {
  // Only trigger if Ctrl and Shift are pressed together
  if (event.ctrlKey && event.shiftKey) {
    switch (event.key.toUpperCase()) {
      case "S": // Ctrl+Shift+S for screenshot
        event.preventDefault();
        takeScreenshot();
        break;
      case "Y": // Ctrl+Shift+Y for show summary
        event.preventDefault();
        showSummary();
        break;
      case "H": // Ctrl+Shift+H for hide summary
        event.preventDefault();
        hideSummary();
        break;
      case "K": // Ctrl+Shift+K for show key points
        event.preventDefault();
        showKeyPoints();
        break;
      case "L": // Ctrl+Shift+L for hide key points
        event.preventDefault();
        hideKeyPoints();
        break;
      case "C": // Ctrl+Shift+C for clear all screenshots and notes
        event.preventDefault();
        clearAllScreenshotsAndNotes();
        break;
      case "T": // Ctrl+Shift+T for copy transcript
        event.preventDefault();
        handleCopyTranscript();
        break;
      case "P": // Ctrl+Shift+P for saving as PDF
        event.preventDefault();
        (async () => {
          if (saveButton) {
            saveButton.disabled = true;
            const originalContent = saveButton.innerHTML;
            saveButton.innerHTML = "Saving...";
            try {
              await saveAsPDF();
            } catch (error) {
              console.error("Error saving as PDF:", error);
            } finally {
              saveButton.innerHTML = originalContent;
              saveButton.disabled = false;
            }
          }
        })();
        break;
      case "U": // Ctrl+Shift+U for uploading PDF
        event.preventDefault();
        (async () => {
          if (uploadButton) {
            const originalContent = uploadButton.innerHTML;
            uploadButton.disabled = true;
            uploadButton.innerHTML = "Uploading...";
            try {
              await uploadPDF();
            } catch (error) {
              console.error("Error uploading PDF:", error);
            } finally {
              uploadButton.innerHTML = originalContent;
              uploadButton.disabled = false;
            }
          }
        })();
        break;
      default:
        break;
    }
  }
});


      const loginBtnSpan = loginBtn.querySelector("span");

      // Initial check of authentication status and button text update
      async function updateLoginButtonState() {
        const authStatus = await checkAuthenticationStatus();
        loginBtnSpan.textContent =
          authStatus === "logged-in" ? "Logout" : "Login";
      }

      // Call this when the extension loads
      updateLoginButtonState();

      // Modified login button click handler
      loginBtn.addEventListener("click", async () => {
        const authStatus = await checkAuthenticationStatus();

        if (authStatus === "logged-in") {
          // Handle logout
          const logoutSuccess = await logout();
          if (logoutSuccess) {
            loginBtnSpan.textContent = "Login";
            mainContent.style.display = "block";
            loginContainer.style.display = "none";
          }
        } else {
          // Show login page
          mainContent.style.display = "none";
          loginContainer.style.display = "block";
        }
      });

      // Modify your authenticate function to update button text after successful login
      const originalAuthenticate = authenticate;
      authenticate = async function () {
        await originalAuthenticate();
        const authStatus = await checkAuthenticationStatus();
        if (authStatus === "logged-in") {
          loginBtnSpan.textContent = "Logout";
        }
      };

      const submitLoginBtn = ClipInsightsNotepadDiv.querySelector(
        "#clipinsights__submitLogin"
      );
      submitLoginBtn?.addEventListener("click", async () => {
        submitLoginBtn.disabled = true;
        const originalContent = submitLoginBtn.innerHTML;
        submitLoginBtn.innerHTML = "Verifying";

        await authenticate();
        submitLoginBtn.innerHTML = originalContent;
        submitLoginBtn.disabled = false;
      });

      ClipInsightsNotepadDiv.querySelector(
        "#clipinsights__chatBtn"
      )?.addEventListener("click", async () => {
        // console.log("Chat button clicked!", chatContainer);
        mainContent.style.display = "none";
        chatContainer.style.display = "block";
        
        // Initialize limit badge with current remaining count
        const CHAT_LIMIT_KEY = "yt-chat-limit";
        let chatLimitData = localStorage.getItem(CHAT_LIMIT_KEY);
        if (chatLimitData) {
          chatLimitData = JSON.parse(chatLimitData);
          if (Date.now() - chatLimitData.timestamp > 24 * 60 * 60 * 1000) {
            chatLimitData = { count: 0, timestamp: Date.now() };
          }
        } else {
          chatLimitData = { count: 0, timestamp: Date.now() };
        }
        const remaining = 10 - chatLimitData.count;
        updateLimitBadge(remaining);
        
        // Proactively fetch transcript context
        const contextTimeElement = document.getElementById("clipinsights__contextTime");
        const contextIcon = document.getElementById("clipinsights__contextIcon");
        
        // Set loading state
        if (contextTimeElement && contextIcon) {
          contextTimeElement.textContent = "Analyzing video...";
          contextTimeElement.classList.add("loading");
          contextIcon.classList.add("loading");
          
          try {
            const youtubeUrl = window.location.href;
            if (youtubeUrl && youtubeUrl.includes("youtube.com/watch")) {
              const transcription = await fetchTranscript(youtubeUrl);
              
              // Remove loading state
              contextTimeElement.classList.remove("loading");
              contextIcon.classList.remove("loading");
              contextTimeElement.classList.remove("error");
              
              // Update with actual context info
              if (transcription.lastTagTime !== -1) {
                const sliceTimeInMinutes = (transcription.lastTagTime / 60).toFixed(2);
                contextTimeElement.textContent = `Context up to ${sliceTimeInMinutes} min`;
              } else if (transcription.transcript === "Transcript not available" || 
                         transcription.transcript === "No captions available" ||
                         transcription.transcript === "Failed to fetch transcript") {
                contextTimeElement.textContent = "No transcript available";
                contextTimeElement.classList.add("error");
              } else {
                contextTimeElement.textContent = "Full video context";
              }
            } else {
              contextTimeElement.textContent = "Not a YouTube video";
              contextTimeElement.classList.remove("loading");
              contextIcon.classList.remove("loading");
              contextTimeElement.classList.add("error");
            }
          } catch (error) {
            console.error("Error fetching context:", error);
            contextTimeElement.textContent = "Context unavailable";
            contextTimeElement.classList.remove("loading");
            contextIcon.classList.remove("loading");
            contextTimeElement.classList.add("error");
          }
        }
      });
      ClipInsightsNotepadDiv.querySelector(
        "#clipinsights__closeChat"
      )?.addEventListener("click", () => {
        document.getElementById("clipinsights__chatContainer").style.display =
          "block";
        mainContent.style.display = "block";
        chatContainer.style.display = "none";
      });

      clipinsights__chatInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
          sendMessage();
        }
      });
    })
    .catch((error) => console.error("Error loading popup.html:", error));
}

function getYouTubeUrl() {
  const url = window.location.href;
  const videoId = url.split("v=")[1].split("&")[0];
  return `https://www.youtube.com/watch?v=${videoId}`;
}

// Function to add a note
async function addNote() {
  const note = document.getElementById("clipinsights__noteInput").value;

  if (!note) {
    alert("Please enter a note.");
    return;
  }
  // if (note.length >= 7000) {
  //   alert("Note is too long. Please reduce its length.");
  //   return;
  // }
  // Send message to background.js
  chrome.runtime.sendMessage(
    { action: "addNote", note: note },
    async (response) => {
      if (response.error) {
        console.error(response.error);
        alert(response.error);
      } else {
        try {
          // Save note to IndexedDB
          await notesDatabase.saveTextNote(
            response.note,
            response.time,
            getYouTubeUrl()
          );

          addNoteToPopup(response.note, response.time);
        } catch (error) {
          console.error("Error saving note to IndexedDB:", error);
          alert("Failed to save note");
        }
      }
    }
  );
  // Clear the input field after adding the note
  document.getElementById("clipinsights__noteInput").value = "";
}

// Function for update and delete notes in real-time
function addNoteToPopup(note, time) {
  const screenshotNoteContainer = document.getElementById(
    "clipinsights__screenshotNoteContainer"
  );

  const div = document.createElement("div");
  div.classList.add("clipinsights__screenshot-note");
  div.dataset.timestamp = time;

  const actionBtns = document.createElement("div");
  actionBtns.classList.add("clipinsights__note-actions");

  // Create delete button for note
  const deleteBtn = document.createElement("button");
  deleteBtn.classList.add("clipinsights__delete-btn");
  deleteBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg><span class="clipinsights__btnTooltip">Delete</span>`;

  // Create update button for note
  const updateBtn = document.createElement("button");
  updateBtn.classList.add("clipinsights__update-btn");
  updateBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg><span class="clipinsights__btnTooltip">Edit</span>`;

  // Add click handler for delete button
  deleteBtn.addEventListener("click", async () => {
    try {
      // Get the video URL
      const videoUrl = await getYouTubeUrl();

      // Get the current note text from the UI
      const currentNoteText = div.querySelector(".clipinsights__note").textContent;

      // Find the note in IndexedDB and delete it
      const notes = await notesDatabase.getAllTextNotes(videoUrl);
      const noteToDelete = notes.find(
        (n) => n.text === currentNoteText && n.videoTimestamp === time
      );

      if (noteToDelete) {
        await notesDatabase.deleteTextNote(noteToDelete.id);
        // Remove from UI
        div.remove();
      } else {
        console.error("Note not found in database");
      }
    } catch (error) {
      console.error("Error deleting note:", error);
      alert("Failed to delete note");
    }
  });

  // Add click handler for update button
  updateBtn.addEventListener("click", () => {
    enableNoteEditMode(div, note, time);
  });

  const noteElement = document.createElement("p");
  noteElement.classList.add("clipinsights__note");
  noteElement.textContent = note;

  const timestamp = document.createElement("p");
  timestamp.classList.add("clipinsights__timestamp");
  timestamp.textContent = `${convertSecondsToHMS(time)}`;

  actionBtns.appendChild(updateBtn);
  actionBtns.appendChild(deleteBtn);
  div.appendChild(actionBtns);
  div.appendChild(noteElement);
  div.appendChild(timestamp);

  screenshotNoteContainer.appendChild(div);

  // Scroll to the newly added note
  screenshotNoteContainer.scrollTo({
    top: screenshotNoteContainer.scrollHeight,
    behavior: "smooth",
  });
}

// Function to enable edit mode for a note
function enableNoteEditMode(noteElement, currentText, timestamp) {
  const noteTextElement = noteElement.querySelector(".clipinsights__note");
  const originalText = noteTextElement.textContent;
  
  // Create and configure textarea
  const textarea = document.createElement("textarea");
  textarea.classList.add("clipinsights__note-edit");
  textarea.value = originalText;
  textarea.rows = 2;
  
  // Replace note text with textarea
  noteTextElement.style.display = "none";
  noteElement.insertBefore(textarea, noteTextElement);
  textarea.focus();
  
  // Function to save the updated note
  async function saveNote() {
    const updatedText = textarea.value.trim();
    if (updatedText.length === 0) {
      alert("Note cannot be empty");
      return;
    }
    
    // Update note in database
    const updated = await updateNoteInDatabase(null, updatedText, timestamp);
    if (updated) {
      // Update UI
      noteTextElement.textContent = updatedText;
      cleanupEditMode();
      noteElement.classList.add("clipinsights__note-updated");
      setTimeout(() => {
        noteElement.classList.remove("clipinsights__note-updated");
      }, 2000);
    }
  }
  
  textarea.addEventListener("keydown", async (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // Prevent adding a new line
      await saveNote();
    } else if (e.key === "Escape") {
      cleanupEditMode(); // Cancel on Escape key
    }
  });
  
  textarea.addEventListener("blur", async () => {
    setTimeout(async () => {
      if (document.contains(textarea)) {
        await saveNote();
      }
    }, 200);
  });
  
  function cleanupEditMode() {
    textarea.remove();
    noteTextElement.style.display = "";
  }
}

// Helper function to update the note in the database
async function updateNoteInDatabase(noteId, updatedNote, time) {
  try {
    const videoUrl = await getYouTubeUrl();
    
    if (noteId) {
      await notesDatabase.updateNote(noteId, {
        text: updatedNote,
        videoTimestamp: time
      });
    } else {
      const notes = await notesDatabase.getAllTextNotes(videoUrl);
      const noteToUpdate = notes.find(n => n.videoTimestamp === time);
      
      if (noteToUpdate) {
        await notesDatabase.updateNote(noteToUpdate.id, {
          text: updatedNote,
          videoTimestamp: time,
          videoUrl: videoUrl 
        });
      } else {
        console.error("Note not found in database");
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error("Error updating note in database:", error);
    return false;
  }
}

// dont needed
function saveNoteToLocalStorage(note, time) {
  let savedNotes = JSON.parse(localStorage.getItem("notes")) || [];
  savedNotes.push({ note, time });
  localStorage.setItem("notes", JSON.stringify(savedNotes));
}

async function takeScreenshot() {
  const videoUrl = getYouTubeUrl();

  // Get the current screenshot count for the video URL
  let screenshotCount =
    parseInt(localStorage.getItem(`${videoUrl}_screenshotCount`)) || 0;

  if (screenshotCount >= 40) {
    alert("Screenshot limit reached for this video.");
    return;
  }
  chrome.runtime.sendMessage({ action: "takeScreenshot" }, async (response) => {
    if (response.error) {
      console.error(response.error);
      alert(response.error);
    } else {
      try {
        addScreenshotToPopup(response.screenshotUrl, response.time);
        // saving screenshot to indexedDB
        await notesDatabase.saveScreenshot(
          response.screenshotUrl,
          response.time,
          getYouTubeUrl()
        );
        screenshotCount++;
        localStorage.setItem(`${videoUrl}_screenshotCount`, screenshotCount);
      } catch (error) {
        console.error("Error saving screenshot to IndexedDB:", error);
        alert("Failed to save screenshot");
      }
    }
  });
}

// Function to add a screenshot to the popup in real-time
function addScreenshotToPopup(screenshotUrl, time) {
  const screenshotNoteContainer = document.getElementById(
    "clipinsights__screenshotNoteContainer"
  );

  const div = document.createElement("div");
  div.classList.add("clipinsights__screenshot-note");

  // Create action buttons container for consistent positioning
  const actionBtns = document.createElement("div");
  actionBtns.classList.add("clipinsights__note-actions");

  // Create delete button
  const deleteBtn = document.createElement("button");
  deleteBtn.classList.add("clipinsights__delete-btn");
  deleteBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg><span class="clipinsights__btnTooltip">Delete</span>`;

  // Add click handler for delete button
  deleteBtn.addEventListener("click", async () => {
    try {
      // Get the video URL
      const videoUrl = await getYouTubeUrl();

      // Delete from IndexedDB
      await notesDatabase.deleteScreenshot(screenshotUrl, videoUrl);

      // Remove from UI
      div.remove();

      // Update screenshot count in localStorage
      let screenshotCount =
        parseInt(localStorage.getItem(`${videoUrl}_screenshotCount`)) || 0;
      if (screenshotCount > 0) {
        localStorage.setItem(
          `${videoUrl}_screenshotCount`,
          screenshotCount - 1
        );
      }
    } catch (error) {
      console.error("Error deleting screenshot:", error);
      alert("Failed to delete screenshot");
    }
  });

  // Add delete button to action container
  actionBtns.appendChild(deleteBtn);

  const img = document.createElement("img");
  img.src = screenshotUrl;
  img.classList.add("clipinsights__screenshot");

  // Wait for the image to load before scrolling
  img.onload = () => {
    screenshotNoteContainer.scrollTo({
      top: screenshotNoteContainer.scrollHeight,
      behavior: "smooth",
    });
  };

  // Add action buttons and image to container
  div.appendChild(actionBtns);
  div.appendChild(img);

  const timestamp = document.createElement("p");
  timestamp.classList.add("clipinsights__timestamp");
  timestamp.textContent = convertSecondsToHMS(time);
  div.appendChild(timestamp);

  screenshotNoteContainer.appendChild(div);
}

// don't needed ; Save screenshot and note to localStorage
function saveScreenshotToLocalStorage(screenshotUrl, time) {
  let savedScreenshots = JSON.parse(localStorage.getItem("screenshots")) || [];
  savedScreenshots.push({ screenshotUrl, time });
  localStorage.setItem("screenshots", JSON.stringify(savedScreenshots));
}

function convertSecondsToHMS(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  // Prepare the formatted components
  const paddedHours = String(hours).padStart(2, "0");
  const paddedMinutes = String(minutes).padStart(2, "0");
  const paddedSeconds = String(seconds).padStart(2, "0");

  // Construct the result based on what's present
  let result = "";

  if (hours > 0) {
    result += `${paddedHours}:`;
  }

  if (minutes > 0 || hours > 0) {
    // Show minutes if there are hours or if minutes are > 0
    result += `${paddedMinutes}:`;
  }

  result += paddedSeconds; // Always show seconds

  return result;
}

// Restore screenshots and notes from localStorage when popup is opened
async function restoreScreenshotsAndNotes() {
  console.log("restoreScreenshotsAndNotes");
  const youtube_url = getYouTubeUrl();
  const savedScreenshots = (await notesDatabase.getAllScreenshots(youtube_url)) || "";
  const savedNotes = (await notesDatabase.getAllTextNotes(youtube_url)) || "";
  console.log("savedScreenshots", savedScreenshots);

  // Combine screenshots and notes into a single array
  const allItems = [
    ...savedScreenshots.map(screenshot => ({
      type: 'screenshot',
      item: screenshot,
      videoTimestamp: screenshot.videoTimestamp
    })),
    ...savedNotes.map(note => ({
      type: 'note',
      item: note,
      videoTimestamp: note.videoTimestamp
    }))
  ];

  // Sort all items by videoTimestamp
  allItems.sort((a, b) => a.videoTimestamp - b.videoTimestamp);

  // Add each item to the popup in sorted order
  allItems.forEach(item => {
    if (item.type === 'screenshot') {
      addScreenshotToPopup(item.item.url, item.item.videoTimestamp);
    } else {
      addNoteToPopup(item.item.text, item.item.videoTimestamp);
    }
  });
  const savedSummary = await notesDatabase.getSummary(youtube_url) || "";
  const savedKeypoints = await notesDatabase.getKeypoints(youtube_url) || [];
  // // Restore the summary if it exists
  // if (savedSummary) {
  //   document.getElementById("clipinsights__summary").innerHTML = formatSummaryToHTML(savedSummary[0]?.text);
  //   document.getElementById("clipinsights__keypoints").innerHTML = formatKeypoints(savedKeypoints[0]?.text);
  // } else {
  //   document.getElementById("clipinsights__summary").innerHTML = "";
  //   document.getElementById("clipinsights__keypoints").innerHTML = "";
  // }
}

// Clear all screenshots and notes
async function clearAllScreenshotsAndNotes() {
  // Clear the popup
  // document.getElementById("clipinsights__screenshotNoteContainer").innerHTML =
  //   "";
  const container = document.getElementById("clipinsights__screenshotNoteContainer");
  if (container) {
    [...container.children].forEach(child => {
      if (!child.classList.contains("clipinsights__userlimit")) {
        container.removeChild(child);
      }
    });
  }

  document.getElementById("clipinsights__summary").innerHTML = "";
  document.getElementById("clipinsights__keypoints").innerHTML = "";
  document.getElementById("clipinsights__chatMessages").innerHTML = ""; // Clear the summary from the UI
  // document.getElementById('clipinsights__summary').style.display = 'none';
  // document.getElementById('clipinsights__keypoints').style.display = 'none';

  // Clear from localStorage
  // localStorage.removeItem('screenshots');
  // localStorage.removeItem('notes');
  // Clear specific localStorage items
  localStorage.removeItem(`${getYouTubeUrl()}_screenshotCount`);
  localStorage.removeItem("summary");
  localStorage.removeItem("keypoints");

  try {
    // Clear all notes and screenshots for the current video
    const videoUrl = getYouTubeUrl();

    // Step 1: Delete all text notes and screenshots for the video
    const result = await notesDatabase.deleteAllVideoNotes(videoUrl);
    console.log(
      `Deleted ${result.textNotesDeleted} text notes and ${result.screenshotsDeleted} screenshots for video: ${videoUrl}`
    );
  } catch (error) {
    console.error("Error clearing notes and screenshots:", error);
  }
}

// Helper function to delete screenshots older than a specified time threshold
async function deleteOldRecords(thresholdMillis, currentTime) {
  if (!notesDatabase.db) {
    try {
      await notesDatabase.initDatabase();
    } catch (error) {
      console.error("Failed to initialize the database:", error);
      throw error;
    }
  }

  const stores = ["keypoints", "screenshots", "summaries", "textNotes"];
  const deletedCounts = { keypoints: 0, screenshots: 0, summaries: 0, textNotes: 0 };

  return new Promise((resolve, reject) => {
    let transactionsCompleted = 0;

    stores.forEach((storeName) => {
      const transaction = notesDatabase.db.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const cursorRequest = store.openCursor();

      cursorRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const record = cursor.value;
          if (currentTime - record.createdAt > thresholdMillis) {
            const deleteRequest = cursor.delete();
            deleteRequest.onsuccess = () => {
              deletedCounts[storeName]++;
              console.log(`Deleted old record from ${storeName} with ID: ${record.id}`);
            };
            deleteRequest.onerror = (errorEvent) => {
              console.error(`Failed to delete record from ${storeName} with ID: ${record.id}`, errorEvent.target.error);
            };
          }
          cursor.continue();
        } else {
          transactionsCompleted++;
          if (transactionsCompleted === stores.length) {
            resolve(deletedCounts);
          }
        }
      };

      cursorRequest.onerror = (event) => {
        console.error(`Error iterating ${storeName} for deletion:`, event.target.error);
        reject(event.target.error);
      };
    });
  });
}


function cleanYouTubeTitle(title) {
  // Remove starting brackets with numbers and "- YouTube" at the end
  return title.replace(/^\(\d+\)\s*/, "").replace(/\s*-\s*YouTube$/, "");
}


async function generatePDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // PDF styling constants
  const colors = {
    primary: [37, 99, 235],      // Modern blue #2563EB
    text: [33, 33, 33],           // Dark gray #212121
    lightGray: [243, 244, 246],   // #F3F4F6
    mediumGray: [156, 163, 175],  // #9CA3AF
    border: [229, 231, 235]       // #E5E7EB
  };
  
  const fonts = {
    h1: 18,
    h2: 14,
    body: 11,
    small: 9
  };
  
  const margins = {
    left: 15,
    right: 15,
    top: 15,
    bottom: 25  // Extra space for footer
  };

  // Helper function to add page numbers and footer
  const addPageFooter = (pageNum) => {
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // Add generation date on left
    doc.setFontSize(fonts.small);
    doc.setTextColor(...colors.mediumGray);
    doc.setFont("helvetica", "normal");
    const generatedText = `Generated on ${new Date().toLocaleDateString()}`;
    doc.text(generatedText, margins.left, pageHeight - 10);
    
    // Add page number on right
    const pageText = `Page ${pageNum}`;
    const pageTextWidth = doc.getTextWidth(pageText);
    doc.text(pageText, pageWidth - margins.right - pageTextWidth, pageHeight - 10);
    
    // Reset color
    doc.setTextColor(...colors.text);
  };

  // Helper function to add section header with background
  const addSectionHeader = (text, yPos) => {
    const pageWidth = doc.internal.pageSize.width;
    
    // Draw background rectangle
    doc.setFillColor(...colors.lightGray);
    doc.rect(margins.left - 2, yPos - 6, pageWidth - margins.left - margins.right + 4, 10, 'F');
    
    // Add header text
    doc.setFontSize(fonts.h2);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colors.text);
    doc.text(text, margins.left, yPos);
    
    return yPos + 10; // Return new y position
  };

  // Directly access document's title and location in content.js
  const videoTitle = cleanYouTubeTitle(document.title);
  const videoUrl = getYouTubeUrl();
  let y = margins.top;
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height - margins.bottom;
  let currentPage = 1;

  // Add "Clip Insights" title - centered and prominent
  doc.setFontSize(fonts.h1);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...colors.primary);
  const title = "Clip Insights";
  const textWidth = doc.getTextWidth(title);
  const centerX = (pageWidth - textWidth) / 2; 
  doc.text(title, centerX, y);
  y += 3;
  
  // Underline with primary color
  doc.setDrawColor(...colors.primary);
  doc.setLineWidth(0.5);
  doc.line(centerX, y, centerX + textWidth, y);
  doc.setDrawColor(...colors.border);
  doc.setLineWidth(0.1);
  y += 12;

  // Add video title with link
  doc.setFontSize(fonts.h2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...colors.text);
  const titleLines = doc.splitTextToSize(videoTitle, pageWidth - margins.left - margins.right);
  titleLines.forEach((line, index) => {
    doc.textWithLink(line, margins.left, y, { url: videoUrl });
    y += index < titleLines.length - 1 ? 6 : 8;
  });
  
  // Separator line
  doc.setDrawColor(...colors.border);
  doc.line(margins.left, y, pageWidth - margins.right, y);
  y += 10;

  const savedScreenshots = await notesDatabase.getAllScreenshots(videoUrl);
  const savedNotes = await notesDatabase.getAllTextNotes(videoUrl);
  const resultSummary = await notesDatabase.getSummary(videoUrl);
  const savedSummary = resultSummary[0]?.text;
  const resultKeypoints = await notesDatabase.getKeypoints(videoUrl);
  const savedKeypoints = resultKeypoints[0]?.text;

  if (savedKeypoints) {
    // Ensure enough space for section header
    if (y + 25 > pageHeight) {
      addPageFooter(currentPage);
      doc.addPage();
      currentPage++;
      y = margins.top;
    }

    // Add section header with background
    y = addSectionHeader("Key Points", y);

    doc.setFontSize(fonts.body);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...colors.text);

    let keyPointsArray;
    try {
      keyPointsArray = Array.isArray(savedKeypoints)
        ? savedKeypoints
        : JSON.parse(savedKeypoints.replace(/'/g, '"'));

      if (!Array.isArray(keyPointsArray)) {
        keyPointsArray = keyPointsArray.key_points || [];
      }
    } catch (error) {
      console.error("Error parsing keypoints:", error);
      keyPointsArray = [];
    }

    // Add key points with better formatting
    keyPointsArray.forEach((point, index) => {
      const bulletPoint = `${index + 1}. ${point}`;
      const wrappedText = doc.splitTextToSize(bulletPoint, pageWidth - margins.left - margins.right - 5);

      wrappedText.forEach((line, lineIndex) => {
        if (y + 8 > pageHeight) {
          addPageFooter(currentPage);
          doc.addPage();
          currentPage++;
          y = margins.top;
        }
        
        // Add subtle left border for visual grouping
        if (lineIndex === 0) {
          doc.setDrawColor(...colors.primary);
          doc.setLineWidth(1);
          doc.line(margins.left, y - 3, margins.left, y + 3);
          doc.setDrawColor(...colors.border);
          doc.setLineWidth(0.1);
        }
        
        doc.text(line, margins.left + 3, y);
        y += 5.5;
      });
      
      y += 2; // Extra spacing between points
    });

    y += 10; // Section spacing
  }
  // Combine screenshots and notes into a single array and sort by timestamp
  const combinedContent = [];

  savedScreenshots.forEach((screenshot) => {
    combinedContent.push({ type: "screenshot", data: screenshot });
  });

  savedNotes.forEach((note) => {
    combinedContent.push({ type: "note", data: note });
  });

  combinedContent.sort((a, b) => a.data.videoTimestamp - b.data.videoTimestamp);

  y += 10;
  // Add "Screenshots & Notes" heading with a proper line underneath
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Screenshots & Notes", 10, y);
  doc.setFontSize(12);
  // Draw a horizontal line below the heading
  y += 3;
  doc.line(10, y, 200, y); // (x1, y1, x2, y2) coordinates for the line
  y += 10; // Add spacing after the line

  // Process each item (note or screenshot) in the combined content
  for (const [index, item] of combinedContent.entries()) {
    if (item.type === "note") {
      const lineHeight = 6;
      
      // Check if we need a new page before starting the note
      if (y + lineHeight + 15 > pageHeight) {
        addPageFooter(currentPage);
        doc.addPage();
        currentPage++;
        y = margins.top;
      }
      
      // Create timestamp badge
      const timestamp = convertSecondsToHMS(item.data.videoTimestamp);
      doc.setFontSize(fonts.small);
      doc.setFont("helvetica", "bold");
      
      // Draw timestamp badge background
      const badgeWidth = doc.getTextWidth(timestamp) + 6;
      doc.setFillColor(219, 234, 254); // Light blue background
      doc.roundedRect(margins.left, y - 4, badgeWidth, 6, 1, 1, 'F');
      
      // Add timestamp text with link
      doc.setTextColor(...colors.primary);
      doc.textWithLink(
        timestamp,
        margins.left + 3,
        y,
        {
          url: `${videoUrl}&t=${Math.floor(item.data.videoTimestamp)}s`,
        }
      );
      
      y += 8;

      // Add the note text with left border for visual grouping
      doc.setFontSize(fonts.body);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...colors.text);
      
      const noteText = item.data.text;
      const noteLines = doc.splitTextToSize(noteText, pageWidth - margins.left - margins.right - 8);

      // Draw left border for note
      const noteStartY = y;
      
      // Write note lines one by one, checking for page breaks
      for (let i = 0; i < noteLines.length; i++) {
        // Check if we need a new page for this line
        if (y + lineHeight > pageHeight) {
          // Draw border for previous page
          doc.setDrawColor(...colors.primary);
          doc.setLineWidth(1);
          doc.line(margins.left, noteStartY - 2, margins.left, y - 2);
          
          addPageFooter(currentPage);
          doc.addPage();
          currentPage++;
          y = margins.top;
        }
        
        // Write the line with indent
        doc.text(noteLines[i], margins.left + 5, y);
        y += lineHeight;
      }
      
      // Draw left border for the note
      doc.setDrawColor(...colors.primary);
      doc.setLineWidth(1);
      doc.line(margins.left, noteStartY - 2, margins.left, y - 2);
      doc.setDrawColor(...colors.border);
      doc.setLineWidth(0.1);

      // Add subtle separator line
      y += 3;
      if (y + 5 > pageHeight) {
        addPageFooter(currentPage);
        doc.addPage();
        currentPage++;
        y = margins.top;
      }
      
      doc.setDrawColor(...colors.border);
      doc.line(margins.left, y, pageWidth - margins.right, y);
      y += 8;
      
    } else if (item.type === "screenshot") {
      const imageHeight = 100;
      const imageWidth = pageWidth - margins.left - margins.right;
      
      if (y + imageHeight + 20 > pageHeight) {
        addPageFooter(currentPage);
        doc.addPage();
        currentPage++;
        y = margins.top;
      }

      await new Promise((resolve) => {
        convertImageToDataUrl(item.data.url, (dataUrl) => {
          // Draw border around screenshot
          doc.setDrawColor(...colors.border);
          doc.setLineWidth(0.5);
          doc.rect(margins.left, y, imageWidth, imageHeight);
          
          // Add screenshot
          doc.addImage(dataUrl, "JPEG", margins.left, y, imageWidth, imageHeight);
          y += imageHeight + 5;

          // Create timestamp badge for screenshot
          const timestamp = convertSecondsToHMS(item.data.videoTimestamp);
          doc.setFontSize(fonts.small);
          doc.setFont("helvetica", "bold");
          
          const badgeWidth = doc.getTextWidth(timestamp) + 6;
          doc.setFillColor(219, 234, 254);
          doc.roundedRect(margins.left, y - 4, badgeWidth, 6, 1, 1, 'F');
          
          doc.setTextColor(...colors.primary);
          doc.textWithLink(
            timestamp,
            margins.left + 3,
            y,
            {
              url: `${videoUrl}&t=${Math.floor(item.data.videoTimestamp)}s`,
            }
          );
          
          y += 5;
          
          // Separator line
          doc.setDrawColor(...colors.border);
          doc.setLineWidth(0.1);
          doc.line(margins.left, y, pageWidth - margins.right, y);
          doc.setTextColor(...colors.text);
          y += 8;

          resolve();
        });
      });
    }
  }
  
  // Add footer to last page of notes/screenshots
  if (combinedContent.length > 0) {
    addPageFooter(currentPage);
  }

  // Add the summary at the end of the PDF
  if (savedSummary) {
    doc.addPage();
    currentPage++;
    y = margins.top;

    // Add section header
    y = addSectionHeader("Video Summary", y);

    doc.setFontSize(fonts.body);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...colors.text);

    const lineHeight = 6;
    const cleanedSummary = savedSummary.replace(/\s+/g, ' ').trim();
    const summaryLines = doc.splitTextToSize(cleanedSummary, pageWidth - margins.left - margins.right);

    summaryLines.forEach((line) => {
      if (y + lineHeight > pageHeight) {
        addPageFooter(currentPage);
        doc.addPage();
        currentPage++;
        y = margins.top;
      }
      doc.text(line, margins.left, y);
      y += lineHeight;
    });
    
    // Add footer to summary page
    addPageFooter(currentPage);
  } else if (combinedContent.length === 0 && !savedKeypoints) {
    // If no content at all, still add footer to first page
    addPageFooter(1);
  }

  // Generate the PDF file
  const pdfBlob = doc.output("blob");
  const fileName = `${cleanYouTubeTitle(document.title)}.pdf`;

  return { pdfBlob, fileName };
}

async function saveAsPDF() {
  const { pdfBlob, fileName } = await generatePDF();
  
  // Create temporary link for download
  const url = window.URL.createObjectURL(pdfBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);
}

async function uploadPDF() {
  const { pdfBlob, fileName } = await generatePDF();
  const accessToken = await getToken("access");

  if (!accessToken) {
    alert("Please login to upload PDF");
    return;
  }

  const formData = new FormData();
  formData.append("file", pdfBlob, fileName);

  try {
    const response = await fetch(`${API_URL}/api/userspace/files/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData
    });

    const result = await response.json();
    if (response.ok) {
      alert("File uploaded successfully!");
    } else {
      alert(`Upload failed: ${result.error || "Unknown error"}`);
    }
  } catch (error) {
    console.error("Upload error:", error);
    alert("Failed to upload file. Please try again.");
  }
}

// Utility function to convert image URL to Data URL
function convertImageToDataUrl(url, callback) {
  const img = new Image();
  img.crossOrigin = "Anonymous";
  img.src = url;
  img.onload = function () {
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg");
    callback(dataUrl);
  };
}

/**
 * Generic function to fetch YouTube transcript and return as JSON
 * @param {string} youtubeUrl - The YouTube video URL
 * @returns {Promise<Object>} - Returns { success: boolean, data: Array<{start: number, duration: number, text: string}>, error: string }
 */
async function getYoutubeTranscript(youtubeUrl) {
  try {
    // Extract video ID from URL
    const urlParams = new URLSearchParams(new URL(youtubeUrl).search);
    const videoId = urlParams.get('v');
    
    if (!videoId) {
      return { success: false, data: null, error: "Invalid YouTube URL" };
    }

    // 1️⃣ Fetch video HTML
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const html = await fetch(watchUrl).then(r => r.text());

    // 2️⃣ Extract INNERTUBE_API_KEY using regex
    const apiKeyMatch = html.match(/"INNERTUBE_API_KEY"\s*:\s*"([^"]+)"/);
    if (!apiKeyMatch) {
      console.error("INNERTUBE_API_KEY not found");
      return { success: false, data: null, error: "INNERTUBE_API_KEY not found" };
    }
    const apiKey = apiKeyMatch[1];
    console.log("API KEY:", apiKey);

    // 3️⃣ Call Innertube player API
    const innertubeUrl = `https://www.youtube.com/youtubei/v1/player?key=${apiKey}`;

    const innertubeResponse = await fetch(innertubeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "WEB",
            clientVersion: "2.20241201.00.00"
          }
        },
        videoId: videoId
      })
    }).then(r => r.json());

    // 4️⃣ Extract captions JSON
    const captions = innertubeResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!captions || captions.length === 0) {
      console.error("No captions available");
      return { success: false, data: null, error: "No captions available" };
    }

    console.log("Available caption tracks:", captions);

    // 5️⃣ Pick first track (usually auto-generated English)
    const track = captions[0];
    console.log("Using track:", track.languageCode, track.kind);

    // 6️⃣ Fetch raw transcript XML
    const transcriptXml = await fetch(track.baseUrl).then(r => r.text());

    // 7️⃣ Parse XML and convert to JSON structure
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(transcriptXml, "text/xml");
    const textElements = xmlDoc.getElementsByTagName("text");

    // Convert to JSON array
    const transcriptData = [];
    for (let i = 0; i < textElements.length; i++) {
      const element = textElements[i];
      transcriptData.push({
        start: parseFloat(element.getAttribute("start")),
        duration: parseFloat(element.getAttribute("dur") || 0),
        text: element.textContent.trim()
      });
    }

    console.log("Transcript data parsed:", transcriptData.length, "segments");
    return { success: true, data: transcriptData, error: null };

  } catch (error) {
    console.error("Error fetching transcript:", error);
    return { success: false, data: null, error: error.message || "Error fetching transcript" };
  }
}

// used in copy transcript button
async function copyTranscript(youtubeUrl) {
  try {
    // Get transcript data as JSON
    const result = await getYoutubeTranscript(youtubeUrl);
    
    if (!result.success || !result.data) {
      return result.error || "Transcript not available";
    }

    // Format transcript with timestamps
    let transcript = "";
    for (const segment of result.data) {
      transcript += `[${convertSecondsToHMS(segment.start)}] ${segment.text}\n`;
    }

    return transcript.trim();
  } catch (error) {
    console.error("Error copying transcript:", error);
    return "Error getting transcript";
  }
}

// Add handler for the copy transcript button
function handleCopyTranscript() {
  const copyBtn = document.getElementById("clipinsights__copyTranscriptBtn");
  const originalText = copyBtn.querySelector("span").textContent;

  copyBtn.disabled = true;
  copyBtn.querySelector("span").textContent = "Copying...";

  const youtubeUrl = getYouTubeUrl();

  copyTranscript(youtubeUrl).then((transcript) => {
    // Copy to clipboard
    navigator.clipboard
      .writeText(transcript)
      .then(() => {
        copyBtn.querySelector;
        setTimeout(() => {
          copyBtn.disabled = false;
          copyBtn.querySelector("span").textContent = originalText;
        }, 2000);
      })
      .catch((err) => {
        console.error("Failed to copy:", err);
        copyBtn.querySelector("span").textContent = "Failed!";
        setTimeout(() => {
          copyBtn.disabled = false;
          copyBtn.querySelector("span").textContent = originalText;
        }, 2000);
      });
  });
}

async function receiveTokenLimit() {
  response = await fetch(`${API_URL}/api/textutils/tokenlimit/`);
  const result = await response.json();
  console.log("Token Limit:", result);
  return result;    // returns tokens and charPerToken
}

// Slicing Transcript based on tokens
async function fetchTranscript(youtubeUrl) {
  const { tokens, charPerToken } = await receiveTokenLimit();

  try {
    // Get transcript data as JSON using the generic function
    const result = await getYoutubeTranscript(youtubeUrl);
    
    // If transcript is not available, fail immediately
    if (!result.success || !result.data) {
      console.error("Transcript not available:", result.error);
      return { 
        transcript: result.error || "Transcript not available", 
        lastTagTime: -1 
      };
    }

    const transcriptSegments = result.data;

    let fullTranscript = ""; // Full transcript text
    let slicedTranscript = ""; // Transcript up to token limit
    let currentTokenCount = 0; // Tracks token count
    let lastTagTime = -1; // Default to -1 (no slicing occurs)
    let isSliced = false; // Flag to check if slicing occurs

    // Loop over transcript segments
    for (let i = 0; i < transcriptSegments.length; i++) {
      const segment = transcriptSegments[i];
      const tagContent = segment.text;
      const charCount = tagContent.length;

      // Calculate tokens for this segment
      const tokensInSegment = Math.ceil(charCount / charPerToken);

      if (currentTokenCount + tokensInSegment <= tokens) {
        currentTokenCount += tokensInSegment; // Increment token count
        slicedTranscript += tagContent + " "; // Append to sliced transcript
        lastTagTime = segment.start + segment.duration;
      } else {
        isSliced = true; // Slicing occurred
        break; // Stop processing further
      }

      fullTranscript += tagContent + " "; // Append to full transcript
    }

    // If slicing occurred, return sliced transcript and valid time
    if (isSliced) {
      return { transcript: slicedTranscript.trim(), lastTagTime };
    } else {
      // No slicing, return full transcript
      return { transcript: fullTranscript.trim(), lastTagTime: -1 };
    }
  } catch (error) {
    console.error("Error fetching transcript:", error);
    return { 
      transcript: "Failed to fetch transcript", 
      lastTagTime: -1 
    };
  }
}

function hideMainContent() {
  document.getElementById("clipinsights__mainContent").style.display = "none";
}

function showMainContent() {
  document.getElementById("clipinsights__mainContent").style.display = "block";
}

function showSummary() {
  hideMainContent();
  document.getElementById("clipinsights__summaryContainer").style.display =
    "block";
  getSummary();
}

function hideSummary() {
  showMainContent();
  document.getElementById("clipinsights__summaryContainer").style.display =
    "none";
}

async function getSummary() {
  // Both getSummary and getKeypoints implement the same flow.
  // They are written twice to handle UI aspects for different buttons,
  // but both fetch the summary and keypoints.
  const summaryBtn = document.getElementById("clipinsights__summaryBtn");
  const summaryKeypoints = document.getElementById("clipinsights__keypoints");
  const summaryResult = document.getElementById("clipinsights__summary");

  let youtubeUrl = getYouTubeUrl();
  
  const STORAGE_KEY = "yt-player-bandwidth-performance";
  let apiCallData = localStorage.getItem(STORAGE_KEY);

  const savedSummary = await notesDatabase.getSummary(youtubeUrl);
  const savedKeypoints = await notesDatabase.getKeypoints(youtubeUrl);
  
  if (apiCallData) {
    apiCallData = JSON.parse(apiCallData);
    if (Date.now() - apiCallData.timestamp > 24 * 60 * 60 * 1000) {
      apiCallData = { count: 0, timestamp: Date.now() };
    }
  } else {
    apiCallData = { count: 0, timestamp: Date.now() };
  }

  // Calculate remaining calls (5 to 0)
  const remainingCalls = 5 - apiCallData.count;
  
  // Update status bar with remaining limit
  updateSummaryStatusBar(remainingCalls, "Analyzing video...", true);

  if (
    savedSummary && savedSummary.length > 0 &&
    savedKeypoints && savedKeypoints.length > 0
  ) {
    // Check if summary contains context time info
    const summaryText = savedSummary[0]?.text || "";
    const timeMatch = summaryText.match(/upto\s+([\d.]+)\s*minutes/i);
    if (timeMatch) {
      updateSummaryStatusBar(remainingCalls, `Context up to ${timeMatch[1]} min`, false);
    } else {
      updateSummaryStatusBar(remainingCalls, "Full video context", false);
    }
    
    summaryResult.innerHTML = formatSummaryToHTML(savedSummary[0]?.text);
    summaryKeypoints.innerHTML = formatKeypoints(savedKeypoints[0]?.text);
    document.getElementById("clipinsights__summary").style.display = "block";
    document.getElementById("clipinsights__keypoints").style.display = "block";
    return;
  }
  
  if (apiCallData.count >= 5) {
    updateSummaryStatusBar(remainingCalls, "Limit reached", false, true);
    summaryResult.innerText = "Your summary limit has been reached. Please try again tomorrow.";
    summaryBtn.disabled = false;
    const summaryBtnSpan = summaryBtn.querySelector("span");
    summaryBtnSpan.textContent = "Summary";
    return;
  }
  
  apiCallData.count++;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(apiCallData));
  
  summaryBtn.disabled = true;
  const summaryBtnSpan = summaryBtn.querySelector("span");
  summaryBtnSpan.textContent = "Generating...";
  summaryResult.innerHTML = "Generating summary ...";

  const transcriptionData = await fetchTranscript(youtubeUrl);
  console.log(transcriptionData);

  if (
    !transcriptionData ||
    !transcriptionData.transcript ||
    transcriptionData.transcript === "Transcript not available"
  ) {
    updateSummaryStatusBar(5 - apiCallData.count, "No transcript available", false, true);
    summaryResult.innerText = "We're sorry, we were unable to summarize this video because the transcription is unavailable";
    summaryBtn.disabled = false;
    summaryBtnSpan.textContent = "Summary";
    return;
  }

  if (youtubeUrl.includes("youtube.com/watch")) {
    try {
      const response = await fetch(`${API_URL}/api/textutils/summary/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          youtube_url: youtubeUrl,
          transcription: transcriptionData.transcript,
        }),
      });

      const data = await response.json();
      console.log("data", data);
      if (data.success) {
        let finalSummary = data.summary;
        let finalKeypoints = data.keypoints;

        if (transcriptionData.lastTagTime !== -1) {
          const sliceTimeInMinutes = (transcriptionData.lastTagTime / 60).toFixed(2);
          finalSummary += `...upto ${sliceTimeInMinutes} minutes`;
          finalKeypoints = parseList(finalKeypoints);
        }

        notesDatabase.saveSummary(finalSummary, youtubeUrl);
        notesDatabase.saveKeypoints(finalKeypoints, youtubeUrl);

        // Update status bar with context info and remaining limit
        const updatedRemainingCalls = 5 - apiCallData.count;
        if (transcriptionData.lastTagTime !== -1) {
          const sliceTimeInMinutes = (transcriptionData.lastTagTime / 60).toFixed(2);
          updateSummaryStatusBar(updatedRemainingCalls, `Context up to ${sliceTimeInMinutes} min`, false);
        } else {
          updateSummaryStatusBar(updatedRemainingCalls, "Full video context", false);
        }
        
        summaryResult.innerHTML = formatSummaryToHTML(finalSummary);
        summaryKeypoints.innerHTML = formatKeypoints(finalKeypoints);
        document.getElementById("clipinsights__summary").style.display = "block";
        document.getElementById("clipinsights__keypoints").style.display = "block";
      } else if (data.success === false) {
        updateSummaryStatusBar(5 - apiCallData.count, "Error", false, true);
        summaryResult.innerText = data.message;
      }
    } catch (error) {
      console.error("Error fetching summary:", error);
      updateSummaryStatusBar(5 - apiCallData.count, "Error", false, true);
      summaryResult.innerText = "An error occurred while fetching the summary.";
    } finally {
      summaryBtn.disabled = false;
      summaryBtnSpan.textContent = "Summary";
    }
  } else {
    updateSummaryStatusBar(remainingCalls, "Not a YouTube video", false, true);
    summaryResult.innerText = "This might not be a YouTube video page. Try on a YouTube video page.";
    summaryBtn.disabled = false;
    summaryBtnSpan.textContent = "Summary";
  }
}

async function getKeypoints() {
  // Both getSummary and getKeypoints implement the same flow.
  // They are written twice to handle UI aspects for different buttons,
  // but both fetch the summary and keypoints.
  const STORAGE_KEY = "yt-player-bandwidth-performance";
  const keypointsBtn = document.getElementById("clipinsights__keypointsBtn");
  const summaryKeypoints = document.getElementById("clipinsights__keypoints");
  const summaryResult = document.getElementById("clipinsights__summary");

  let youtubeUrl = getYouTubeUrl();
  
  // Initialize or retrieve API call data
  let apiCallData = localStorage.getItem(STORAGE_KEY);
  if (apiCallData) {
    apiCallData = JSON.parse(apiCallData);
    // Reset count if more than 24 hours have passed
    if (Date.now() - apiCallData.timestamp > 24 * 60 * 60 * 1000) {
      apiCallData = { count: 0, timestamp: Date.now() };
    }
  } else {
    apiCallData = { count: 0, timestamp: Date.now() };
  }
  
  const remainingCalls = 5 - apiCallData.count;
  
  // Update status bar with remaining limit
  updateKeypointsStatusBar(remainingCalls, "Analyzing video...", true);

  // Check if summary and keypoints exist in the database
  const savedSummary = await notesDatabase.getSummary(youtubeUrl);
  const savedKeypoints = await notesDatabase.getKeypoints(youtubeUrl);

  if (savedKeypoints && savedKeypoints.length > 0 && savedSummary && savedSummary.length > 0) {
    // Check if keypoints contain context time info
    const keypointsData = savedKeypoints[0]?.text;
    let hasTimeContext = false;
    let timeValue = null;
    
    if (Array.isArray(keypointsData)) {
      const timeItem = keypointsData.find(item => item && item.includes && item.includes("up to"));
      if (timeItem) {
        const match = timeItem.match(/([\d.]+)\s*minutes/i);
        if (match) {
          hasTimeContext = true;
          timeValue = match[1];
        }
      }
    }
    
    if (hasTimeContext && timeValue) {
      updateKeypointsStatusBar(remainingCalls, `Context up to ${timeValue} min`, false);
    } else {
      updateKeypointsStatusBar(remainingCalls, "Full video context", false);
    }
    
    summaryResult.innerHTML = formatSummaryToHTML(savedSummary[0]?.text);
    summaryKeypoints.innerHTML = formatKeypoints(savedKeypoints[0]?.text);
    document.getElementById("clipinsights__summary").style.display = "block";
    document.getElementById("clipinsights__keypoints").style.display = "block";
    return;
  }

  // Change button to loading state
  keypointsBtn.disabled = true;
  const keypointsBtnSpan = keypointsBtn.querySelector("span");
  keypointsBtnSpan.textContent = "Generating...";
  summaryKeypoints.innerHTML = `Generating Key Points ...`;

  // Get the current active tab's transcript
  const transcriptionData = await fetchTranscript(youtubeUrl);
  console.log(transcriptionData);

  // If transcription data is not available, immediately return without calling the API
  if (
    !transcriptionData ||
    !transcriptionData.transcript ||
    transcriptionData.transcript === "Transcript not available"
  ) {
    updateKeypointsStatusBar(remainingCalls, "No transcript available", false, true);
    summaryKeypoints.innerText = "We're sorry, we were unable to get key points for this video because the transcription is unavailable";
    keypointsBtn.disabled = false;
    keypointsBtnSpan.textContent = "Key points";
    return;
  }

  // Check if the current tab is a YouTube video
  if (youtubeUrl.includes("youtube.com/watch")) {
    // Check API call limit
    if (apiCallData.count >= 5) {
      updateKeypointsStatusBar(remainingCalls, "Limit reached", false, true);
      summaryKeypoints.innerText = "Your key points limit has been reached. Please try again tomorrow.";
      keypointsBtn.disabled = false;
      keypointsBtnSpan.textContent = "Key points";
      return;
    }

    // Increment the counter and update localStorage
    apiCallData.count++;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(apiCallData));
    const updatedRemainingCalls = 5 - apiCallData.count;

    try {
      // Send POST request to the API
      const response = await fetch(`${API_URL}/api/textutils/summary/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          youtube_url: youtubeUrl,
          transcription: transcriptionData.transcript,
        }),
      });

      // Get the summary from the response
      const data = await response.json();
      console.log("data", data);

      if (data.success) {
        let finalSummary = data.summary;
        let finalKeypoints = data.keypoints;

        // Append slice time info if available
        if (transcriptionData.lastTagTime !== -1) {
          const sliceTimeInMinutes = (transcriptionData.lastTagTime / 60).toFixed(2);
          finalSummary += `...upto ${sliceTimeInMinutes} minutes`;
          finalKeypoints = parseList(finalKeypoints);
        }

        // Save the generated summary and keypoints to the database
        notesDatabase.saveSummary(finalSummary, youtubeUrl);
        notesDatabase.saveKeypoints(finalKeypoints, youtubeUrl);

        // Update status bar with context info and remaining limit
        if (transcriptionData.lastTagTime !== -1) {
          const sliceTimeInMinutes = (transcriptionData.lastTagTime / 60).toFixed(2);
          updateKeypointsStatusBar(updatedRemainingCalls, `Context up to ${sliceTimeInMinutes} min`, false);
        } else {
          updateKeypointsStatusBar(updatedRemainingCalls, "Full video context", false);
        }

        // Display the summary and keypoints
        summaryResult.innerHTML = formatSummaryToHTML(finalSummary);
        summaryKeypoints.innerHTML = formatKeypoints(finalKeypoints);
        document.getElementById("clipinsights__summary").style.display = "block";
        document.getElementById("clipinsights__keypoints").style.display = "block";
      } else if (data.success === false) {
        updateKeypointsStatusBar(updatedRemainingCalls, "Error", false, true);
        summaryKeypoints.innerText = data.message;
      }
    } catch (error) {
      console.error("Error generating Key Points:", error);
      updateKeypointsStatusBar(5 - apiCallData.count, "Error", false, true);
      summaryKeypoints.innerText = "An error occurred while generating key points.";
    } finally {
      // Restore button state after request completion
      keypointsBtn.disabled = false;
      keypointsBtnSpan.textContent = "Key points";
    }
  } else {
    updateKeypointsStatusBar(remainingCalls, "Not a YouTube video", false, true);
    summaryKeypoints.innerText = "This might not be a YouTube video page. Try on a YouTube video page.";
    // Restore button state if not a YouTube video
    keypointsBtn.disabled = false;
    keypointsBtnSpan.textContent = "Key points";
  }
}

function showKeyPoints() {
  hideMainContent();
  getKeypoints();
  document.getElementById("clipinsights__keypointsContainer").style.display =
    "block";
}

function hideKeyPoints() {
  showMainContent();
  document.getElementById("clipinsights__keypointsContainer").style.display =
    "none";
}

function saveSummaryToLocalStorage(summary, keypoints) {
  localStorage.setItem("summary", summary);
  localStorage.setItem("keypoints", keypoints);
}
function parseList(inputStr) {
  // Return empty array if input is null, undefined, or empty
  if (!inputStr) {
    return [];
  }

  try {
    // If input is already an array, return it
    if (Array.isArray(inputStr)) {
      return inputStr;
    }

    // Convert to string and clean up whitespace
    let str = String(inputStr).trim();

    // First attempt: Try JSON parse if it's a valid JSON array
    try {
      const jsonParsed = JSON.parse(str);
      if (Array.isArray(jsonParsed)) {
        return jsonParsed;
      }
    } catch (e) {
      // If JSON parse fails, continue with string manipulation
    }

    // Remove the opening and closing brackets
    str = str.replace(/^\[|\]$/g, '').trim();

    // Split by proper comma boundaries
    let items = [];
    let currentItem = '';
    let inQuotes = false;
    let quoteChar = null;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      // Handle quote start/end
      if ((char === '"' || char === "'") && str[i - 1] !== '\\') {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuotes = false;
          quoteChar = null;
        }
      }

      // Handle commas
      if (char === ',' && !inQuotes) {
        items.push(currentItem.trim());
        currentItem = '';
        continue;
      }

      currentItem += char;
    }

    // Add the last item
    if (currentItem.trim()) {
      items.push(currentItem.trim());
    }

    // Clean up each item
    return items
      .map(item => {
        return item
          .trim()
          .replace(/^["']|["']$/g, '')  // Remove outer quotes
          .replace(/\\'/g, "'")         // Handle escaped single quotes
          .replace(/\\"/g, '"')         // Handle escaped double quotes
          .replace(/\\/g, '')           // Remove any remaining backslashes
          .trim();
      })
      .filter(item => item.length > 0);  // Remove empty items

  } catch (error) {
    console.error('Error parsing Python list:', error);
    // Return single item array if parsing fails
    return [inputStr.toString()];
  }
}

function formatKeypoints(bulletData) {
  // If input is null or undefined, return empty list
  if (!bulletData) {
    return `<ul class="styled-keypoints">Try clearing the stuff and regenerate</ul>`;
  }

  let bulletPoints = [];

  try {
    // Handle different input types
    if (typeof bulletData === 'string') {
      // Clean the string from Python list format to make it JSON compatible
      const jsonCompatibleStr = bulletData.replace(/^\[|\]$/g, ''); // Remove opening and closing brackets

      // Split on commas only outside of quotes
      const items = [];
      let currentItem = '';
      let inQuotes = false;
      let quoteChar = null;

      for (let i = 0; i < jsonCompatibleStr.length; i++) {
        const char = jsonCompatibleStr[i];

        if ((char === '"' || char === "'") && jsonCompatibleStr[i - 1] !== '\\') {
          if (!inQuotes) {
            inQuotes = true;
            quoteChar = char;
          } else if (quoteChar === char) {
            inQuotes = false;
            quoteChar = null;
          }
          currentItem += char;
        } else if (char === ',' && !inQuotes) {
          if (currentItem.trim()) {
            items.push(currentItem.trim());
          }
          currentItem = '';
        } else {
          currentItem += char;
        }
      }

      // Add the last item if it exists
      if (currentItem.trim()) {
        items.push(currentItem.trim());
      }

      // Clean each item
      bulletPoints = items
        .map(item => {
          return item
            .trim()
            .replace(/^['"]|['"]$/g, '') // Remove outer quotes
            .replace(/\\'/g, "'")
            .replace(/\\"/g, '"');
        })
        .filter(Boolean); // Remove empty items
    } else if (Array.isArray(bulletData)) {
      // If it's already an array
      bulletPoints = bulletData;
    } else if (typeof bulletData === 'object') {
      // If it's an object, look for array properties
      const arrayProps = Object.values(bulletData).find(val => Array.isArray(val));
      if (arrayProps) {
        bulletPoints = arrayProps;
      }
    }

    // Ensure all items are strings and clean them up
    bulletPoints = bulletPoints
      .filter(point => point && typeof point === 'string')
      .map(point => {
        // Clean up the bullet point text
        return point
          .trim()
          .replace(/^[•\-]\s/, '') // Remove leading bullet characters
          .replace(/&/g, '&')
          .replace(/</g, '<')
          .replace(/>/g, '>')
          .replace(/"/g, '"')
          .replace(/'/g, '\'');
      })
      .filter(Boolean); // Remove any empty strings after cleaning

    // If we end up with no valid bullet points, return empty list
    if (bulletPoints.length === 0) {
      return `<ul class="styled-keypoints"></ul>`;
    }

    // Format the bullet points into an unordered list
    const formattedKeypoints = bulletPoints
      .map(point => `<li>${point}</li>`)
      .join('');

    return `<ul class="styled-keypoints">${formattedKeypoints}</ul>`;

  } catch (error) {
    console.error('Error formatting keypoints:', error);
    return `<ul class="styled-keypoints"></ul>`;
  }
}

function formatSummaryToHTML(summaryText) {
  let formattedSummary = summaryText.replace(
    /\*\*(.*?)\*\*/g,
    "<strong>$1</strong>"
  );

  formattedSummary = formattedSummary.replace(/\n/g, "<br>");

  formattedSummary = formattedSummary.replace(/-\s(.*?)<br>/g, "<li>$1</li>");
  formattedSummary = formattedSummary.replace(
    /<br>\*\*Key Themes:\*\*<br>/g,
    "<br><strong>Key Themes:</strong><ul>"
  );
  formattedSummary = formattedSummary.replace(/<\/li><br>/g, "</li>");
  formattedSummary += "</ul>";

  return formattedSummary;
}

/**
 * Derive a cryptographic key from the encryption key string
 */
async function getKey() {
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(ENCRYPTION_KEY),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode("unique-salt"), // Replace with a fixed unique salt
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a string using AES-GCM
 * @param {string} data - The data to encrypt
 * @returns {string} - The encrypted data as a base64 string
 */
async function encrypt(data) {
  const key = await getKey();
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // Initialization vector
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(data)
  );

  // Combine IV and encrypted data, then encode in base64
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts a base64-encoded string encrypted with AES-GCM
 * @param {string} encryptedData - The base64-encoded encrypted data
 * @returns {string} - The decrypted string
 */
async function decrypt(encryptedData) {
  const key = await getKey();
  const combined = new Uint8Array(
    atob(encryptedData)
      .split("")
      .map((char) => char.charCodeAt(0))
  );

  const iv = combined.slice(0, 12); // Extract IV
  const encrypted = combined.slice(12); // Extract encrypted data

  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encrypted
  );

  return new TextDecoder().decode(decrypted);
}

async function storeToken(token, keyname) {
  try {
    const encryptedToken = await encrypt(token);
    localStorage.setItem(keyname, encryptedToken);
    console.log("Token stored successfully!");
  } catch (error) {
    console.error("Error storing token:", error);
  }
}

async function getToken(keyname) {
  try {
    const encryptedToken = localStorage.getItem(keyname);
    if (!encryptedToken) {
      console.warn("No token found.");
      return null;
    }

    const token = decrypt(encryptedToken);
    // console.log("Token retrieved successfully!");
    return token;
  } catch (error) {
    console.error("Error retrieving token:", error);
    return null;
  }
}

async function authenticate() {
  // API endpoint for login
  const apiUrl = `${API_URL}/api/account/login/`;
  const email = clipinsights__emailInput.value;
  const password = clipinsights__passwordInput.value;
  // console.log("Authenticate button clicked!", email, password);

  // Create the request body
  const requestBody = {
    email: email,
    password: password,
  };

  try {
    // Send the POST request to the API
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      credentials: "include", // Critical for allowing cookies to be set cross-origin
    });

    // Parse the JSON response
    const data = await response.json();

    if (response.ok) {
      // Successfully logged in, store tokens in Chrome's local storage
      const refreshToken = data.token.refresh;
      const accessToken = data.token.access;

      // Store tokens using chrome.storage.local
      // chrome.storage.local.set({ refreshToken, accessToken }, () => {
      //   console.log('Tokens saved successfully!');
      //   alert('Login successful, tokens saved 2.');
      // });
      await storeToken(accessToken, "access");
      await storeToken(refreshToken, "refresh");
      alert("Login successful");
      // setTimeout(() => {
      //   // console.log("tooooooooookens", localStorage.getItem('refresh'));
      // }, 2000);

      // Optionally, you can redirect or switch views after successful login
      clipinsights__mainContent.style.display = "block";
      clipinsights__loginContainer.style.display = "none";
    } else {
      // Handle login errors (e.g., wrong credentials)
      alert(data.msg || "Login failed. Please check your credentials.");
    }
  } catch (error) {
    console.error("Error during login:", error);
    alert("An error occurred while logging in. Please try again.");
  }
}

// Token management utilities
async function isTokenExpired(token) {
  if (!token) return true;

  try {
    // Parse the JWT token
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = JSON.parse(atob(base64));

    // Get expiration time from token
    const expirationTime = jsonPayload.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();

    return currentTime >= expirationTime;
  } catch (error) {
    console.error("Error checking token expiration:", error);
    return true;
  }
}

async function refreshAccessToken() {
  try {
    const refreshToken = await getToken("refresh");
    const response = await fetch(`${API_URL}/api/account/refresh-token/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log("Access token refreshed successfully:", data);

      await storeToken(data.access, "access");
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error refreshing token:", error);
    return false;
  }
}

async function checkAuthenticationStatus() {
  try {
    const accessToken = await getToken("access");
    const refreshToken = await getToken("refresh");

    if (!accessToken || !refreshToken) {
      return "logged-out";
    }

    const isAccess_Expired = await isTokenExpired(accessToken);
    const isRefresh_Expired = await isTokenExpired(refreshToken);

    if (isRefresh_Expired) {
      // Both tokens are expired, user needs to login again
      await logout();
      return "logged-out";
    }

    if (isAccess_Expired) {
      // Try to refresh the access token
      const refreshSuccessful = await refreshAccessToken();
      return refreshSuccessful ? "logged-in" : "logged-out";
    }

    return "logged-in";
  } catch (error) {
    console.error("Error checking authentication status:", error);
    return "logged-out";
  }
}

async function logout() {
  try {
    // Remove tokens from localStorage
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    alert("Successfully logged out");
    return true;
  } catch (error) {
    console.error("Error during logout:", error);
    return false;
  }
}

// Chat functions
let lastProcessedUrl = ""; // Store the last processed URL

// Helper function to update the limit badge in the chat status bar
function updateLimitBadge(remaining) {
  const limitBadge = document.getElementById("clipinsights__limitBadge");
  const limitCount = document.getElementById("clipinsights__limitCount");
  
  if (limitBadge && limitCount) {
    limitCount.textContent = remaining;
    
    // Update badge color based on remaining count
    limitBadge.classList.remove("warning", "depleted");
    if (remaining <= 0) {
      limitBadge.classList.add("depleted");
    } else if (remaining <= 3) {
      limitBadge.classList.add("warning");
    }
  }
}

// Helper function to update Summary status bar
function updateSummaryStatusBar(remaining, contextText = null, isLoading = false, isError = false) {
  const limitBadge = document.getElementById("clipinsights__summaryLimitBadge");
  const limitCount = document.getElementById("clipinsights__summaryLimitCount");
  const contextTextEl = document.getElementById("clipinsights__summaryContextText");
  const contextIcon = document.querySelector("#clipinsights__summaryStatusBar .clipinsights__contextIcon");
  
  if (limitBadge && limitCount) {
    limitCount.textContent = remaining;
    limitBadge.classList.remove("warning", "depleted");
    if (remaining <= 0) {
      limitBadge.classList.add("depleted");
    } else if (remaining <= 2) {
      limitBadge.classList.add("warning");
    }
  }
  
  if (contextTextEl) {
    if (contextText) contextTextEl.textContent = contextText;
    contextTextEl.classList.toggle("loading", isLoading);
    contextTextEl.classList.toggle("error", isError);
  }
  
  if (contextIcon) {
    contextIcon.classList.toggle("loading", isLoading);
  }
}

// Helper function to update Keypoints status bar
function updateKeypointsStatusBar(remaining, contextText = null, isLoading = false, isError = false) {
  const limitBadge = document.getElementById("clipinsights__keypointsLimitBadge");
  const limitCount = document.getElementById("clipinsights__keypointsLimitCount");
  const contextTextEl = document.getElementById("clipinsights__keypointsContextText");
  const contextIcon = document.querySelector("#clipinsights__keypointsStatusBar .clipinsights__contextIcon");
  
  if (limitBadge && limitCount) {
    limitCount.textContent = remaining;
    limitBadge.classList.remove("warning", "depleted");
    if (remaining <= 0) {
      limitBadge.classList.add("depleted");
    } else if (remaining <= 2) {
      limitBadge.classList.add("warning");
    }
  }
  
  if (contextTextEl) {
    if (contextText) contextTextEl.textContent = contextText;
    contextTextEl.classList.toggle("loading", isLoading);
    contextTextEl.classList.toggle("error", isError);
  }
  
  if (contextIcon) {
    contextIcon.classList.toggle("loading", isLoading);
  }
}

// Add this function to manage chat history
function getChatHistory() {
  const chatMessages = document.getElementById('clipinsights__chatMessages');
  const messages = [];
  let count = 0;
  
  // Get last N messages, alternating between user and bot
  for (let i = chatMessages.children.length - 1; i >= 0 && count < CHAT_MEMORY_WINDOW_SIZE; i--) {
    const message = chatMessages.children[i];
    const role = message.classList.contains('clipinsights__user') ? 'user' : 'assistant';
    messages.unshift({
      role: role,
      content: message.textContent
    });
    count++;
  }
  
  return messages;
}

// Modify the sendMessage function
async function sendMessage() {
  const userMessage = clipinsights__chatInput.value.trim();
  if (userMessage === "") return;
  if (userMessage.length > 1000) {
    alert("Query is too long. Please reduce its length.");
    return;
  }

  // Define storage key for chat limit
  const CHAT_LIMIT_KEY = "yt-chat-limit";

  // Retrieve or initialize chat limit data
  let chatLimitData = localStorage.getItem(CHAT_LIMIT_KEY);
  if (chatLimitData) {
    chatLimitData = JSON.parse(chatLimitData);
    if (Date.now() - chatLimitData.timestamp > 24 * 60 * 60 * 1000) {
      chatLimitData = { count: 0, timestamp: Date.now() };
    }
  } else {
    chatLimitData = { count: 0, timestamp: Date.now() };
  }

  // Check if limit is reached
  if (chatLimitData.count >= 10) {
    alert('Daily limit reached. Please try again tomorrow.');
    return;
  }

  // Increment the count and save
  chatLimitData.count++;
  localStorage.setItem(CHAT_LIMIT_KEY, JSON.stringify(chatLimitData));

  // Display user message
  displayMessage(userMessage, "clipinsights__user");

  // Clear input
  clipinsights__chatInput.value = "";

  const youtubeUrl = window.location.href;

  if (youtubeUrl && youtubeUrl.includes("youtube.com/watch")) {
    try {
      // Track URL changes for context updates
      lastProcessedUrl = youtubeUrl;

      const transcription = await fetchTranscript(youtubeUrl);

      // Update status bar with context time info
      const contextTimeElement = document.getElementById("clipinsights__contextTime");
      if (contextTimeElement) {
        if (transcription.lastTagTime !== -1) {
          const sliceTimeInMinutes = (transcription.lastTagTime / 60).toFixed(2);
          contextTimeElement.textContent = `Context up to ${sliceTimeInMinutes} min`;
        } else {
          contextTimeElement.textContent = "Full video context";
        }
      }

      // Update limit badge
      const remaining = 10 - chatLimitData.count;
      updateLimitBadge(remaining);

      // Prepare data payload with chat history if enabled
      const data = {
        youtube_url: youtubeUrl,
        query: userMessage,
        transcription: transcription.transcript,
        stream: true,
        chat_memory_enabled: CHAT_MEMORY_ENABLED,
        chat_history: CHAT_MEMORY_ENABLED ? getChatHistory() : []
      };

      // Create a new message element for streaming
      const botMessageElement = document.createElement("div");
      botMessageElement.classList.add(
        "clipinsights__message",
        "clipinsights__bot"
      );
      botMessageElement.textContent = "";
      clipinsights__chatMessages.appendChild(botMessageElement);

      // Fetch streaming response from the server
      const response = await fetch(`${API_URL}/api/textutils/chat/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error("Network response was not ok");

      // Create a reader for streaming tokens
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let isSuccess = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (isSuccess) {
            // Update limit badge (don't append to message)
            const remaining = 10 - chatLimitData.count;
            updateLimitBadge(remaining);
            clipinsights__chatMessages.scrollTop = clipinsights__chatMessages.scrollHeight;
          }
          break;
        }

        const chunk = decoder.decode(value);
        const events = chunk.split("\n\n");

        events.forEach((event) => {
          if (event.startsWith("data: ")) {
            const content = event.replace("data: ", "");

            if (content === "[DONE]") {
              isSuccess = true;
              return;
            }

            if (content.startsWith("Error:")) {
              botMessageElement.textContent = content;
              return;
            }

            // Append streaming tokens
            botMessageElement.textContent += content;
            isSuccess = true;
            clipinsights__chatMessages.scrollTop = clipinsights__chatMessages.scrollHeight;
          }
        });
      }
    } catch (error) {
      console.error("Error:", error);
      displayMessage(
        "Sorry, there was an error. Please try again.",
        "clipinsights__bot"
      );
    }
  } else {
    displayMessage("Please open a YouTube video.", "clipinsights__bot");
  }
}

function displayMessage(message, sender) {
  const messageElement = document.createElement("div");
  messageElement.classList.add("clipinsights__message", sender);
  messageElement.textContent = message;
  clipinsights__chatMessages.appendChild(messageElement);

  // Scroll to the latest message
  clipinsights__chatMessages.scrollTop =
    clipinsights__chatMessages.scrollHeight;
}

// // Start observing
// observer.observe(document.body, { childList: true, subtree: true });
function waitForElement(selector, maxAttempts = 20, interval = 500) {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    function checkForElement() {
      const element = document.querySelector(selector);

      if (element) {
        // Element found, resolve the promise
        resolve(element);
      } else if (attempts < maxAttempts) {
        // Increment attempts and try again
        attempts++;
        setTimeout(checkForElement, interval);
      } else {
        // Reject if max attempts reached
        reject(
          new Error(
            `Element ${selector} not found after ${maxAttempts} attempts`
          )
        );
      }
    }

    // Start checking
    checkForElement();
  });
}

function isYouTubeVideoPage() {
  const currentUrl = new URL(window.location.href);
  return currentUrl.pathname === "/watch" && currentUrl.searchParams.has("v");
}

// injects ClipInsights if the url changes.
async function watchYouTubeNavigation() {
  const relatedSection = await waitForElement(
    "#related.style-scope.ytd-watch-flexy"
  );
  console.log("Related section found:", relatedSection);
  let lastUrl = "";
  let lastFixedChannel = ""; // Track the last channel that was fixed

  const checkPageChange = () => {
    const currentUrl = window.location.href;

    // if (window.location.href.includes("youtube.com/@")) {
    //   // console.log("youtube channel page");

    //   // Only attempt to fix if this is a new channel or hasn't been fixed before
    //   if (currentUrl !== lastFixedChannel) {
    //     console.log("Attempting to fix new channel page");

    //     // Call fix function
    //     const fixResult = fixYouTubeChannelPageLayout();

    //     // If fix is successful, update the lastFixedChannel
    //     if (fixResult) {
    //       lastFixedChannel = currentUrl;
    //       console.log("Channel page fixed:", lastFixedChannel);
    //     } else {
    //       // If fix fails, set up retry mechanism
    //       let retryCount = 0;
    //       const retryInterval = setInterval(() => {
    //         console.log(`Retrying channel page layout fix (Attempt ${retryCount + 1})`);

    //         const retryResult = fixYouTubeChannelPageLayout();

    //         // Stop retrying if successful or after 5 attempts
    //         if (retryResult) {
    //           lastFixedChannel = currentUrl;
    //           clearInterval(retryInterval);
    //         }

    //         if (retryCount >= 5) {
    //           clearInterval(retryInterval);
    //         }

    //         retryCount++;
    //       }, 500); // Retry every 1 second
    //     }
    //   } else {
    //     // console.log("Channel page already fixed, skipping");
    //   }
    // }

    // Check if URL has changed
    if (currentUrl === lastUrl) return;

    // Update last URL
    lastUrl = currentUrl;

    // Call your injection function
    injectClipInsightsNotepad();
  };

  // Initial check
  checkPageChange();

  // Set up MutationObserver to detect URL changes in YouTube's single-page app
  const observer = new MutationObserver(checkPageChange);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Optional: also set up interval as a fallback
  const intervalId = setInterval(checkPageChange, 1000);

  // Return cleanup function
  return () => {
    observer.disconnect();
    clearInterval(intervalId);
  };
}

watchYouTubeNavigation();

// async function copyTranscript(youtubeUrl) {
//   const response = await fetch(youtubeUrl);
//   const text = await response.text();

//   const match = text.match(/"captionTracks":(.+?)]/);
//   if (!match) return "Transcript not available";

//   const captionTracks = JSON.parse(match[1] + "]");
//   const baseUrl = captionTracks[0].baseUrl.replace(/\\u0026/g, "&");

//   const transcriptResponse = await fetch(baseUrl);
//   const transcriptText = await transcriptResponse.text();

//   // Parse the transcript XML to extract the text content
//   const parser = new DOMParser();
//   const xmlDoc = parser.parseFromString(transcriptText, "text/xml");
//   const textElements = xmlDoc.getElementsByTagName("text");

//   let transcript = "";
//   for (let i = 0; i < textElements.length; i++) {
//     transcript += textElements[i].textContent + " ";
//   }

//   return transcript.trim(); // Remove any trailing space
// }

// function fixYouTubeChannelPageLayout() {
//   console.log("Fixing YouTube channel page layout");
//   // Remove 'grid-1-columns' class from ytd-two-column-browse-results-renderer
//   const browseResultsElement = document.querySelector('ytd-two-column-browse-results-renderer.grid-1-columns');
//   if (browseResultsElement) {
//     browseResultsElement.classList.remove('grid-1-columns');
//   }

//   // Remove class from ytd-tabbed-page-header within the element with id 'tabs'
//   const tabsElement = document.getElementById('tabs');
//   if (tabsElement) {

//     tabsElement.classList.remove("ytd-tabbed-page-header")
//     return true;
//   }
//   return false;
// }

// // Observe the body to detect when #related is loaded on the page
// const observer = new MutationObserver(() => {
//   if (document.querySelector("#related.style-scope.ytd-watch-flexy")) {
//     try {
//       injectClipInsightsNotepad();
//     } catch (error) {
//       console.error("Error injecting ClipInsights Notepad:", error);
//     }
//     observer.disconnect(); // Stop observing once injected
//   }
// });

const STORAGE_KEY = "clipinsights_daily_limit";
const DAILY_LIMIT_MAX = 5;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function initializeDailyLimit() {
  let limitData = localStorage.getItem(STORAGE_KEY);
  const now = Date.now();

  if (limitData) {
    limitData = JSON.parse(limitData);
    // Reset if more than 24 hours have passed
    if (now - limitData.timestamp > ONE_DAY_MS) {
      limitData = { count: DAILY_LIMIT_MAX, timestamp: now };
    }
  } else {
    limitData = { count: DAILY_LIMIT_MAX, timestamp: now };
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(limitData));
  return limitData.count;
}

function getDailyLimit() {
  const limitData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
    count: DAILY_LIMIT_MAX,
    timestamp: Date.now(),
  };
  return limitData.count;
}

function decrementDailyLimit() {
  let limitData = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (limitData && limitData.count > 0) {
    limitData.count -= 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limitData));
  }
  updateLimitUI();
  updateButtonStates();
}

function updateLimitUI() {
  const container = document.querySelector('.clipinsights__userlimit');
  const currentLimit = getDailyLimit();

  if (container) {
    container.textContent = `Daily Limit Left: ${currentLimit} ⚡`;
    container.classList.remove('clipinsights__limitGreen', 'clipinsights__limitRed');

    if (currentLimit > 0) {
      container.classList.add('clipinsights__limitGreen');
    } else {
      container.classList.add('clipinsights__limitRed');
    }
  }
}

function updateButtonStates() {
  const currentLimit = getDailyLimit();
  const summaryBtn = document.querySelector('.clipinsights__summaryBtn');
  const keypointsBtn = document.querySelector('.clipinsights__keypointsBtn');
  const chatBtn = document.querySelector('#clipinsights__sendChatBtn');

  const isDisabled = currentLimit <= 0;

  if (summaryBtn) {
    summaryBtn.disabled = isDisabled;
    summaryBtn.querySelector('span').textContent = isDisabled ? 'Limit Reached' : 'Summary';
  }
  if (keypointsBtn) {
    keypointsBtn.disabled = isDisabled;
    keypointsBtn.querySelector('span').textContent = isDisabled ? 'Limit Reached' : 'Key Points';
  }
  if (chatBtn) {
    chatBtn.disabled = isDisabled;
    chatBtn.querySelector('span').textContent = isDisabled ? 'Limit Reached' : 'Send';
  }
}

function isSuccessResponse(response) {
  return response && response.success === true;
}

// Initialize limit on load
let dailyLimit = initializeDailyLimit();
updateLimitUI();
updateButtonStates();

setInterval(updateLimitUI, 5000);

document.addEventListener('click', async (e) => {
  const summaryBtn = e.target.closest('.clipinsights__summaryBtn');
  if (summaryBtn) {
    if (getDailyLimit() <= 0) {
      alert('Daily limit reached. Please try again tomorrow.');
      return;
    }
    const res = await getSummary(); // Note: Assuming getSummary is the correct function
    if (isSuccessResponse(res)) {
      decrementDailyLimit();
    }
  }
});

document.addEventListener('click', async (e) => {
  const keypointsBtn = e.target.closest('.clipinsights__keypointsBtn');
  if (keypointsBtn) {
    if (getDailyLimit() <= 0) {
      alert('Daily limit reached. Please try again tomorrow.');
      return;
    }
    const res = await getKeypoints();
    if (isSuccessResponse(res)) {
      decrementDailyLimit();
    }
  }
});
