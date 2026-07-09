import { GOOGLE_LOGIN_MSG, type GoogleLoginRequest } from '@/core/auth/googleLogin';
import { handleGoogleLoginMessage } from './googleAuth';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== 'object' || (message as { type?: string }).type !== GOOGLE_LOGIN_MSG) {
    return;
  }

  void handleGoogleLoginMessage(message as GoogleLoginRequest).then(sendResponse);
  return true; // keep channel open for async response
});
