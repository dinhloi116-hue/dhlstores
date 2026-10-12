// Minimal dependency-free OOXML writer for editable .xlsx workbooks.
import { deflateRawSync } from 'node:zlib';
const enc = new TextEncoder();
const escapeXml = v => String(v ?? '').replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
const crcTable = Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++) n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
const crc32 = bytes => {let crc=0xffffffff; for(const n of bytes) crc=crcTable[(crc^n)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;};
function zip(entries){
 let offset=0;const local=[],central=[];
 for(const [name,contents] of entries){const nb=enc.encode(name), data=typeof contents==='string'?enc.encode(contents):contents, compressed=deflateRawSync(data), checksum=crc32(data);
  const lh=Buffer.alloc(30);lh.writeUInt32LE(0x04034b50,0);lh.writeUInt16LE(20,4);lh.writeUInt16LE(0,6);lh.writeUInt16LE(8,8);lh.writeUInt32LE(checksum,14);lh.writeUInt32LE(compressed.length,18);lh.writeUInt32LE(data.length,22);lh.writeUInt16LE(nb.length,26);
  local.push(lh,nb,compressed);
  const ch=Buffer.alloc(46);ch.writeUInt32LE(0x02014b50,0);ch.writeUInt16LE(20,4);ch.writeUInt16LE(20,6);ch.writeUInt16LE(0,8);ch.writeUInt16LE(8,10);ch.writeUInt32LE(checksum,16);ch.writeUInt32LE(compressed.length,20);ch.writeUInt32LE(data.length,24);ch.writeUInt16LE(nb.length,28);ch.writeUInt32LE(offset,42);central.push(ch,nb);
  offset+=lh.length+nb.length+compressed.length;
 }
 const dir=Buffer.concat(central),e=Buffer.alloc(22);e.writeUInt32LE(0x06054b50,0);e.writeUInt16LE(entries.length,8);e.writeUInt16LE(entries.length,10);e.writeUInt32LE(dir.length,12);e.writeUInt32LE(offset,16);return Buffer.concat([...local,dir,e]);
}
const colName=n=>{let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
function sheetXml(sheet){
 const {rows=[],widths=[]}=sheet;
 const columns=widths.length?`<cols>${widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${Number(w)||24}" customWidth="1"/>`).join('')}</cols>`:'';
 const data=rows.map((cells,r)=>{
  let body=cells.map((v,c)=>{if(v===undefined||v===null||v==='')return '';const ref=colName(c)+(r+1), style=r===0?1:(r%2===0?2:0);
    if(typeof v==='object'&&v&&typeof v.f==='string')return `<c r="${ref}" s="${style}"><f>${escapeXml(v.f)}</f></c>`;
    if(typeof v==='number'&&Number.isFinite(v))return `<c r="${ref}" s="${style}"><v>${v}</v></c>`;
    return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(v)}</t></is></c>`;
   }).join('');return `<row r="${r+1}">${body}</row>`;
 }).join('');
 return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>${columns}<sheetData>${data}</sheetData></worksheet>`;
}
export function writeXlsx(sheets){
 if(!Array.isArray(sheets)||!sheets.length||sheets.length>12)throw Error('Số sheet không hợp lệ');
 const names=new Set();for(const s of sheets){if(!s.name||s.name.length>31||/[\\/*?:\[\]]/.test(s.name)||names.has(s.name))throw Error('Tên sheet không hợp lệ');names.add(s.name);}
 const contentTypes=`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`;
 const wb=`<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s,i)=>`<sheet name="${escapeXml(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`;
 const rels=`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
 const styles=`<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><color rgb="FF1F2937"/><name val="Aptos"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF153A54"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF0F5FA"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1"/><xf numFmtId="0" fontId="0" fillId="3" borderId="0" xfId="0" applyFill="1"/></cellXfs></styleSheet>`;
 const entries=[['[Content_Types].xml',contentTypes],['_rels/.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],['xl/workbook.xml',wb],['xl/_rels/workbook.xml.rels',rels],['xl/styles.xml',styles],...sheets.map((s,i)=>[`xl/worksheets/sheet${i+1}.xml`,sheetXml(s)])];
 return zip(entries);
}
