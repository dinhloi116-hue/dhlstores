import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");
const library = readFileSync(new URL("../client/src/pages/ToolsLibrary.tsx", import.meta.url), "utf8");
const maker = readFileSync(new URL("../client/src/pages/NotebookLabelMaker.tsx", import.meta.url), "utf8");

describe("notebook label maker", () => {
  it("is registered as an internal DHL Stores tool", () => {
    expect(app).toContain("/tools/notebook-labels");
    expect(app).toContain("NotebookLabelMaker");
    expect(library).toContain("TẠO NHÃN VỞ ONLINE");
    expect(library).toContain("/tools/notebook-labels");
  });

  it("supports single-label editing, Excel batch input and PDF export", () => {
    expect(maker).toContain("XLSX.read");
    expect(maker).toContain("sheet_to_json");
    expect(maker).toContain("jsPDF");
    expect(maker).toContain("pdf.save");
    expect(maker).toContain("Tối đa 240 nhãn");
    expect(maker).toContain("Dữ liệu chỉ được xử lý trong trình duyệt");
  });
});
