// Google Drive writes are limited by this module to verified shop folders.
// A user-supplied OAuth token MUST have been granted interactively by the user.
export const DRIVE_ROOT = '1tAceM6I0SoTn2UukYsXl6kq1gFeojQzu';
export const DRIVE_SHOPS = Object.freeze({
  'DHL SPORTS':'1uV0rZSRE8dVp8yDPshmBJ5bYri_Kw-WO',
  'DHL STUDIO':'1RkKB_dga2vPPK2heQ27fyn4VrMqkWNAy',
  'RABBIT STORE':'1MB5uhc5U_h_k635qutOVyIQN3ftxtXDu',
  'STORE MIU MIU':'1TpDDyj9Oa1IeREbvVPHKqKxcJwFcRwQ6',
  'MIU CLOTHING & BEAUTY':'13YWxBVbNuIAgGyDDrlRsVloat9cTyVQO',
  'PHONG THỦY KHÁNH HÒA':'1ujNMeO2cWbbm1AwBL_ReCZbVQdVxJxPa'
});
const FOLDER_MIME='application/vnd.google-apps.folder';
const ID_RE=/^[A-Za-z0-9_-]{10,160}$/;
export function productFolderName(name){
  const n=String(name||'').normalize('NFC').replace(/[\\/\r\n\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim();
  if(!n||n==='.'||n==='..'||n.length>160)throw Error('Tên sản phẩm không hợp lệ (tối đa 160 ký tự).');
  return n;
}
export function validateSku(sku){const s=String(sku||'').trim();if(!s||s.length>120||/[\r\n]/.test(s))throw Error('Cần mã SKU hợp lệ để chống tạo thư mục trùng.');return s;}
const queryEsc=s=>String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
export function encodedQuery(parent,condition=''){
  if(!ID_RE.test(parent))throw Error('ID thư mục không hợp lệ');
  return `'${parent}' in parents and trashed = false${condition?' and '+condition:''}`;
}
function verifiedId(id){if(!ID_RE.test(String(id||'')))throw Error('Google Drive trả về ID không hợp lệ');return id;}
export async function driveJson(accessToken,url,options={},fetchImpl=fetch){
  if(!/^https:\/\/(www\.googleapis\.com)(\/|\?)/.test(url))throw Error('URL Google Drive không hợp lệ');
  const res=await fetchImpl(url,{...options,headers:{Authorization:`Bearer ${accessToken}`,...options.headers}});
  if(!res.ok){const detail=(await res.text()).slice(0,220);throw Error(`Google Drive HTTP ${res.status}: ${detail}`);}
  if(res.status===204)return {};
  return res.json();
}
const fields='id,name,mimeType,size,parents,appProperties,webViewLink';
async function metadata(token,id,fetchImpl){return driveJson(token,`https://www.googleapis.com/drive/v3/files/${verifiedId(id)}?fields=${encodeURIComponent(fields)}`,{},fetchImpl);}
async function list(token,parent,condition='',fetchImpl=fetch){
  const all=[];let next='';
  for(let i=0;i<10;i++){
    const q=new URLSearchParams({q:encodedQuery(parent,condition),fields:'nextPageToken,files('+fields+')',pageSize:'100'});
    if(next)q.set('pageToken',next);
    const d=await driveJson(token,`https://www.googleapis.com/drive/v3/files?${q}`,{},fetchImpl);
    all.push(...(d.files||[]));next=d.nextPageToken;if(!next)break;
    if(i===9)throw Error('Có quá nhiều file; tạm dừng thay vì bỏ qua dữ liệu.');
  }
  return all;
}
export async function resolveShop(token,shop,fetchImpl=fetch){
  const id=DRIVE_SHOPS[shop];if(!id)throw Error('Shop không được hỗ trợ');
  const root=await metadata(token,DRIVE_ROOT,fetchImpl);
  if(root.mimeType!==FOLDER_MIME)throw Error('Thư mục trung tâm không tồn tại');
  const dest=await metadata(token,id,fetchImpl);
  if(dest.mimeType!==FOLDER_MIME||dest.name!==shop||!dest.parents?.includes(DRIVE_ROOT))throw Error('Thư mục shop không đúng vị trí trong Drive. Dừng để tránh ghi nhầm.');
  return {id,name:shop};
}
export async function resolveProductFolder(token,{shop,name,sku},fetchImpl=fetch){
  const selected=await resolveShop(token,shop,fetchImpl),folderName=productFolderName(name),productSku=validateSku(sku);
  // App-owned folders are tagged by shop and SKU. Never silently reuse a folder with a different SKU.
  const folders=(await list(token,selected.id,`mimeType = '${FOLDER_MIME}'`,fetchImpl));
  const own=folders.filter(f=>f.appProperties?.dhlFactory==='product'&&f.appProperties?.sku===productSku);
  if(own.length>1)throw Error('Trùng nhiều thư mục cùng SKU. Cần đối chiếu thủ công.');
  if(own.length===1)return {id:verifiedId(own[0].id),name:own[0].name,url:`https://drive.google.com/drive/folders/${own[0].id}`,created:false};
  const sameName=folders.filter(f=>f.name===folderName);
  if(sameName.length)throw Error('Đã có thư mục tên này nhưng chưa xác nhận cùng SKU. Không tạo bản trùng hoặc ghi đè; hãy kiểm tra Drive.');
  const created=await driveJson(token,'https://www.googleapis.com/drive/v3/files?fields='+encodeURIComponent(fields),{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:folderName,mimeType:FOLDER_MIME,parents:[selected.id],appProperties:{dhlFactory:'product',sku:productSku,shop}})
  },fetchImpl);
  return {id:verifiedId(created.id),name:folderName,url:`https://drive.google.com/drive/folders/${created.id}`,created:true};
}
function validateUpload(file){
  const name=String(file?.name||'').trim();if(!name||name.length>180||/[\\/\r\n]/.test(name))throw Error('Tên file không hợp lệ');
  const mime=String(file.mime||'');if(!/^(application\/(json|vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet)|text\/plain|image\/(png|jpeg|webp))$/.test(mime))throw Error('Loại file không hỗ trợ: '+mime);
  if(typeof file.base64!=='string'||!/^[A-Za-z0-9+/]*={0,2}$/.test(file.base64)||file.base64.length>12_000_000)throw Error('Dữ liệu file không hợp lệ');
  return {name,mime};
}
function base64Bytes(b64){const binary=atob(b64),bytes=new Uint8Array(binary.length);for(let i=0;i<bytes.length;i++)bytes[i]=binary.charCodeAt(i);return bytes;}
export async function uploadProductFile(token,folderId,sku,file,fetchImpl=fetch){
  verifiedId(folderId);validateSku(sku);const {name,mime}=validateUpload(file);
  const existing=(await list(token,folderId,`name = '${queryEsc(name)}'`,fetchImpl)).filter(f=>f.name===name);
  if(existing.length>1)throw Error(`Trùng nhiều file "${name}" trong thư mục sản phẩm.`);
  const match=existing[0];
  if(match&&(match.appProperties?.dhlFactory!=='file'||match.appProperties?.sku!==sku))throw Error(`File "${name}" đã tồn tại nhưng không do tool quản lý. Không ghi đè.`);
  const meta={name,mimeType:mime,appProperties:{dhlFactory:'file',sku}};
  if(!match)meta.parents=[folderId];
  const url=match?`https://www.googleapis.com/upload/drive/v3/files/${verifiedId(match.id)}?uploadType=multipart&fields=id,name`:'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name';
  const boundary='factory'+crypto.randomUUID().replaceAll('-','');
  const bytes=base64Bytes(file.base64);
  const body=new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`,bytes,`\r\n--${boundary}--`]);
  const result=await driveJson(token,url,{method:match?'PATCH':'POST',headers:{'Content-Type':`multipart/related; boundary=${boundary}`},body},fetchImpl);
  return {id:verifiedId(result.id),name,action:match?'updated':'created'};
}
export async function saveProductBundle(token,{shop,name,sku,files},fetchImpl=fetch){
  if(!Array.isArray(files)||!files.length||files.length>32)throw Error('Bộ sản phẩm cần 1–32 file');
  const seen=new Set();for(const f of files){const {name:fileName}=validateUpload(f);if(seen.has(fileName))throw Error('Trùng tên file trong bộ sản phẩm: '+fileName);seen.add(fileName);}
  const folder=await resolveProductFolder(token,{shop,name,sku},fetchImpl);
  const uploaded=[],errors=[];
  for(const file of files){try{uploaded.push(await uploadProductFile(token,folder.id,sku,file,fetchImpl));}catch(e){errors.push({name:file.name,error:e.message});}}
  return {folder,uploaded,errors,success:errors.length===0};
}
export async function verifyProductFolder(token,{shop,sku,folderId},fetchImpl=fetch){
  const shopId=DRIVE_SHOPS[shop];if(!shopId)throw Error('Shop không được hỗ trợ');
  const f=await metadata(token,verifiedId(folderId),fetchImpl);
  if(f.mimeType!==FOLDER_MIME||!f.parents?.includes(shopId)||f.appProperties?.dhlFactory!=='product'||f.appProperties?.sku!==validateSku(sku)||f.appProperties?.shop!==shop)throw Error('Thư mục đích chưa được xác minh đúng Shop/SKU.');
  return f;
}

// Browse source materials directly with the extension's OAuth connection.
// Every folder and file is checked to be inside the selected existing shop.
const IMAGE_SOURCE_MIMES=new Set(['image/png','image/jpeg','image/webp']);
const TEXT_SOURCE_MIMES=new Set(['text/plain','text/markdown','application/json','application/vnd.google-apps.document']);
export async function assertSourceFolder(token,shop,folderId,fetchImpl=fetch){
  const shopFolder=await resolveShop(token,shop,fetchImpl);
  const currentId=folderId||shopFolder.id;
  if(currentId===shopFolder.id)return {id:currentId,name:shop,parentId:''};
  let cursor=currentId, immediate=null;
  const traversed=new Set();
  for(let i=0;i<12;i++){
    if(traversed.has(cursor))break;
    if(cursor===DRIVE_ROOT||(Object.values(DRIVE_SHOPS).includes(cursor)&&cursor!==shopFolder.id))throw Error('Thư mục nguồn không nằm trong shop đã chọn.');
    traversed.add(cursor);
    const f=await metadata(token,cursor,fetchImpl);
    if(f.mimeType!==FOLDER_MIME)throw Error('Nguồn đã chọn không phải thư mục.');
    if(!immediate)immediate=f;
    const parents=f.parents||[];
    if(parents.includes(shopFolder.id))return {id:currentId,name:immediate.name,parentId:immediate.parents?.[0]||''};
    if(parents.length!==1)break;
    cursor=parents[0];
  }
  throw Error('Thư mục nguồn không nằm trong shop đã chọn hoặc nằm quá sâu. Không truy cập.');
}
export async function listSourceFolder(token,{shop,folderId=''},fetchImpl=fetch){
  const folder=await assertSourceFolder(token,shop,folderId,fetchImpl);
  const entries=await list(token,folder.id,'',fetchImpl);
  return {folder,shopRootId:DRIVE_SHOPS[shop],entries:entries.filter(f=>f.mimeType===FOLDER_MIME||IMAGE_SOURCE_MIMES.has(f.mimeType)||TEXT_SOURCE_MIMES.has(f.mimeType)||f.mimeType==='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'||f.mimeType==='application/vnd.openxmlformats-officedocument.wordprocessingml.document'||f.mimeType==='image/svg+xml').map(f=>({id:f.id,name:f.name,mimeType:f.mimeType,size:Number(f.size||0),supported: f.mimeType===FOLDER_MIME||IMAGE_SOURCE_MIMES.has(f.mimeType)||TEXT_SOURCE_MIMES.has(f.mimeType)})).sort((a,b)=>(b.mimeType===FOLDER_MIME)-(a.mimeType===FOLDER_MIME)||a.name.localeCompare(b.name,'vi'))};
}
export async function loadSourceFile(token,{shop,folderId,fileId},fetchImpl=fetch){
  const folder=await assertSourceFolder(token,shop,folderId,fetchImpl);
  const file=await metadata(token,fileId,fetchImpl);
  if(!file.parents?.includes(folder.id))throw Error('File nguồn không nằm trực tiếp trong thư mục đã chọn.');
  const mime=file.mimeType;
  if(!IMAGE_SOURCE_MIMES.has(mime)&&!TEXT_SOURCE_MIMES.has(mime))throw Error('File này chưa được hỗ trợ phân tích trực tiếp; hãy tải về và cung cấp file tương ứng.');
  const isImage=IMAGE_SOURCE_MIMES.has(mime);
  const size=Number(file.size||0);
  if(size>(isImage?3_000_000:200_000))throw Error('File nguồn quá lớn cho một lần phân tích.');
  const uri=mime==='application/vnd.google-apps.document'
    ?`https://www.googleapis.com/drive/v3/files/${verifiedId(fileId)}/export?mimeType=text%2Fplain`
    :`https://www.googleapis.com/drive/v3/files/${verifiedId(fileId)}?alt=media`;
  const response=await fetchImpl(uri,{headers:{Authorization:`Bearer ${token}`}});
  if(!response.ok)throw Error('Không đọc được tài liệu nguồn: HTTP '+response.status);
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(bytes.byteLength>(isImage?3_000_000:200_000))throw Error('File vượt dung lượng cho phép.');
  if(isImage){let s='';for(let i=0;i<bytes.length;i+=16384)s+=String.fromCharCode(...bytes.subarray(i,i+16384));return {name:file.name,kind:'image',data:`data:${mime};base64,${btoa(s)}`};}
  const text=new TextDecoder('utf-8',{fatal:false}).decode(bytes).replace(/\u0000/g,'');
  return {name:file.name,kind:'text',data:text.slice(0,5000)};
}
export async function driveAccount(token,fetchImpl=fetch){
  const result=await driveJson(token,'https://www.googleapis.com/drive/v3/about?fields=user(emailAddress,displayName)',{},fetchImpl);
  return {email:result.user?.emailAddress||'',name:result.user?.displayName||''};
}
