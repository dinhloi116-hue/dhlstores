// Local source-document extraction; no remote servers or third-party scripts.
// Basic OOXML text/cell extraction; formulas are never evaluated.
const DOC_MAX_BYTES=5_000_000;
const OUTPUT_MAX=16000;
const utf8=new TextDecoder('utf-8',{fatal:false});
function u16(a,i){return a[i]|(a[i+1]<<8)}
function u32(a,i){return (a[i]|(a[i+1]<<8)|(a[i+2]<<16)|(a[i+3]<<24))>>>0}
async function unzipSelected(bytes,wanted){
  let eocd=-1;
  for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(u32(bytes,i)===0x06054b50){eocd=i;break}
  if(eocd<0)throw Error('Tệp Office không đúng cấu trúc ZIP.');
  const total=u16(bytes,eocd+10),start=u32(bytes,eocd+16);let pos=start;
  const entries=new Map();
  for(let i=0;i<total;i++){
    if(u32(bytes,pos)!==0x02014b50)throw Error('Tài liệu Office có danh mục lỗi.');
    const method=u16(bytes,pos+10),compressed=u32(bytes,pos+20),uncompressed=u32(bytes,pos+24);
    const nlen=u16(bytes,pos+28),xlen=u16(bytes,pos+30),clen=u16(bytes,pos+32),offset=u32(bytes,pos+42);
    const name=utf8.decode(bytes.subarray(pos+46,pos+46+nlen));pos+=46+nlen+xlen+clen;
    if(wanted(name))entries.set(name,{method,compressed,uncompressed,offset});
  }
  let used=0;const out=new Map();
  for(const [name,e] of entries){
    if(e.uncompressed>2_000_000||used+e.uncompressed>6_000_000)throw Error('Tài liệu Office có quá nhiều dữ liệu.');
    const p=e.offset;if(u32(bytes,p)!==0x04034b50)throw Error('Tệp Office hỏng.');
    const nlen=u16(bytes,p+26),xlen=u16(bytes,p+28),offset=p+30+nlen+xlen;
    const data=bytes.subarray(offset,offset+e.compressed);
    let result;
    if(e.method===0)result=data;
    else if(e.method===8){const stream=new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));result=new Uint8Array(await new Response(stream).arrayBuffer());}
    else throw Error('Định dạng nén Office chưa hỗ trợ.');
    if(result.length>2_000_000)throw Error('Một phần tài liệu quá lớn.');
    used+=result.length;out.set(name,utf8.decode(result));
  }
  return out;
}
function decodeEntities(s){return s.replace(/&#(?:x([\da-f]+)|(\d+));|&(?:amp|lt|gt|quot|apos);/gi,(m,h,d)=>{
  if(h||d){const n=parseInt(h||d,h?16:10);return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';}
  return ({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"})[m.toLowerCase()]||m;
});}
function xmlPlain(xml){return decodeEntities(xml.replace(/<\/?(?:w:p|p|row|si|c)(?=\s|>)[^>]*>/g,'\n').replace(/<w:tab\s*\/>/g,'\t').replace(/<[^>]*>/g,'')).replace(/\n{3,}/g,'\n\n').trim()}
async function parseOffice(bytes,ext){
  if(ext==='docx'){
    const files=await unzipSelected(bytes,name=>name==='word/document.xml');
    const xml=files.get('word/document.xml');if(!xml)throw Error('Không tìm thấy nội dung DOCX.');
    return xmlPlain(xml);
  }
  const files=await unzipSelected(bytes,name=>name==='xl/sharedStrings.xml'||/^xl\/worksheets\/sheet\d+\.xml$/.test(name));
  const shared=files.get('xl/sharedStrings.xml')||'';
  const items=[...shared.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)].map(m=>xmlPlain(m[1]).replace(/\s+/g,' ').trim());
  const sheets=[...files.keys()].filter(x=>/^xl\/worksheets\/sheet\d+\.xml$/.test(x)).sort((a,b)=>Number(a.match(/\d+/)?.[0])-Number(b.match(/\d+/)?.[0])).slice(0,5);
  if(!sheets.length)throw Error('Không tìm thấy bảng tính XLSX.');
  const out=[];
  for(const s of sheets){
    out.push('Bảng tính '+s.split('/').pop()+':');
    const xml=files.get(s);let count=0;
    for(const row of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)){
      const cells=[];
      for(const m of row[1].matchAll(/<c\b([^>]*?)(?:\/\>|>([\s\S]*?)<\/c>)/g)){
        const attrs=m[1],body=m[2]||'',ref=/\br="([^"]+)"/.exec(attrs)?.[1]||'';
        const val=/<v>([\s\S]*?)<\/v>/.exec(body)?.[1]||'';
        const type=/\bt="([^"]+)"/.exec(attrs)?.[1]||'';
        const value=type==='s'?items[Number(val)]||'':type==='inlineStr'?xmlPlain(body):decodeEntities(val);
        if(value.trim())cells.push(ref+': '+value.trim());
      }
      if(cells.length){out.push(cells.join(' | '));count++}
      if(count>150||out.join('\n').length>OUTPUT_MAX)break;
    }
  }
  return out.join('\n');
}
export async function readSourceDocument(file){
  const name=String(file?.name||'');const ext=name.toLowerCase().split('.').pop();
  if(!['txt','md','csv','json','html','docx','xlsx'].includes(ext))throw Error('Chưa hỗ trợ đọc '+name+'. Chỉ hỗ trợ TXT, MD, CSV, JSON, HTML, DOCX, XLSX.');
  if(file.size>DOC_MAX_BYTES)throw Error('Tài liệu '+name+' vượt quá 5 MB.');
  const bytes=new Uint8Array(await file.arrayBuffer());
  const raw=(ext==='docx'||ext==='xlsx')?await parseOffice(bytes,ext):utf8.decode(bytes);
  const excerpt=raw.replace(/\u0000/g,'').slice(0,OUTPUT_MAX);
  return {name,text:excerpt,truncated:raw.length>OUTPUT_MAX};
}
