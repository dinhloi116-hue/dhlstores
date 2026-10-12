// Dependency-free OOXML reader / copy-on-write worksheet editor.
// Rejects Zip64, encrypted archives, oversized archives and path traversal.
import {inflateRawSync, deflateRawSync} from 'node:zlib';

const UTF8=new TextDecoder();
const bytes=s=>Buffer.from(s,'utf8');
const ESC={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'};
export const xmlEscape=v=>String(v??'').replace(/[&<>"']/g,c=>ESC[c]);
const crcTable=Array.from({length:256},(_,x)=>{for(let i=0;i<8;i++)x=x&1?0xedb88320^(x>>>1):x>>>1;return x>>>0;});
const crc32=b=>{let c=0xffffffff;for(const x of b)c=crcTable[(c^x)&255]^(c>>>8);return(c^0xffffffff)>>>0;};
export function readZip(input){
 const buf=Buffer.from(input);if(buf.length<22||buf.length>30_000_000)throw Error('File Excel quá lớn hoặc không hợp lệ');
 let e=-1;for(let i=buf.length-22;i>=Math.max(0,buf.length-65557);i--){if(buf.readUInt32LE(i)===0x06054b50){e=i;break;}}
 if(e<0)throw Error('Không tìm thấy bảng ZIP');
 const count=buf.readUInt16LE(e+10),off=buf.readUInt32LE(e+16);if(count>200||off>=buf.length)throw Error('Cấu trúc ZIP không được hỗ trợ');
 const entries=new Map();let p=off,total=0;
 for(let i=0;i<count;i++){
  if(buf.readUInt32LE(p)!==0x02014b50)throw Error('ZIP directory bị lỗi');
  const flags=buf.readUInt16LE(p+8),method=buf.readUInt16LE(p+10),size=buf.readUInt32LE(p+20),length=buf.readUInt32LE(p+24),nl=buf.readUInt16LE(p+28),ex=buf.readUInt16LE(p+30),co=buf.readUInt16LE(p+32),local=buf.readUInt32LE(p+42);
  const name=buf.subarray(p+46,p+46+nl).toString('utf8');p+=46+nl+ex+co;
  if(flags&1||!([0,8].includes(method))||name.startsWith('/')||name.includes('..')||name.includes('\\'))throw Error('ZIP có đường dẫn hoặc phương thức nén không hợp lệ');
  if(length>60_000_000||size>30_000_000||((total+=length)>100_000_000))throw Error('Giới hạn kích thước Excel');
  if(buf.readUInt32LE(local)!==0x04034b50)throw Error('ZIP local header bị lỗi');
  const dataOffset=local+30+buf.readUInt16LE(local+26)+buf.readUInt16LE(local+28);const part=buf.subarray(dataOffset,dataOffset+size);
  if(part.length!==size)throw Error('File ZIP không đầy đủ');
  const data=method===8?inflateRawSync(part):part;
  if(data.length!==length)throw Error('Lỗi kích thước dữ liệu ZIP');
  entries.set(name,Buffer.from(data));
 }
 return entries;
}
export function writeZip(entries){
 const parts=[],dir=[];let off=0;
 for(const [name,payload] of entries){const nb=bytes(name),b=Buffer.from(payload),c=deflateRawSync(b),crc=crc32(b);
  const l=Buffer.alloc(30);l.writeUInt32LE(0x04034b50,0);l.writeUInt16LE(20,4);l.writeUInt16LE(8,8);l.writeUInt32LE(crc,14);l.writeUInt32LE(c.length,18);l.writeUInt32LE(b.length,22);l.writeUInt16LE(nb.length,26);
  parts.push(l,nb,c);const h=Buffer.alloc(46);h.writeUInt32LE(0x02014b50,0);h.writeUInt16LE(20,4);h.writeUInt16LE(20,6);h.writeUInt16LE(8,10);h.writeUInt32LE(crc,16);h.writeUInt32LE(c.length,20);h.writeUInt32LE(b.length,24);h.writeUInt16LE(nb.length,28);h.writeUInt32LE(off,42);dir.push(h,nb);off+=l.length+nb.length+c.length;
 }
 const all=Buffer.concat(dir),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(entries.size,8);end.writeUInt16LE(entries.size,10);end.writeUInt32LE(all.length,12);end.writeUInt32LE(off,16);return Buffer.concat([...parts,all,end]);
}
function attributes(tag){const a={};for(const m of tag.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g))a[m[1]]=m[2];return a;}
export function resolveSheet(entries,name){const wb=UTF8.decode(entries.get('xl/workbook.xml')||''),rel=UTF8.decode(entries.get('xl/_rels/workbook.xml.rels')||'');if(!wb||!rel)throw Error('Không tìm thấy cấu trúc workbook');
 const sheet=[...wb.matchAll(/<(?:[\w-]+:)?sheet\s+([^>]+)\/?\s*>/g)].map(x=>attributes(x[1])).find(x=>x.name===name);if(!sheet)throw Error('Không tìm thấy sheet '+name);
 const id=sheet['r:id'];const found=[...rel.matchAll(/<(?:[\w-]+:)?Relationship\s+([^>]+)\/?\s*>/g)].map(x=>attributes(x[1])).find(x=>x.Id===id);if(!found)throw Error('Không tìm thấy liên kết worksheet');return 'xl/'+found.Target.replace(/^\/?xl\//,'').replace(/^\//,'');
}
export function sheetRows(entries,name,limit=10000){
 const path=resolveSheet(entries,name),src=UTF8.decode(entries.get(path)||'');const shared=entries.get('xl/sharedStrings.xml')?UTF8.decode(entries.get('xl/sharedStrings.xml')):'';
 const strings=[...shared.matchAll(/<(?:[\w-]+:)?si(?:\s[^>]*)?>([\s\S]*?)<\/(?:[\w-]+:)?si>/g)].map(m=>[...m[1].matchAll(/<(?:[\w-]+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:[\w-]+:)?t>/g)].map(t=>xmlUnescape(t[1])).join(''));
 const rows=[];
 for(const r of src.matchAll(/<(?:[\w-]+:)?row(?:\s[^>]*)?\s+r="(\d+)"[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?row>/g)){
  const n=Number(r[1]);if(n>limit)break;const cells={};for(const c of r[2].matchAll(/<(?:[\w-]+:)?c(?:\s[^>]*)?\s+r="([A-Z]+)\d+"([^>]*)>([\s\S]*?)<\/(?:[\w-]+:)?c>/g)){
   const typ=/\bt="([^"]+)"/.exec(c[2])?.[1],v=/<(?:[\w-]+:)?v>([\s\S]*?)<\/(?:[\w-]+:)?v>/.exec(c[3])?.[1];const inline=/<(?:[\w-]+:)?is(?:\s[^>]*)?>[\s\S]*?<(?:[\w-]+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:[\w-]+:)?t>[\s\S]*?<\/(?:[\w-]+:)?is>/.exec(c[3])?.[1];cells[c[1]]=typ==='s'?strings[Number(v)]||'':xmlUnescape(inline??v??'');
  }
  rows.push({row:n,cells});
 }
 return rows;
}
function xmlUnescape(s){return String(s).replace(/&(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);/g,m=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"}[m]??(m.startsWith('&#x')?String.fromCodePoint(parseInt(m.slice(3,-1),16)):m.startsWith('&#')?String.fromCodePoint(parseInt(m.slice(2,-1),10)):m)));}
export function patchRows(original,sheetName,keepThrough,rows){
 const entries=readZip(original),path=resolveSheet(entries,sheetName),src=UTF8.decode(entries.get(path)||'');const region=/<sheetData(?:\s[^>]*)?>([\s\S]*?)<\/sheetData>/.exec(src);if(!region)throw Error('Không tìm thấy vùng dữ liệu Excel');
 const keep=[...region[1].matchAll(/<row(?:\s[^>]*)?\s+r="(\d+)"[^>]*>[\s\S]*?<\/row>/g)].filter(x=>Number(x[1])<=keepThrough).map(x=>x[0]);if(!keep.length)throw Error('Không tìm thấy dòng tiêu đề');
 const generated=rows.map((cells,i)=>{const r=keepThrough+i+1;return `<row r="${r}">${Object.entries(cells).filter(([,v])=>v!==''&&v!=null).map(([col,v])=>{
  const ref=col+r;if(typeof v==='number')return `<c r="${ref}"><v>${v}</v></c>`;
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(v)}</t></is></c>`;
 }).join('')}</row>`;});
 let result=src.replace(region[0],`<sheetData>${keep.join('')}${generated.join('')}</sheetData>`);const last=keepThrough+rows.length;
 result=result.replace(/<dimension\s+ref="([A-Z]+\d+):([A-Z]+)\d+"\s*\/>/,(all,a,b)=>`<dimension ref="${a}1:${b}${last}"/>`);
 entries.set(path,bytes(result));return writeZip(entries);
}
