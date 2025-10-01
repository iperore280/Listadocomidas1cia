import { Buffer } from "node:buffer";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8",
};

const GH_TOKEN   = process.env.GITHUB_TOKEN;
const GH_OWNER   = process.env.GITHUB_OWNER;
const GH_REPO    = process.env.GITHUB_REPO;
const GH_BRANCH  = process.env.GITHUB_BRANCH || "main";
const DATA_DIR   = (process.env.DATA_DIR || "data").replace(/^\/+|\/+$/g,"");

const API_BASE = "https://api.github.com";

async function githubGet(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Authorization": `Bearer ${GH_TOKEN}`,
      "Accept": "application/vnd.github+json",
    }
  });
  return res;
}

async function githubPutContent(path, contentBase64, sha=null) {
  const body = {
    message: `Update ${path} via Netlify function`,
    content: contentBase64,
    branch: GH_BRANCH,
  };
  if (sha) body.sha = sha;

  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${GH_TOKEN}`,
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  return res;
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  const url = new URL(event.rawUrl);
  const key = url.searchParams.get("key");
  if (!key) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing key" }) };
  }
  if (!GH_TOKEN || !GH_OWNER || !GH_REPO) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Missing GitHub env vars" }) };
  }

  const filePath = `/${DATA_DIR}/${encodeURIComponent(key)}.json`;
  const apiPath  = `/repos/${GH_OWNER}/${GH_REPO}/contents${filePath}`;

  try {
    if (event.httpMethod === "GET") {
      const res = await githubGet(apiPath + `?ref=${encodeURIComponent(GH_BRANCH)}`);
      if (res.status === 404) {
        return { statusCode: 200, headers, body: JSON.stringify(null) };
      }
      if (!res.ok) {
        const txt = await res.text();
        return { statusCode: 500, headers, body: JSON.stringify({ error: "GitHub GET failed", details: txt }) };
      }
      const json = await res.json();
      const b64 = json.content || "";
      const buf = Buffer.from(b64, "base64");
      const data = JSON.parse(buf.toString("utf-8") || "null");
      return { statusCode: 200, headers, body: JSON.stringify(data) };

    } else if (event.httpMethod === "PUT") {
      let currentSha = null;
      const headRes = await githubGet(apiPath + `?ref=${encodeURIComponent(GH_BRANCH)}`);
      if (headRes.ok) {
        const j = await headRes.json();
        currentSha = j.sha;
      }
      const body = JSON.parse(event.body || "{}");
      if (!body || typeof body !== "object" || !("data" in body)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Body must include { data: [...] }" }) };
      }
      const payload = JSON.stringify(body);
      const b64 = Buffer.from(payload, "utf-8").toString("base64");

      const putRes = await githubPutContent(apiPath, b64, currentSha);
      if (!putRes.ok) {
        const txt = await putRes.text();
        return { statusCode: 500, headers, body: JSON.stringify({ error: "GitHub PUT failed", details: txt }) };
      }
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };

    } else {
      return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
    }
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: String(err) }) };
  }
}
