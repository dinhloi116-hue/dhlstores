// Checks trusted, public GitHub metadata only. Never downloads or executes extension JS.
export const GITHUB_REPO='dinhloi116-hue/dhlstores';
export const GITHUB_BRANCH='feature/dhl-product-factory-mvp-20261012';
export const EXT_FOLDER='tools/dhl-product-factory/chrome-extension';
export const MANIFEST_ENDPOINT=`https://api.github.com/repos/${GITHUB_REPO}/contents/${EXT_FOLDER}/manifest.json?ref=${encodeURIComponent(GITHUB_BRANCH)}`;
export const UPDATE_FOLDER_URL=`https://github.com/${GITHUB_REPO}/tree/${GITHUB_BRANCH}/${EXT_FOLDER}`;

export function compareVersions(local,remote){
  const parse=v=>String(v||'').split('.').map(x=>{if(!/^\d+$/.test(x))throw Error('Phiên bản GitHub không hợp lệ');return Number(x)});
  const a=parse(local),b=parse(remote);
  if(a.length!==3||b.length!==3)throw Error('Phiên bản phải có ba thành phần');
  for(let i=0;i<3;i++)if(a[i]!==b[i])return Math.sign(b[i]-a[i]);
  return 0;
}

export async function checkGithubVersion(localManifest,fetchImpl=fetch){
  const res=await fetchImpl(MANIFEST_ENDPOINT,{headers:{Accept:'application/vnd.github+json'},cache:'no-store'});
  if(!res.ok)throw Error(`Không kiểm tra được GitHub (HTTP ${res.status}).`);
  const meta=await res.json();
  if(meta.type!=='file'||meta.encoding!=='base64'||typeof meta.content!=='string')throw Error('GitHub trả định dạng không hợp lệ.');
  const bin=atob(meta.content.replace(/\s/g,''));
  const bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));
  const remote=JSON.parse(new TextDecoder().decode(bytes));
  if(remote.manifest_version!==3||remote.name!==localManifest.name||remote.key!==localManifest.key){throw Error('Bản GitHub không khớp tiện ích chính thức; không cập nhật.');}
  const newer=compareVersions(localManifest.version,remote.version);
  return {currentVersion:localManifest.version,latestVersion:remote.version,updateAvailable:newer>0,upToDate:newer===0,repoUrl:UPDATE_FOLDER_URL};
}
