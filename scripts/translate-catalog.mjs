import mysql from "mysql2/promise";

const baseUrl = process.env.OPENAI_API_BASE;
const apiKey = process.env.OPENAI_API_KEY;
const databaseUrl = process.env.DATABASE_URL;

if (!baseUrl || !apiKey || !databaseUrl) {
  throw new Error("Thiếu OPENAI_API_BASE, OPENAI_API_KEY hoặc DATABASE_URL.");
}

const connection = await mysql.createConnection(databaseUrl);

async function translateBatch(kind, rows) {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-5-mini",
      max_completion_tokens: 5000,
      messages: [
        {
          role: "system",
          content: "You are an expert Vietnamese-to-English e-commerce translator. Return natural, concise English for international customers. Preserve product codes, seasons, file formats, club names, and brand terms. Do not add facts, prices, HTML, markdown, or marketing claims not in the source.",
        },
        {
          role: "user",
          content: `Translate these DHL Stores ${kind}. Keep every id unchanged.\n${JSON.stringify(rows)}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "catalog_translations",
          strict: true,
          schema: {
            type: "object",
            properties: {
              translations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "integer" },
                    nameEn: { type: "string" },
                    descriptionEn: { type: "string" },
                  },
                  required: ["id", "nameEn", "descriptionEn"],
                  additionalProperties: false,
                },
              },
            },
            required: ["translations"],
            additionalProperties: false,
          },
        },
      },
    }),
  });
  if (!response.ok) throw new Error(`LLM translation failed: ${response.status} ${await response.text()}`);
  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  const parsed = JSON.parse(content);
  if (!Array.isArray(parsed.translations) || parsed.translations.length !== rows.length) {
    throw new Error(`Unexpected translation count for ${kind}.`);
  }
  return parsed.translations;
}

async function translateTable(table, kind) {
  const [rows] = await connection.execute(
    `SELECT id, name, COALESCE(description, '') AS description FROM ${table} WHERE nameEn IS NULL OR nameEn = '' ORDER BY id`,
  );
  const batches = [];
  for (let index = 0; index < rows.length; index += 12) batches.push(rows.slice(index, index + 12));
  for (const batch of batches) {
    const translations = await translateBatch(kind, batch);
    for (const item of translations) {
      await connection.execute(
        `UPDATE ${table} SET nameEn = ?, descriptionEn = ? WHERE id = ? AND (nameEn IS NULL OR nameEn = '')`,
        [item.nameEn.trim(), item.descriptionEn.trim(), item.id],
      );
    }
    console.log(`Translated ${translations.length} ${kind}.`);
  }
}

try {
  await translateTable("categories", "categories");
  await translateTable("products", "products");
} finally {
  await connection.end();
}
