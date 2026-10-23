// Browser-compatible dependency-free OOXML writer. Stores ZIP entries without compression.
// For general product/SEO/price reports only. Platform importer templates MUST use backend.
const encoder=new TextEncoder();
const xml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const crctable=Array.from({length:256},(_,x)=>{for(let i=0;i<8;i++)x=x&1?(0xedb88320^(x>>>1)):(x>>>1);return x>>>0;});
function crc32(b){let c=0xffffffff;for(const n of b)c=crctable[(c^n)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
function makeZip(entries){
  const items=[],central=[];let offset=0;
  for(const [name,content] of entries){const nameBytes=encoder.encode(name),payload=encoder.encode(content),crc=crc32(payload);
    const header=new Uint8Array(30+nameBytes.length),dv=new DataView(header.buffer);dv.setUint32(0,0x04034b50,true);dv.setUint16(4,20,true);dv.setUint32(14,crc,true);dv.setUint32(18,payload.length,true);dv.setUint32(22,payload.length,true);dv.setUint16(26,nameBytes.length,true);header.set(nameBytes,30);
    const c=new Uint8Array(46+nameBytes.length),d=new DataView(c.buffer);d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint32(16,crc,true);d.setUint32(20,payload.length,true);d.setUint32(24,payload.length,true);d.setUint16(28,nameBytes.length,true);d.setUint32(42,offset,true);c.set(nameBytes,46);
    items.push(header,payload);central.push(c);offset+=header.length+payload.length;
  }
  const dirLength=central.reduce((n,x)=>n+x.length,0),footer=new Uint8Array(22),d=new DataView(footer.buffer);d.setUint32(0,0x06054b50,true);d.setUint16(8,entries.length,true);d.setUint16(10,entries.length,true);d.setUint32(12,dirLength,true);d.setUint32(16,offset,true);
  const result=new Uint8Array(offset+dirLength+22);let at=0;for(const b of [...items,...central,footer]){result.set(b,at);at+=b.length;}return result;
}
const col=n=>{let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
function sheet(rows){const xmlrows=rows.map((cells,ri)=>`<row r="${ri+1}">${cells.map((v,ci)=>{
  if(v===null||v===undefined||v==='')return '';const addr=col(ci)+(ri+1),style=ri===0?' s="1"':'';
  if(typeof v==='number'&&Number.isFinite(v))return `<c r="${addr}"${style}><v>${v}</v></c>`;
  return `<c r="${addr}"${style} t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`;
}).join('')}</row>`).join('');
return `<?xml version="1.0" encoding="utf-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultColWidth="23"/><sheetData>${xmlrows}</sheetData></worksheet>`;}
export function makeWorkbook(sheets){
  if(!Array.isArray(sheets)||!sheets.length||sheets.length>8)throw Error('Số sheet không hợp lệ.');const known=new Set();
  for(const s of sheets){if(!s.name||s.name.length>31||/[\\/*?:\[\]]/.test(s.name)||known.has(s.name))throw Error('Tên sheet không hợp lệ.');known.add(s.name);}
  const NS='http://schemas.openxmlformats.org/';
  const types=`<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`;
  const book=`<?xml version="1.0"?><workbook xmlns="${NS}spreadsheetml/2006/main" xmlns:r="${NS}officeDocument/2006/relationships"><sheets>${sheets.map((s,i)=>`<sheet name="${xml(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets><calcPr fullCalcOnLoad="1"/></workbook>`;
  const relations=`<?xml version="1.0"?><Relationships xmlns="${NS}package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="${NS}officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length+1}" Type="${NS}officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  const style=`<?xml version="1.0"?><styleSheet xmlns="${NS}spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Aptos"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF173B54"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>`;
  return makeZip([['[Content_Types].xml',types],['_rels/.rels',`<?xml version="1.0"?><Relationships xmlns="${NS}package/2006/relationships"><Relationship Id="rId1" Type="${NS}officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],['xl/workbook.xml',book],['xl/_rels/workbook.xml.rels',relations],['xl/styles.xml',style],...sheets.map((s,i)=>[`xl/worksheets/sheet${i+1}.xml`,sheet(s.rows)])]);
}
