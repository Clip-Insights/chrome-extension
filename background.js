// background.js
let screenshotNotes = []; // Store screenshots and notes 

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'takeScreenshot') {
    // Use the sender's tab ID directly
    const tabId = sender.tab.id;

    chrome.scripting.executeScript(
      {
        target: { tabId: tabId },
        func: takeScreenshotAtCurrentTime,
        args: [screenshotNotes]
      },
      (result) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
          sendResponse({ error: chrome.runtime.lastError.message });
        } else if (result && result[0] && result[0].result) {
          sendResponse({ screenshotUrl: result[0].result.screenshotUrl, time: result[0].result.time, size: result[0].result.size });
        } else {
          sendResponse({ error: 'Failed to take screenshot. No result returned.' });
        }
      }
    );
    return true;
  } else if (message.action === 'addNote') {
    const tabId = sender.tab.id;

    chrome.scripting.executeScript(
      {
        target: { tabId: tabId },
        func: logNoteWithTime,
        args: [screenshotNotes, message.note],
      },
      (result) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
          sendResponse({ error: chrome.runtime.lastError.message });
        } else if (result && result[0] && result[0].result) {
          sendResponse({ note: result[0].result.note, time: result[0].result.time });
        } else {
          sendResponse({ error: 'Failed to log note. No result returned.' });
        }
      }
    );
    return true;
  } else if (message.action === 'getScreenshotNotes') {
    sendResponse(screenshotNotes);
  }
});

function takeScreenshotAtCurrentTime(screenshotNotes) {
  const video = document.querySelector('video');
  if (!video) {
    return { error: 'No video element found on this page.' };
  }

  const time = video.currentTime;

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const screenshotUrl = canvas.toDataURL('image/jpeg', 0.5);

  const sizeInBytes = new Blob([screenshotUrl]).size;
  const sizeInKB = (sizeInBytes / 1024).toFixed(2);
  console.log(`Screenshot size: ${sizeInKB} KB`);

  screenshotNotes.push({
    screenshotUrl: screenshotUrl,
    time: time,
    note: null,
    size: sizeInKB
  });

  return { screenshotUrl: screenshotUrl, time: time, size: sizeInKB };
}

function logNoteWithTime(screenshotNotes, note) {
  const video = document.querySelector('video');
  if (!video) {
    return { error: 'No video element found on this page.' };
  }

  const time = video.currentTime;

  screenshotNotes.push({
    screenshotUrl: null,
    time: time,
    note: note,
  });

  return { note: note, time: time };
}