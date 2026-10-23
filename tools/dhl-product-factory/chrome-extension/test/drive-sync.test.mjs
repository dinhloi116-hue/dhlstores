import test from 'node:test';
import assert from 'node:assert/strict';
import {DRIVE_ROOT,DRIVE_SHOPS,resolveShop,resolveProductFolder,verifyProductFolder,uploadProductFile,productFolderName,listSourceFolder,loadSourceFile,assertSourceFolder,driveAccount} from '../lib/drive-sync.mjs';
import {connectDrive,getDriveToken,driveConnectionStatus,disconnectDrive} from '../lib/google-auth.mjs';
const FOLDER='application/vnd.google-apps.folder';
function driveMock(){
  const files=new Map([[DRIVE_ROOT,{id:DRIVE_ROOT,name:'TRUNG TÂM TẠO SẢN PHẨM - 6 SHOP',mimeType:FOLDER,parents:['root']}]])
  for(const [name,id] of Object.entries(DRIVE_SHOPS))files.set(id,{id,name,mimeType:FOLDER,parents:[DRIVE_ROOT]});
  let next=0;const operations=[];
  const fetchImpl=async(url,req={})=>{
    const u=new URL(url),method=req.method||'GET';let data;
    if(method==='GET'&&u.pathname.endsWith('/export')){
       return new Response('Google Doc text', {status:200});
     }else if(method==='GET'&&u.searchParams.get('alt')==='media'){
       const fid=u.pathname.split('/').at(-1);const v=files.get(fid);return v?new Response(v.binary||'Plain text source',{status:200}):new Response('',{status:404});
     }else if(method==='GET'&&u.pathname==='/drive/v3/about'){
       data={user:{emailAddress:'shop@example.com',displayName:'Shop owner'}};
     }else if(method==='GET'&&u.pathname.startsWith('/drive/v3/files/')){
      const id=u.pathname.split('/').at(-1);data=files.get(id);
      if(!data)return new Response('{}',{status:404});
    }else if(method==='GET'&&u.pathname==='/drive/v3/files'){
      const q=u.searchParams.get('q')||'',parent=q.match(/^'([^']+)' in parents/)?.[1],items=[...files.values()].filter(f=>f.parents?.includes(parent));
      data={files:items.filter(f=>!q.includes('mimeType =')||f.mimeType===FOLDER)};
    }else if(method==='POST'&&u.pathname==='/drive/v3/files'){
      const meta=JSON.parse(req.body);const id='folder-new-'+(++next);data={id,...meta};files.set(id,data);operations.push({action:'createFolder',data});
    }else if(['PATCH','POST'].includes(method)&&u.pathname.startsWith('/upload/drive/v3/files')){
      const body=await req.body.text(),meta=JSON.parse(body.match(/Content-Type: application\/json; charset=UTF-8\r\n\r\n([^\r\n]+)/)[1]);
      const id=method==='PATCH'?u.pathname.split('/').at(-1):'file-new-'+(++next);
      const original=files.get(id)||{};data={...original,...meta,id};files.set(id,data);operations.push({action:method==='PATCH'?'updateFile':'createFile',data});
    }else return new Response('{}',{status:400});
    return new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json'}});
  };
  return {files,operations,fetchImpl};
}
const xlsx={name:'Thông tin sản phẩm.xlsx',mime:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',base64:btoa('fake xlsx bytes')};
test('six verified shop folder IDs all belong directly to root',async()=>{
  const fake=driveMock();for(const shop of Object.keys(DRIVE_SHOPS)){const folder=await resolveShop('token',shop,fake.fetchImpl);assert.equal(folder.name,shop)}
  fake.files.get(DRIVE_SHOPS['DHL STUDIO']).parents=['wrong-parent'];
  await assert.rejects(resolveShop('token','DHL STUDIO',fake.fetchImpl),/không đúng vị trí/);
});
test('folder is product name, direct child, reused by SKU and cannot collide by name',async()=>{
  const fake=driveMock();const p={shop:'DHL STUDIO',name:'Nameset Messi 10',sku:'M10-ABC'};
  const folder=await resolveProductFolder('token',p,fake.fetchImpl);
  assert.equal(folder.name,'Nameset Messi 10');assert.equal(folder.created,true);
  assert.deepEqual(fake.files.get(folder.id).parents,[DRIVE_SHOPS[p.shop]]);
  const reused=await resolveProductFolder('token',p,fake.fetchImpl);assert.equal(reused.id,folder.id);assert.equal(reused.created,false);
  const others={...p,sku:'DIFFERENT'};await assert.rejects(resolveProductFolder('token',others,fake.fetchImpl),/Đã có thư mục tên này/);
  await verifyProductFolder('token',{shop:p.shop,sku:p.sku,folderId:folder.id},fake.fetchImpl);
  await assert.rejects(verifyProductFolder('token',{shop:'DHL SPORTS',sku:p.sku,folderId:folder.id},fake.fetchImpl),/chưa được xác minh/);
  assert.equal(productFolderName(' Hoa / Tulip  '),'Hoa Tulip');
});
test('files upload/update in verified product folder without replacing user-owned files',async()=>{
  const fake=driveMock();const p={shop:'STORE MIU MIU',name:'Hoa tulip kẽm nhung',sku:'TULIP-01'};
  const folder=await resolveProductFolder('token',p,fake.fetchImpl);
  const a=await uploadProductFile('token',folder.id,p.sku,xlsx,fake.fetchImpl);assert.equal(a.action,'created');
  const b=await uploadProductFile('token',folder.id,p.sku,xlsx,fake.fetchImpl);assert.equal(b.action,'updated');assert.equal(a.id,b.id);
  fake.files.set('user-file-123',{id:'user-file-123',name:'SEO website.xlsx',mimeType:xlsx.mime,parents:[folder.id]});
  await assert.rejects(uploadProductFile('token',folder.id,p.sku,{...xlsx,name:'SEO website.xlsx'},fake.fetchImpl),/Không ghi đè/);
  assert.equal(fake.operations.filter(x=>x.action==='createFolder').length,1);
});
test('Chrome identity handles Google token without retaining raw refresh token',async()=>{
  const memory={};const storage={get:async k=>({[k]:memory[k]}),set:async d=>Object.assign(memory,d),remove:async k=>delete memory[k]};
  const manifest={oauth2:{client_id:'123456789012-abc123.apps.googleusercontent.com'}};
  const identity={getAuthToken:async opts=>({token:opts.interactive?'my-token':'auto-refreshed-token'}),clearAllCachedAuthTokens:async()=>{}};
  assert.equal((await connectDrive({identity,manifest,storage})).connected,true);
  assert.equal(await getDriveToken({identity,manifest}),'auto-refreshed-token');
  assert.equal((await driveConnectionStatus({manifest,storage})).connected,true);
  await disconnectDrive({identity,storage});assert.equal((await driveConnectionStatus({manifest,storage})).connected,false);
  assert.deepEqual(Object.keys(memory),[]);
});

test('direct source browser allows nested folders and rejects cross-shop IDs',async()=>{
  const m=driveMock(),root=DRIVE_SHOPS['DHL STUDIO'];
  const child='folder-child-ABC123',nested='folder-nested-ABC123';
  m.files.set(child,{id:child,name:'Tên số',mimeType:FOLDER,parents:[root]});
  m.files.set(nested,{id:nested,name:'Bộ nguồn',mimeType:FOLDER,parents:[child]});
  const ls=await listSourceFolder('token',{shop:'DHL STUDIO',folderId:child},m.fetchImpl);
  assert.equal(ls.folder.name,'Tên số');assert.equal(ls.entries[0].id,nested);
  assert.equal((await assertSourceFolder('token','DHL STUDIO',nested,m.fetchImpl)).parentId,child);
  await assert.rejects(listSourceFolder('token',{shop:'DHL SPORTS',folderId:child},m.fetchImpl),/không nằm trong shop/);
});
test('reads only supported source bytes from selected folder, not other shop or arbitrary URLs',async()=>{
  const m=driveMock(),root=DRIVE_SHOPS['STORE MIU MIU'];
  const photo={id:'img-ABC123abc',name:'Hoa mẫu.png',mimeType:'image/png',parents:[root],size:'4',binary:'abcd'};
  const textfile={id:'note-ABC123abc',name:'Ghi chú.txt',mimeType:'text/plain',parents:[root],size:'9',binary:'flower pot'};
  m.files.set(photo.id,photo);m.files.set(textfile.id,textfile);
  const files=await listSourceFolder('token',{shop:'STORE MIU MIU'},m.fetchImpl);assert.equal(files.entries.length,2);
  const p=await loadSourceFile('token',{shop:'STORE MIU MIU',folderId:root,fileId:photo.id},m.fetchImpl);
  assert.equal(p.kind,'image');assert.equal(p.data,'data:image/png;base64,YWJjZA==');
  const t=await loadSourceFile('token',{shop:'STORE MIU MIU',folderId:root,fileId:textfile.id},m.fetchImpl);
  assert.match(t.data,/flower pot/);
  await assert.rejects(loadSourceFile('token',{shop:'DHL STUDIO',folderId:root,fileId:photo.id},m.fetchImpl),/không nằm trong shop/);
  assert.equal((await driveAccount('token',m.fetchImpl)).email,'shop@example.com');
});

test('markdown is stored as one app-owned file alongside photos and updated safely',async()=>{
 const fake=driveMock(),p={shop:'DHL SPORTS',name:'Áo bóng đá mới',sku:'DOC-01TEST'};
 const folder=await resolveProductFolder('token',p,fake.fetchImpl);
 const md={name:'THÔNG TIN SẢN PHẨM.md',mime:'text/markdown',base64:btoa('# Test\nHello')};
 const a=await uploadProductFile('token',folder.id,p.sku,md,fake.fetchImpl);
 const b=await uploadProductFile('token',folder.id,p.sku,md,fake.fetchImpl);
 assert.equal(a.action,'created');assert.equal(b.action,'updated');assert.equal(a.id,b.id);
 const image={name:'Ảnh gốc 1.png',mime:'image/png',base64:btoa('fake image')};
 assert.equal((await uploadProductFile('token',folder.id,p.sku,image,fake.fetchImpl)).action,'created');
 assert.equal(fake.operations.filter(x=>x.action==='createFile').length,2);
 fake.files.set('manual-md-ABC123',{id:'manual-md-ABC123',name:'Ảnh thành phẩm 1.png',mimeType:'image/png',parents:[folder.id]});
 await assert.rejects(uploadProductFile('token',folder.id,p.sku,{...image,name:'Ảnh thành phẩm 1.png'},fake.fetchImpl),/Không ghi đè/);
});
