# DHL Nameset Layout V8.48 — unified true-contour nesting

## Objective
Resolve the V8.47 discrepancy where `TÌM SÂU` selected together with `Cho phép vật rời` silently used `V77NestSelected` (older separate item-packing engine). In V8.48, all selected objects — complete Groups, bare curves, text outlines, and mixed selections — use the **same** `DHLDirectGroups.run()` and `DHLDeepContourSearch.optimize()` path. Existing Groups remain intact.

## Open source research and attribution
- [SVGnest](https://github.com/Jack000/SVGnest), copyright Jack Qiao, [MIT License](https://github.com/Jack000/SVGnest/blob/master/LICENSE.txt): polygon-contact candidate positions, no-fit-polygon strategy, multi-order optimization, rotation search and prioritizing fill of irregular open notches informed the heuristics.
- [libnest2d](https://github.com/tamasmeszaros/libnest2d), LGPL-3.0: reviewed, not embedded; is C++/Clipper/Boost oriented.
- [Deepnest](https://github.com/Jack000/Deepnest): reviewed, not embedded; native desktop app and optimized C engine.

**Not vendored:** No code or runtime of SVGnest, libnest2d or Deepnest is copied. The V8.48 core is an independent ES5 implementation, inspired by the publicly described algorithms. SVGnest depends on SVG/web workers and other browser facilities that cannot run directly in CorelDRAW 2021's MSHTML Docker. A full NFP/Minkowski implementation has **not** been integrated; do not describe the present heuristic as exact NFP nesting.

## Changes
1. One protected selection path: `V838_DIRECT_GROUPS.html` accepts ungrouped elements **only** if `v832AllowLoose` is explicitly enabled and the mode is `pack`; `pages` remains Group-only.
2. `V846_SIMPLE_NEST_UI.html` routes all allowed inputs via `DHLDirectGroups.run()`. It no longer falls through to older `V77NestSelected`; an unavailable unified engine yields a visible error instead.
3. `V826_TRUE_CONTOUR_NEST.html`: contact-guided candidate X and Y positions, conservative independent pairwise overlap verification, additional `small`, `slender`, `original` ordering.
4. `V845_DEEP_TRUE_CONTOUR.html`: multistart optimization with extra item orderings and angle patterns. Compares each valid candidate with rectangle baseline and only adopts an improvement.
5. Safety: closed counters, including 0/6/8/9-style enclosed regions, are treated as occupied; open pockets remain eligible. No shape is scaled, no Group is split, and spacing and unit conversion (cm UI → mm geometry) are preserved. Missing curve data defaults to a safe rectangular silhouette and is reported.

## Test observations (simulated)
- Mixed 26 shapes/Groups, 58 cm × 20 m roll, 0.5 cm spacing, auto rotation and deep mode: one frame; original units restored; 11 deep trials and 4 mm improvement **in the synthetic fixture**.
- Independent rectangles of 18 objects: old Y search ~2,283 ms vs contact-based Y search ~366 ms (roughly 6× in the same mocked JS runtime). These times are not a Corel performance guarantee.
- Closed ring example: small object cannot fit inside the ring. L-shaped open notch: 25 × 25 mm object fits within the 80 mm footprint.
- `tests/unified_mixed_v848.test.js`: 26 mixed objects, explicit opt-in, unchanged Group dimensions and closed holes.
- All 13 JavaScript regression tests pass in mocked environments.

## Production validation still needed
The connected GitHub workflow cannot execute live CorelDRAW or validate the particular CDR from the screenshot. Before production, duplicate the CDR, run all 26 objects in **TÌM SÂU**, inspect gap compliance in Corel at print scale (5 mm in the current settings), closed-hole exclusions, no overlaps, and record the used material length shown in the result. Compare with V8.47 baseline on identical geometry.

The algorithm is a best-found heuristic, not a mathematical proof of globally optimal packing.
