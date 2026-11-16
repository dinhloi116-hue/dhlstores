(() => {
  'use strict';

  const matcher = globalThis.DHLMatchCore;
  const rules = globalThis.DHLShopRules;
  if (!matcher || !rules) return;

  function sourceName(group) {
    const parent = String((group && group.parentName) || '').trim();
    const color = String((group && group.color) || '').trim();
    if (!color || /^\(không màu\)$/i.test(color)) return parent;

    // Nếu tên cha đã kết thúc bằng đúng màu thì không nối màu lần hai.
    const parentKey = rules.plain(parent);
    const colorKey = rules.plain(color);
    if (parentKey === colorKey || parentKey.endsWith(` ${colorKey}`)) return parent;
    return `${parent} - ${color}`;
  }

  function buildVariantMatches(product, group) {
    return (product.variants || []).map((sv) => {
      const size = matcher.normalizeSize(sv.size || sv.sizeFromSku);
      const candidates = (group.variants || []).filter((v) => matcher.normalizeSize(v.size) === size);
      return {
        sapo: sv,
        source: candidates.length === 1 ? candidates[0] : null,
        reason: candidates.length === 1 ? 'exact-name-exact-size' : 'size-missing-or-duplicate'
      };
    });
  }

  matcher.matchSapoProducts = function matchByExactNameOnly(sapoProducts, sourceResults) {
    const groups = matcher.groupSourceVariants(sourceResults || []);
    const byName = new Map();

    for (const group of groups) {
      const displayName = sourceName(group);
      const key = rules.plain(displayName);
      if (!key) continue;
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key).push({ ...group, exactDisplayName: displayName });
    }

    return (sapoProducts || []).map((product) => {
      const productName = String((product && product.name) || '').trim();
      const key = rules.plain(productName);
      const candidates = key ? (byName.get(key) || []) : [];
      const bestGroup = candidates.length === 1 ? candidates[0] : null;
      const variantMatches = bestGroup ? buildVariantMatches(product, bestGroup) : [];
      const complete = Boolean(bestGroup && variantMatches.length && variantMatches.every((x) => x.source));

      return {
        sapoProduct: product,
        matched: Boolean(bestGroup),
        best: bestGroup ? { ...bestGroup, score: 1 } : null,
        second: null,
        margin: bestGroup ? 1 : 0,
        variantMatches,
        complete,
        linkMethod: bestGroup ? 'tên chính xác + size chính xác' : 'bỏ qua: tên không trùng chính xác'
      };
    });
  };

  // Hints chỉ để scanner tối ưu nếu nhận ra đội/màu. Không có hint vẫn quét danh mục bình thường.
  matcher.buildScanHints = function buildExactNameHints(products) {
    const byTeam = new Map();
    for (const product of products || []) {
      const name = String(product.name || '').trim();
      const team = matcher.teamOf(name);
      if (!team) continue;
      const parts = name.split(/\s+-\s+/).map((x) => x.trim()).filter(Boolean);
      const color = parts.length >= 2 ? parts[parts.length - 1] : '';
      if (!byTeam.has(team)) byTeam.set(team, { team, products: [], colors: [] });
      const sizes = [...new Set((product.variants || []).map((v) => matcher.normalizeSize(v.size || v.sizeFromSku)).filter(Boolean))];
      byTeam.get(team).products.push({
        productId: product.productId,
        name,
        skuBase: product.skuBase || '',
        colorHint: color,
        sizes
      });
      if (color && !byTeam.get(team).colors.includes(color)) byTeam.get(team).colors.push(color);
    }
    return [...byTeam.values()];
  };

  globalThis.__DHL_EXACT_NAME_MODE__ = true;
})();
