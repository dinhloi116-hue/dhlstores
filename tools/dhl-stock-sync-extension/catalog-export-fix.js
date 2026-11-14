(() => {
  'use strict';

  const TARGET_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
  const xlsx = globalThis.DHLXlsxLite;

  function plain(value) {
    return String(value || '').toLowerCase().replace(/đ/g,'d').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  }

  function sampleColor(sampleName) {
    const parts = String(sampleName || '').split(/\s+-\s+/).map((x) => x.trim()).filter(Boolean);
    return parts.length >= 3 ? parts[parts.length - 2] : '';
  }

  function groupRows(catalogResults, sampleSkuByParent) {
    const rows = [];
    for (const product of catalogResults || []) {
      const byColor = new Map();
      for (const variant of product.variants || []) {
        const color = String(variant.color || '(không màu)').trim();
        const key = plain(color) || '(khong mau)';
        if (!byColor.has(key)) byColor.set(key, { color, variants: [] });
        byColor.get(key).variants.push(variant);
      }
      const sample = (sampleSkuByParent || {})[String(product.parentId)] || {};
      const refColor = sampleColor(sample.name);
      if (!byColor.size) {
        rows.push({ parentId: product.parentId, parentName: product.parentName, color: '', standardName: product.parentName, sampleSku: sample.code || '', sampleColor: refColor, sampleSkuMatchesColor: false, stock: {} });
        continue;
      }
      for (const group of byColor.values()) {
        const stock = Object.create(null);
        for (const v of group.variants) stock[String(v.size || '').toUpperCase()] = Number(v.available);
        rows.push({
          parentId: product.parentId,
          parentName: product.parentName,
          color: group.color,
          standardName: group.color ? `${product.parentName} - ${group.color}` : product.parentName,
          sampleSku: sample.code || '',
          sampleColor: refColor,
          sampleSkuMatchesColor: Boolean(refColor && plain(refColor) === plain(group.color)),
          stock
        });
      }
    }
    return rows;
  }

  function xmlEscape(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function cellXml(colIndex, rowIndex, value, styleId = 0) {
    const ref = `${xlsx.indexToCol(colIndex)}${rowIndex}`;
    const style = styleId ? ` s="${styleId}"` : '';
    if (value === null || value === undefined || value === '') return `<c r="${ref}"${style}/>`;
    if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${ref}"${style}><v>${value}</v></c>`;
    const text = String(value);
    const preserve = /^\s|\s$|\n/.test(text) ? ' xml:space="preserve"' : '';
    return `<c r="${ref}" t="inlineStr"${style}><is><t${preserve}>${xmlEscape(text)}</t></is></c>`;
  }

  function makeWorkbookBytes(rows) {
    if (!xlsx || typeof xlsx.zipStore !== 'function' || typeof xlsx.indexToCol !== 'function') {
      throw new Error('Thiếu bộ tạo Excel trong extension.');
    }

    const headers = ['Parent ID', 'Tên sản phẩm nguồn', 'Màu nguồn', 'Tên chuẩn đề xuất Sapo', 'SKU mẫu nguồn', 'Màu của SKU mẫu', 'SKU mẫu đúng màu?', 'S', 'M', 'L', 'XL', 'XXL'];
    const matrix = [headers];
    for (const row of rows) {
      matrix.push([
        Number(row.parentId) || row.parentId || '',
        row.parentName,
        row.color,
        row.standardName,
        row.sampleSku,
        row.sampleColor,
        row.sampleSkuMatchesColor ? 'Có' : 'Không/chưa chắc',
        ...TARGET_SIZES.map((size) => row.stock[size] == null ? '' : Number(row.stock[size]))
      ]);
    }

    const sheetRows = matrix.map((row, ri) => {
      const r = ri + 1;
      const cells = row.map((value, ci) => cellXml(ci, r, value, ri === 0 ? 1 : 0)).join('');
      return `<row r="${r}">${cells}</row>`;
    }).join('');

    const widths = [14, 28, 20, 38, 20, 20, 20, 9, 9, 9, 9, 9];
    const cols = widths.map((width, i) => `<col min="${i + 1}" max="${i + 1}" width="${width}" customWidth="1"/>`).join('');
    const lastCol = xlsx.indexToCol(headers.length - 1);
    const lastRow = matrix.length;

    const files = new Map();
    files.set('[Content_Types].xml', new TextEncoder().encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`));

    files.set('_rels/.rels', new TextEncoder().encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`));

    files.set('xl/workbook.xml', new TextEncoder().encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Danh sách nguồn" sheetId="1" r:id="rId1"/></sheets>
</workbook>`));

    files.set('xl/_rels/workbook.xml.rels', new TextEncoder().encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`));

    files.set('xl/styles.xml', new TextEncoder().encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1F4E78"/><bgColor indexed="64"/></patternFill></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf></cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`));

    files.set('xl/worksheets/sheet1.xml', new TextEncoder().encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${lastCol}${lastRow}"/>
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <cols>${cols}</cols>
  <sheetData>${sheetRows}</sheetData>
  <autoFilter ref="A1:${lastCol}${lastRow}"/>
</worksheet>`));

    return xlsx.zipStore(files);
  }

  async function exportExcel() {
    const stored = await chrome.storage.local.get(['dhlCatalogResults', 'dhlCatalogSkuSamples']);
    const rows = groupRows(stored.dhlCatalogResults || [], stored.dhlCatalogSkuSamples || {});
    if (!rows.length) {
      alert('Chưa có dữ liệu danh sách nguồn. Hãy quét danh sách trước.');
      return;
    }

    const bytes = makeWorkbookBytes(rows);
    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const d = new Date();
    const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    a.href = url;
    a.download = `DANH_SACH_NGUON_HD_${stamp}.xlsx`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function upgradeExportButton() {
    const btn = document.getElementById('exportCatalogSource');
    if (!btn || btn.dataset.xlsxExportFixed === '1') return;

    btn.dataset.xlsxExportFixed = '1';
    btn.textContent = 'XUẤT EXCEL (.XLSX)';

    btn.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      try {
        await exportExcel();
      } catch (error) {
        alert(`Không tạo được Excel: ${error.message || String(error)}`);
      }
    }, true);
  }

  upgradeExportButton();
  const observer = new MutationObserver(upgradeExportButton);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
