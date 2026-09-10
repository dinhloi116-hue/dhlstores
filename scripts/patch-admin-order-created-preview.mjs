import fs from "node:fs";
import path from "node:path";

const target = path.resolve("client/src/pages/AdminOrders.tsx");
let source = fs.readFileSync(target, "utf8");
const marker = "AdminOrderCreatedPanel";

if (source.includes(`import ${marker} from`)) {
  console.log("[admin-order-preview] already applied");
  process.exit(0);
}

function replaceOnce(anchor, replacement, label) {
  if (!source.includes(anchor)) {
    throw new Error(`[admin-order-preview] anchor not found: ${label}`);
  }
  source = source.replace(anchor, replacement);
}

replaceOnce(
  'import CustomerAddressBook from "@/components/CustomerAddressBook";\n',
  'import CustomerAddressBook from "@/components/CustomerAddressBook";\nimport AdminOrderCreatedPanel from "@/components/AdminOrderCreatedPanel";\n',
  "component import",
);

replaceOnce(
  '  const [adminOrderAddressMode, setAdminOrderAddressMode] = useState<"saved" | "new">("saved");\n',
  '  const [adminOrderAddressMode, setAdminOrderAddressMode] = useState<"saved" | "new">("saved");\n  const [lastCreatedOrderCode, setLastCreatedOrderCode] = useState<string | null>(null);\n',
  "created-order state",
);

replaceOnce(
  '      toast.success(`Đã tạo đơn #${result.orderCode} và trừ tồn kho theo SKU`);\n',
  '      toast.success(`Đã tạo đơn #${result.orderCode} và trừ tồn kho theo SKU`);\n      setLastCreatedOrderCode(result.orderCode);\n      setOrderSearch("");\n      setOrderStatusFilter("all");\n      window.setTimeout(() => document.getElementById("admin-order-created")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);\n',
  "create-order success handler",
);

const listAnchor = '            <div className="divide-y divide-slate-100">{filteredAdminOrders.map(order => {';
replaceOnce(
  listAnchor,
  '            {lastCreatedOrderCode && <AdminOrderCreatedPanel orderCode={lastCreatedOrderCode} order={orders.find(order => order.orderCode === lastCreatedOrderCode)} products={products} onPrint={printOrderInvoice} onClose={() => setLastCreatedOrderCode(null)} />}\n' + listAnchor,
  "orders list",
);

fs.writeFileSync(target, source);
console.log("[admin-order-preview] applied successfully");
