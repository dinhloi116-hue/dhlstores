(() => {
  'use strict';

  const base = globalThis.DHLXlsxLite;
  if (!base) return;

  const PROTECTED_HEADERS = [
    'Đường dẫn/Alias',
    'Tên sản phẩm*',
    'Mã SKU',
    'Barcode',
    'Ảnh đại diện',
    'Ảnh phiên bản',
    'Giá',
    'Giá so sánh',
    'Giá vốn',
    'Id phiên bản'
  ];

  const INHERIT_HEADERS = new Set([
    'Đường dẫn/Alias',
    'Tên sản phẩm*',
    'Mô tả sản phẩm',
    'Nhãn hiệu',
    'Loại sản phẩm',
    'Nhóm ngành nghề tính thuế GTGT, TNCN',
    'Tags',
    'Yêu cầu vận chuyển',
    'Thuộc tính 1',
    'Thuộc tính 2',
    'Thuộc tính 3',
    'Áp dụng thuế',
    'Đơn vị tính',
    'Mô tả ngắn',
    'Quản lý kho',
    'Đơn vị khối lượng',
    'Cho phép tiếp tục mua khi hết hàng'
  ]);

  const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;

  function encode(text) {
    if (encoder) return encoder.encode(String(text));
    return new Uint8Array(Buffer.from(String(text), 'utf8'));
  }

  function xmlEscape(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function cellXml(colIndex, rowIndex, value) {
    const ref = `${base.indexToCol(colIndex)}${rowIndex}`;
    if (value == null || value === '') return '';
    if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${ref}"><v>${value}</v></c>`;
    if (typeof value === 'boolean') return `<c r="${ref}" t="b"><v>${value ? 1 : 0}</v></c>`;
    const text = String(value);
    const preserve = /^\s|\s$|\n/.test(text) ? ' xml:space="preserve"' : '';
    return `<c r="${ref}" t="inlineStr"><is><t${preserve}>${xmlEscape(text)}</t></is></c>`;
  }

  function isBlank(value) {
    return value == null || value === '';
  }

  function sameValue(a, b) {
    return String(a == null ? '' : a) === String(b == null ? '' : b);
  }

  function resolveInventoryHeader(headerMap) {
    return Object.keys(headerMap).find((key) => /_Tồn kho$/i.test(key) || /Tồn kho/i.test(key));
  }

  function productMap(sapoExport) {
    const map = new Map();
    for (const product of sapoExport.products || []) map.set(String(product.productId), product);
    return map;
  }

  function valueFromExport(header, variant, firstVariant, exportHeaderMap) {
    const col = exportHeaderMap[header];
    if (col == null) return '';
    const current = variant.raw ? variant.raw[col] : '';
    if (!isBlank(current)) return current;
    if (INHERIT_HEADERS.has(header) && firstVariant && firstVariant.raw) {
      const inherited = firstVariant.raw[col];
      if (!isBlank(inherited)) return inherited;
    }
    return '';
  }

  async function buildSapoImportPreserving(templateBuffer, sapoExport, inventoryByVariantId) {
    const book = await base.readFirstSheet(templateBuffer);
    const templateRows = book.rows || [];
    const templateHeaders = templateRows[0] || [];
    const templateMap = base.headerMap(templateHeaders);
    const inventoryHeader = resolveInventoryHeader(templateMap);
    if (!inventoryHeader) throw new Error('Mẫu nhập Sapo không có cột Tồn kho');
    if (templateMap['Id phiên bản'] == null) throw new Error('Mẫu nhập Sapo thiếu cột Id phiên bản');

    const exportRows = sapoExport.rows || [];
    const exportMap = sapoExport.headerMap || base.headerMap(exportRows[0] || []);
    if (exportMap['Id phiên bản'] == null) throw new Error('File xuất Sapo thiếu Id phiên bản');

    const products = productMap(sapoExport);
    const selected = [];
    const seenIds = new Set();

    for (const variant of sapoExport.variants || []) {
      const key = String(variant.variantId);
      if (!Object.prototype.hasOwnProperty.call(inventoryByVariantId, key)) continue;
      if (seenIds.has(key)) throw new Error(`Id phiên bản ${key} bị trùng trong file xuất Sapo`);
      const stock = Number(inventoryByVariantId[key]);
      if (!Number.isFinite(stock) || stock < 0) throw new Error(`Tồn kho không hợp lệ cho Id phiên bản ${key}`);
      seenIds.add(key);
      selected.push({ variant, stock });
    }

    if (!selected.length) throw new Error('Không có biến thể nào đủ điều kiện tạo file nhập');

    const outputRows = [];
    const selectedProductIds = new Set();

    for (const { variant, stock } of selected) {
      const product = products.get(String(variant.productId));
      const firstVariant = product && product.variants && product.variants.length ? product.variants[0] : variant;
      const out = new Array(templateHeaders.length).fill('');

      for (let colIndex = 0; colIndex < templateHeaders.length; colIndex += 1) {
        const header = templateHeaders[colIndex];
        if (!header) continue;
        out[colIndex] = valueFromExport(header, variant, firstVariant, exportMap);
      }

      if (templateMap['Tên sản phẩm*'] != null && isBlank(out[templateMap['Tên sản phẩm*']])) {
        out[templateMap['Tên sản phẩm*']] = variant.name || (product && product.name) || '';
      }

      for (let index = 1; index <= 3; index += 1) {
        const labelHeader = `Thuộc tính ${index}`;
        const valueHeader = `Giá trị thuộc tính ${index}`;
        if (templateMap[labelHeader] != null && isBlank(out[templateMap[labelHeader]])) {
          out[templateMap[labelHeader]] = valueFromExport(labelHeader, firstVariant, firstVariant, exportMap);
        }
        if (templateMap[valueHeader] != null && isBlank(out[templateMap[valueHeader]])) {
          out[templateMap[valueHeader]] = valueFromExport(valueHeader, variant, null, exportMap);
        }
      }

      out[templateMap[inventoryHeader]] = stock;
      out[templateMap['Id phiên bản']] = variant.variantId;

      for (const header of PROTECTED_HEADERS) {
        if (templateMap[header] == null || exportMap[header] == null) continue;
        let expected = valueFromExport(header, variant, firstVariant, exportMap);
        if (header === 'Tên sản phẩm*' && isBlank(expected)) expected = variant.name || (product && product.name) || '';
        if (header === 'Id phiên bản') expected = variant.variantId;
        if (!sameValue(out[templateMap[header]], expected)) {
          throw new Error(`Chặn xuất file: trường "${header}" bị thay đổi ngoài ý muốn ở Id phiên bản ${variant.variantId}.`);
        }
      }

      outputRows.push(out);
      selectedProductIds.add(String(variant.productId));
    }

    const original = book.xml;
    const sheetDataMatch = original.match(/<sheetData\b[^>]*>[\s\S]*?<\/sheetData>/);
    if (!sheetDataMatch) throw new Error('Mẫu nhập Sapo có cấu trúc sheet không hỗ trợ');
    const row1Match = sheetDataMatch[0].match(/<row\b[^>]*r="1"[^>]*>[\s\S]*?<\/row>/);
    if (!row1Match) throw new Error('Mẫu nhập Sapo thiếu hàng tiêu đề');

    const generated = outputRows.map((row, index) => {
      const rowIndex = index + 2;
      const cells = row.map((value, colIndex) => cellXml(colIndex, rowIndex, value)).join('');
      return `<row r="${rowIndex}">${cells}</row>`;
    }).join('');

    let newXml = original.replace(sheetDataMatch[0], `<sheetData>${row1Match[0]}${generated}</sheetData>`);
    const lastCol = base.indexToCol((templateHeaders.length || 1) - 1);
    newXml = newXml.replace(/<dimension\b[^>]*ref="[^"]+"\s*\/>/, `<dimension ref="A1:${lastCol}${outputRows.length + 1}"/>`);
    book.files.set(book.sheetPath, encode(newXml));

    return {
      bytes: base.zipStore(book.files),
      rows: outputRows.length,
      inventoryHeader,
      protectedHeaders: PROTECTED_HEADERS.slice(),
      productCount: selectedProductIds.size,
      variantCount: outputRows.length,
      skippedVariantCount: Math.max(0, (sapoExport.variants || []).length - outputRows.length)
    };
  }

  base.buildSapoImport = buildSapoImportPreserving;
  base.PROTECTED_HEADERS = PROTECTED_HEADERS.slice();
})();
