
import { blobs } from "@netlify/blobs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8"
};

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }
  const url = new URL(event.rawUrl);
  const key = url.searchParams.get("key");
  if (!key) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Missing key" }) };
  const store = blobs.store("turnos");
  try {
    if (event.httpMethod === "GET") {
      const json = await store.get(key, { type: "json" });
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(json || null) };
    } else if (event.httpMethod === "PUT") {
      const body = JSON.parse(event.body || "{}");
      if (!body || typeof body !== "object" || !("data" in body)) {
        return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Body must include { data: [...] }" }) };
      }
      await store.set(key, JSON.stringify(body), { contentType: "application/json" });
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ ok: true }) };
    } else {
      return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: "Method not allowed" }) };
    }
  } catch (err) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: String(err) }) };
  }
}
