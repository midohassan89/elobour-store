import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("C:/Users/mido/Desktop/ERP/prisma/dev.db");
const phones = ["01011111111", "01111111111"];
for (const phone of phones) {
  const row = db.prepare("SELECT id, name FROM Customer WHERE phone = ?").get(phone);
  if (!row) {
    console.log(phone, "absent");
    continue;
  }
  const orders = db.prepare('SELECT COUNT(*) AS n FROM "Order" WHERE customerId = ?').get(row.id).n;
  if (orders !== 0) {
    throw new Error("refusing to delete a customer with orders");
  }
  db.prepare("DELETE FROM Customer WHERE id = ? AND phone = ?").run(row.id, phone);
  console.log(phone, "deleted", row.name);
}
