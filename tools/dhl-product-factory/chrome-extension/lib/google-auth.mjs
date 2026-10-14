// Official Chrome Identity integration for Google accounts. Chrome manages token refresh.
// The extension-specific OAuth client ID must be configured in manifest.json.
export const DRIVE_SCOPE='https://www.googleapis.com/auth/drive';
export function configuredClientId(manifest){const id=manifest?.oauth2?.client_id||'';return /^\d{8,}-[a-z0-9-]+\.apps\.googleusercontent\.com$/.test(id)&&!id.includes('placeholder')?id:'';}
function getToken(r){return typeof r==='string'?r:r?.token;}
export async function connectDrive({identity=chrome.identity,manifest=chrome.runtime.getManifest(),storage=chrome.storage.local}={}){
  if(!configuredClientId(manifest))throw Error('Chưa cấu hình Google OAuth Chrome Extension Client ID trong manifest.json. Xem hướng dẫn README.');
  const token=getToken(await identity.getAuthToken({interactive:true,scopes:[DRIVE_SCOPE]}));
  if(!token)throw Error('Google chưa cấp quyền truy cập Drive.');
  await storage.set({driveConnected:true});
  return {connected:true};
}
export async function getDriveToken({identity=chrome.identity,manifest=chrome.runtime.getManifest()}={}){
  if(!configuredClientId(manifest))throw Error('Chưa cấu hình Google OAuth Client ID trong manifest.json.');
  let token;try{token=getToken(await identity.getAuthToken({interactive:false,scopes:[DRIVE_SCOPE]}));}catch{throw Error('Phiên Google Drive chưa sẵn sàng. Bấm Kết nối Google Drive ở phần Cài đặt.');}
  if(!token)throw Error('Chưa có quyền Google Drive. Bấm Kết nối Google Drive.');
  return token;
}
export async function disconnectDrive({identity=chrome.identity,storage=chrome.storage.local}={}){
  if(identity.clearAllCachedAuthTokens)await identity.clearAllCachedAuthTokens();
  await storage.remove('driveConnected');
  return {connected:false};
}
export async function driveConnectionStatus({manifest=chrome.runtime.getManifest(),storage=chrome.storage.local}={}){
  const st=await storage.get('driveConnected');return {configured:!!configuredClientId(manifest),connected:!!st.driveConnected};
}
