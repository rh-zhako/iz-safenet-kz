import {createRemoteJWKSet, jwtVerify} from './vendor/auth/jose.mjs';
import {GOOGLE_CLIENT_ID} from './auth-config.mjs';

const clientIdPattern = /^[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/;
const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'), {timeoutDuration:8000});
const pageNonce = crypto.randomUUID();
let principal = null;
let expiresAt = 0;
let expiryTimer;
let scriptPromise;
let initialized = false;
let activeAttempt = null;

export const isGoogleConfigured = () => clientIdPattern.test(GOOGLE_CLIENT_ID);

// The signature, issuer, audience and expiry are verified before any UI identity
// is accepted. Decoding a JWT alone is not authentication.
export async function verifyGoogleCredential(credential, {clientId, nonce}) {
  if (!clientIdPattern.test(clientId) || !nonce || typeof credential !== 'string' || credential.length > 20000) {
    throw new Error('Invalid sign-in request');
  }
  const {payload} = await jwtVerify(credential, googleKeys, {
    algorithms:['RS256'],
    audience:clientId,
    issuer:['https://accounts.google.com','accounts.google.com'],
    requiredClaims:['sub','email','email_verified','exp','iat','nonce'],
    maxTokenAge:'1h',
    clockTolerance:30
  });
  if (payload.nonce !== nonce || payload.email_verified !== true ||
      typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 255 ||
      typeof payload.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    throw new Error('Unverified Google identity');
  }
  return Object.freeze({
    id:payload.sub,
    name:typeof payload.name === 'string' ? payload.name.slice(0,150) : '',
    email:payload.email,
    expiresAt:payload.exp * 1000
  });
}

export function getGoogleUser() {
  if (principal && Date.now() >= expiresAt) {
    principal = null;
    expiresAt = 0;
  }
  return principal;
}

function loadGoogleLibrary() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve,reject) => {
    const script = document.createElement('script');
    const fail = () => {
      clearTimeout(timer);
      script.remove();
      scriptPromise = undefined;
      reject(new Error('Google unavailable'));
    };
    const timer = setTimeout(fail,15000);
    script.id = 'iz-google-identity-library';
    script.src = 'https://accounts.google.com/gsi/client?hl=ru';
    script.async = true;
    script.onload = () => {
      clearTimeout(timer);
      if (window.google?.accounts?.id) resolve();
      else fail();
    };
    script.onerror = fail;
    document.head.append(script);
  });
  return scriptPromise;
}

async function handleCredential(response) {
  const attempt = activeAttempt;
  if (!attempt?.container.isConnected) return;
  attempt.onStatus('Подтверждаем вход…');
  try {
    const user = await verifyGoogleCredential(response.credential, {clientId:GOOGLE_CLIENT_ID, nonce:pageNonce});
    if (activeAttempt !== attempt || !attempt.container.isConnected) return;
    principal = Object.freeze({id:user.id,name:user.name,email:user.email});
    expiresAt = user.expiresAt;
    clearTimeout(expiryTimer);
    expiryTimer = setTimeout(() => {
      principal = null;
      expiresAt = 0;
      window.dispatchEvent(new Event('iz-auth-change'));
    },Math.max(0,expiresAt - Date.now()));
    activeAttempt = null;
    // Never persist or log the Google credential. The local profile stays in
    // memory for this tab only; it does not create a server session or sync data.
    attempt.onSuccess(principal);
  } catch {
    if (activeAttempt === attempt) attempt.onStatus('Не удалось подтвердить вход. Попробуйте ещё раз.',true);
  }
}

export async function mountGoogleSignIn(container, {onSuccess,onStatus}) {
  const attempt = {container,onSuccess,onStatus};
  activeAttempt = attempt;
  if (!isGoogleConfigured()) {
    onStatus('Вход через Google ещё не подключён. Пока можно пользоваться ІЗ без входа.');
    return;
  }
  onStatus('Подключаем Google…');
  try {
    await loadGoogleLibrary();
    if (activeAttempt !== attempt || !container.isConnected) return;
    if (!initialized) {
      window.google.accounts.id.initialize({
        client_id:GOOGLE_CLIENT_ID,
        callback:handleCredential,
        nonce:pageNonce,
        auto_select:false,
        button_auto_select:false,
        use_fedcm_for_button:false,
        ux_mode:'popup'
      });
      initialized = true;
    }
    container.replaceChildren();
    window.google.accounts.id.renderButton(container, {
      type:'standard',theme:'outline',size:'large',text:'continue_with',
      shape:'rectangular',locale:'ru',logo_alignment:'left',
      width:Math.max(220,Math.min(360,Math.floor(container.getBoundingClientRect().width)))
    });
    onStatus('');
  } catch {
    if (activeAttempt === attempt) onStatus('Google сейчас недоступен. Проверьте соединение и откройте вход ещё раз.',true);
  }
}

export function cancelGoogleSignIn() {
  activeAttempt = null;
}

export function signOutGoogle() {
  cancelGoogleSignIn();
  principal = null;
  expiresAt = 0;
  clearTimeout(expiryTimer);
  window.google?.accounts?.id?.disableAutoSelect();
}
