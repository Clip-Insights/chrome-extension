# Extension purpose, permissions, and data flow

Clip Insights adds a video study workspace to YouTube watch pages. It combines timestamped notes, screenshots, transcript-based AI insights, chat, and PDF export.

## Permissions

| Permission or match | Use |
| --- | --- |
| `identity` | Run the interactive Google sign-in flow when the user chooses Google login. |
| `https://www.youtube.com/*` | Locate the video, identify the page, read captions and playback time, capture a frame on request, and mount the study panel. |

The manifest's content script and host-permission patterns are restricted to YouTube. YouTube-specific behavior is implemented by the platform adapter.

## Runtime structure

The content script mounts the React panel in a Shadow DOM. The background service worker handles Google authentication through `chrome.identity.launchWebAuthFlow`. Executable application code and its dependencies are bundled into the extension package. Backend responses contain application data and streamed answer text; they are not executed as application code.

## Data flow

| Data | Use and destination |
| --- | --- |
| Video URL, title, playback time, and captions | Provide video context and attach timestamps to study content. |
| Working notes, screenshots, and generated insights | Stored in browser IndexedDB; subject to the extension's retention policy. |
| Transcript, questions, and recent chat | Sent to the backend for requested summary and chat operations; relevant content is passed to the configured AI providers. |
| Email/password or Google ID token | Sent to the backend for the selected sign-in flow. |
| JWT access and refresh tokens | Used for account requests and stored locally in encoded form. |
| Generated PDF | Downloaded locally or uploaded to account storage when the user chooses upload. |
| Account profile, plan, and usage | Retrieved from the backend to display account state and applicable limits. |

Plan and profile requests can occur as part of normal panel initialization and session handling. AI generation and PDF upload are user-initiated operations. Payments and subscription management are accessed through the web app; the extension does not collect payment-card details.

## Retention and account documents

Working study records older than five days are deleted during panel-mount cleanup. Exporting or uploading a PDF creates a separate document copy. Uploaded documents are managed in the [web app](https://app.clipinsights.org).

The [architecture guide](../ARCHITECTURE.md) describes the implementation. Public product information and policy pages are available through [clipinsights.org](https://clipinsights.org).
