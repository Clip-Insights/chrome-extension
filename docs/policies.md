## Answers submitted to the Chrome Web Store Developer Program Policies

This document contains the answers submitted to the Chrome Web Store Developer Program Policies form for the Clip Insights extension. The first part contains the answers submitted before the complete revamp of the extension into a React-based SPA with a backend, and the second part contains the updated answers reflecting the current architecture and functionality.


Privacy
To facilitate the compliance of your extension with the Chrome Web Store Developer Program Policies, you are required to provide the information listed below. The information provided in this form will be shared with the Chrome Web Store team. Please ensure that the information provided is accurate, as it will improve the review time of your extension and decrease the risk of this version being rejected.

Single purpose
An extension must have a single purpose that is narrow and easy-to-understand. Learn more

Single purpose description:
This extension enhances the YouTube experience by enabling users to take synchronized notes, capture video screenshots, chat about video content and saving notes. Users are allowed to login to clipinsights.com account and send their notes to the website and will be accessible in their user space on the website.
In future, I will implement a paid version of the extension and all the transactions and information will be securely saved on the server side. Extension side will not be doing much things related to it.
516/1,000516 of 1000 characters entered
Permission justification
A permission is either one of a list of known strings, such as "activeTab", or a match pattern giving access to one or more hosts.
Remove any permission that is not needed to fulfill the single purpose of your extension. Requesting an unnecessary permission will result in this version being rejected.

> Due to the Host Permission, your extension may require an in-depth review which will delay publishing.

identity justification
0/1,0000 of 1000 characters entered
Host permission justification
Host Permissions Justification
Scope: https://www.youtube.com/*
The extension requires this permission to:
Interact with the YouTube video player for detecting timestamps and video URLs.
Embed the note-taking interface within YouTube’s UI.
Ensure functionality is limited to YouTube, protecting user privacy.

Content Scripts Justification
content.js:
Injects and manages the note-taking interface.
Interacts with the video player for timestamps and screenshots.
Handles communication with the background process.

database.js
Code that is managing IndexedDB for storing and retrieving notes and screenshots.
Written in separate file to organize the code.

jspdf.umd.min.js:
Generates PDFs for exporting notes and screenshots.

styles.css:
Ensures seamless integration with YouTube’s design.


793/1,000793 of 1000 characters entered
A host permission is any match pattern specified in the "permissions" and "content_scripts" fields of the extension manifest
Are you using remote code?

No, I am not using Remote code

Yes, I am using Remote code
Justification
This extension does not include or execute any remote JavaScript or WebAssembly code. All JavaScript is bundled directly within the extension package.

The extension communicates with a backend server only to:
Save and retrieve user data (e.g., notes and screenshots) securely.
Process summaries and video-related data for the user.
The API responses from the backend are purely data (e.g., JSON) and do not contain or execute any code. All processing and logic occur within the extension's packaged scripts.
508/1,000508 of 1000 characters entered
Remote code is any JS or Wasm that is not included in the extension's package. This includes references to external files in <script> tags, modules pointing to external files, and strings evaluated through eval()
Data usage
The content of this form will be displayed publicly on the item detail page. By publishing your item, you are certifying that these disclosures reflect the most up-to-date content of your privacy policy.

What user data do you plan to collect from users now or in the future? (See FAQ for more information)

Personally identifiable information
For example: name, address, email address, age, or identification number

Health information
For example: heart rate data, medical history, symptoms, diagnoses, or procedures

Financial and payment information
For example: transactions, credit card numbers, credit ratings, financial statements, or payment history

Authentication information
For example: passwords, credentials, security question, or personal identification number (PIN)

Personal communications
For example: emails, texts, or chat messages

Location
For example: region, IP address, GPS coordinates, or information about things near the user’s device

Web history
The list of web pages a user has visited, as well as associated data such as page title and time of visit

User activity
For example: network monitoring, clicks, mouse position, scroll, or keystroke logging

Website content
For example: text, images, sounds, videos, or hyperlinks
I certify that the following disclosures are true:

I do not sell or transfer user data to third parties, outside of the approved use cases

I do not use or transfer user data for purposes that are unrelated to my item's single purpose

I do not use or transfer user data to determine creditworthiness or for lending purposes
You must certify all three disclosures to comply with our Developer Program Policies


## Solutions 
> For each section and solutions, write them down there, I will copy and past over there in the relevant sections.

### 1. Single purpose description

Clip Insights enhances the YouTube learning experience. On YouTube watch pages it adds a study panel that lets users capture screenshots of the video, write timestamped notes, generate an AI summary and key points of the video, chat with an AI about the video content, copy the transcript, and export everything as a PDF (downloaded locally or uploaded to their ClipInsights account space on our website). Users can optionally sign in to their ClipInsights account (email/password or Google sign-in) to sync exported notes and unlock their plan's usage quotas. Feature quotas (e.g., number of AI summaries or chat messages) are enforced by our backend based on the user's plan. All payments and subscription management happen exclusively on our website — the extension never collects or processes any payment information.

### 2. `identity` permission justification

The identity permission is used only for the optional "Sign in with Google" button. When the user clicks it, the background service worker calls chrome.identity.launchWebAuthFlow() to open Google's standard OAuth consent screen and receive the redirect containing a Google ID token (requested scopes: openid, email, profile only). That ID token is sent once, over HTTPS, to our backend to sign the user into their ClipInsights account — the equivalent of the email/password login. The flow runs exclusively on explicit user action; we never silently read profile or account information, request no other scopes, and make no other use of chrome.identity.

### 3. Host permission justification

Scope: https://www.youtube.com/* — the only host requested, and also the only content_scripts match.

The content script needs access to YouTube to:
1. Detect watch pages and in-page navigation (YouTube is a single-page app).
2. Read the current video's URL, title and playback time to attach timestamps to notes.
3. Capture the current video frame as an image when the user clicks Screenshot.
4. Retrieve the video's captions/transcript so the user can copy it and so the AI summary, key points and chat features can process it.
5. Inject the notes panel into the watch-page sidebar (rendered inside an isolated Shadow DOM so it cannot interfere with the page).

Notes and screenshots are stored locally in the browser (IndexedDB). Data leaves the browser only on user-initiated actions: generating AI summaries/chat answers (transcript sent to our backend over HTTPS) and uploading the user's own PDF to their account. No other website is read or modified.

### 4. Remote code — select "No, I am not using Remote code"

Justification:

No remote JavaScript or WebAssembly is loaded or executed. The extension is built with Vite; every script — including third-party libraries (React, jsPDF, DOMPurify, html2canvas) — is bundled inside the uploaded package. The lazily loaded files listed under web_accessible_resources are local chunks of that same bundle, loaded via chrome.runtime.getURL(), never from the network. The extension communicates with our backend over HTTPS only to authenticate users, fetch the user's plan limits, generate AI summaries/answers from the video transcript, and store PDFs the user uploads. All responses are pure data (JSON or streamed text) rendered as text — nothing received from the network is executed as code (no eval, no dynamic script tags, no remote imports).

### 5. Data usage — checkboxes

Tick exactly these three (same as before):

- [x] **Personally identifiable information** — email address (and name from the Google profile) when the user signs in or creates an account.
- [x] **Authentication information** — password for email/password login; Google OAuth ID token; session JWTs stored locally.
- [x] **Website content** — video captions/transcripts, video titles/URLs, and captured video frames, processed for the user's notes and AI features.

Leave unticked: Health, Financial and payment (payments happen on the website through the payment provider — the extension never sees them), Personal communications, Location, Web history, User activity.

Certifications — tick all three:
- [x] I do not sell or transfer user data to third parties, outside of the approved use cases
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes