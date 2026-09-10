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
    'Mô tả sản phẩm',
    'Mô tả ngắn',
    'Nhãn hiệu',
    'Loại sản phẩm',
    'Tags',
    'Thuộc tính 1',
    'Giá trị thuộc tính 1',
    'Thuộc tính 2',
    'Giá trị thuộc tính 2',
    'Thuộc tính 3',
    'Giá trị thuộc tính 3',
    'Id phiên bản'
  ];

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

  function sameValue(a, b) {
    return String(a == null ? '' : a) === String(b == null ? '' : b);
  }

  function resolveInventoryHeader(headerMap) {
    return Object.keys(headerMap).find((key) => /_Tồn kho$/i.test(key) || /Tồn kho/i.test(key));
  }

  async function buildSapoImportPreserving(templateBuffer, sapoExport, inventoryByVariantId) {
    const book = await base.readFirstSheet(templateBuffer);
    const templateRows = book.rows || [];
    const templateHeaders = templateRows[0] || [];
    const th = base.headerMap(templateHeaders);
    const invHeader = resolveInventoryHeader(th);
    if (!invHeader) throw new Error('Mẫu nhập Sapo không có cột Tồn kho');
    if (th['Id phiên bản'] == null) throw new Error('Mẫu nhập Sapo thiếu cột Id phiên bản');

    const exportRows = sapoExport.rows || [];
    const eh = sapoExport.headerMap || base.headerMap(exportRows[0] || []);
    const aliasCol = eh['Đường dẫn/Alias'];
    const productIdCol = eh['Id sản phẩm'];
    const variantIdCol = eh['Id phiên bản'];
    if (variantIdCol == null) throw new Error('File xuất Sapo thiếu Id phiên bản');

    const allowedProductIds = new Set();
    const allowedAliases = new Set();
    for (const variant of sapoExport.variants || []) {
      const key = String(variant.variantId);
      if (!Object.prototype.hasOwnProperty.call(inventoryByVariantId, key)) continue;
      allowedProductIds.add(String(variant.productId));
      if (aliasCol != null && variant.raw && variant.raw[aliasCol]) allowedAliases.add(String(variant.raw[aliasCol]));
    }
    if (!allowedProductIds.size && !allowedAliases.size) throw new Error('Không có sản phẩm nào đủ điều kiện tạo file nhập');

    // Không cho tạo file nếu chỉ ghép được một phần biến thể của một sản phẩm.
    for (const product of sapoExport.products || []) {
      if (!allowedProductIds.has(String(product.productId))) continue;
      const missing = (product.variants || []).filter((variant) => !Object.prototype.hasOwnProperty.call(inventoryByVariantId, String(variant.variantId)));
      if (missing.length) throw new Error(`Sản phẩm "${product.name}" chưa ghép đủ size; dừng tạo file để tránh ghi đè sai.`);
    }

    const outputRows = [];
    const sourceRows = [];
    let currentProductId = '';
    let currentAlias = '';

    for (let ri = 1; ri < exportRows.length; ri += 1) {
      const source = exportRows[ri] || [];
      if (productIdCol != null && source[productIdCol] != null && source[productIdCol] !== '') currentProductId = String(source[productIdCol]);
      if (aliasCol != null && source[aliasCol]) currentAlias = String(source[aliasCol]);

      const include = allowedProductIds.has(currentProductId) || (currentAlias && allowedAliases.has(currentAlias));
      if (!include) continue;

      const out = new Array(templateHeaders.length).fill('');
      for (let ci = 0; ci < templateHeaders.length; ci += 1) {
        const header = templateHeaders[ci];
        if (header && eh[header] != null) out[ci] = source[eh[header]] ?? '';
      }

      const variantId = source[variantIdCol];
      if (variantId != null && variantId !== '') {
        const key = String(variantId);
        if (!Object.prototype.hasOwnProperty.call(inventoryByVariantId, key)) {
          throw new Error(`Biến thể ${variantId} thuộc sản phẩm đang ghi nhưng chưa có tồn nguồn; dừng để tránh ghi đè một phần.`);
        }
        out[th[invHeader]] = Number(inventoryByVariantId[key]);
        out[th['Id phiên bản']] = variantId;
      }

      // Kiểm tra các trường quan trọng phải giống file xuất Sapo trước khi đóng file.
      for (const header of PROTECTED_HEADERS) {
        if (th[header] == null || eh[header] == null) continue;
        if (!sameValue(out[th[header]], source[eh[header]])) {
          throw new Error(`Chặn xuất file: trường "${header}" bị thay đổi ngoài ý muốn.`);
        }
      }

      outputRows.push(out);
      sourceRows.push(source);
    }

    if (!outputRows.length) throw new Error('Không có dòng nào đủ điều kiện tạo file nhập');

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
      inventoryHeader: invHeader,
      protectedHeaders: PROTECTED_HEADERS.slice(),
      productCount: allowedProductIds.size
    };
  }

  base.buildSapoImport = buildSapoImportPreserving;
  base.PROTECTED_HEADERS = PROTECTED_HEADERS.slice();
})();
