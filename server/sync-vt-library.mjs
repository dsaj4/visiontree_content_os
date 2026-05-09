import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("data/content-system.sqlite");
const skill = "C:/Users/Administrator/.codex/skills/ima-skill/ima_api.cjs";
const knowledgeBaseId = "7yxWHdharM-5Tt0aJGatkaEdYgqtUMB9Rh5yfsWVgcI=";
const vtLibraryName = "\u0056\u0054\u7d20\u6750\u5e93";
const owner = "\u8fdc\u53e4\u5927\u80d6\u4e01";
const updated = "2026-05-08";
const assetRoot = join("public", "vt-assets");
const fileDir = join(assetRoot, "files");
const noteDir = join(assetRoot, "notes");

const opts = JSON.stringify({
  clientId: readFileSync(`${process.env.USERPROFILE}/.config/ima/client_id`, "utf8").trim(),
  apiKey: readFileSync(`${process.env.USERPROFILE}/.config/ima/api_key`, "utf8").trim()
});

const json = (value) => JSON.stringify(value);

function ima(path, body) {
  const result = spawnSync(process.execPath, [skill, path, JSON.stringify(body), opts], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `IMA call failed: ${path}`);
  }
  const response = JSON.parse(result.stdout);
  if (response.code !== 0) {
    throw new Error(response.msg || `IMA business error: ${path}`);
  }
  return response.data;
}

function ensureAssetDirs() {
  mkdirSync(fileDir, { recursive: true });
  mkdirSync(noteDir, { recursive: true });
}

function publicUrl(localPath) {
  return `/${localPath.replace(/^public[\\/]/, "").replaceAll("\\", "/")}`;
}

function extensionFor(row, mediaInfo) {
  const fromTitle = extname(row.title);
  if (fromTitle) return fromTitle;

  const fromUrl = mediaInfo?.url_info?.url ? extname(new URL(mediaInfo.url_info.url).pathname) : "";
  if (fromUrl) return fromUrl;

  if (row.media_type === 1) return ".pdf";
  if (row.media_type === 9) return ".jpeg";
  return ".txt";
}

async function downloadToLocal(url, headers, localPath) {
  if (existsSync(localPath)) return true;

  const response = await fetch(url, { headers: headers ?? {} });
  if (!response.ok) return false;

  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(localPath, buffer);
  return true;
}

function noteIdFromMediaInfo(row, mediaInfo) {
  if (mediaInfo?.notebook_ext_info?.notebook_id) return mediaInfo.notebook_ext_info.notebook_id;
  const match = row.media_id.match(/_(\d{12,})/);
  return match ? match[1].slice(0, 16) : "";
}

function readNoteContent(noteId) {
  if (!noteId) return "";
  try {
    const data = ima("openapi/note/v1/get_doc_content", {
      note_id: noteId,
      target_content_format: 0
    });
    return typeof data.content === "string" ? data.content : "";
  } catch {
    return "";
  }
}

function excerpt(content, maxLength = 180) {
  return content.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

async function enrichRow(row, id) {
  const mediaInfo = ima("openapi/wiki/v1/get_media_info", { media_id: row.media_id });
  const label = typeLabels.get(row.media_type) ?? "IMA\u8d44\u6599";

  if ((row.media_type === 1 || row.media_type === 9) && mediaInfo?.url_info?.url) {
    const ext = extensionFor(row, mediaInfo);
    const localPath = join(fileDir, `${id}${ext}`);
    const saved = await downloadToLocal(mediaInfo.url_info.url, mediaInfo.url_info.headers, localPath);
    return {
      localUrl: saved ? publicUrl(localPath) : mediaInfo.url_info.url,
      sourceUrl: mediaInfo.url_info.url,
      sourceLabel: saved ? `\u672c\u5730${label}` : `IMA ${label}`,
      localSummary: saved ? `\u5df2\u4fdd\u5b58\u5230\u672c\u5730\uff1a${publicUrl(localPath)}` : "\u672a\u80fd\u4e0b\u8f7d\u5230\u672c\u5730\uff0c\u4f7f\u7528 IMA \u4e34\u65f6\u94fe\u63a5\u3002"
    };
  }

  if (row.media_type === 11) {
    const noteId = noteIdFromMediaInfo(row, mediaInfo);
    const content = readNoteContent(noteId);
    if (content) {
      const localPath = join(noteDir, `${id}.txt`);
      writeFileSync(localPath, content, "utf8");
      return {
        localUrl: publicUrl(localPath),
        sourceUrl: mediaInfo?.url_info?.url ?? resourceUrl(row),
        sourceLabel: "\u672c\u5730\u7b14\u8bb0\u6587\u672c",
        localSummary: `\u7b14\u8bb0\u6b63\u6587\u5df2\u4fdd\u5b58\u5230\u672c\u5730\uff1a${publicUrl(localPath)}`,
        contentExcerpt: excerpt(content)
      };
    }
  }

  if (mediaInfo?.url_info?.url) {
    return {
      localUrl: mediaInfo.url_info.url,
      sourceUrl: mediaInfo.url_info.url,
      sourceLabel: `IMA ${label}`,
      localSummary: "\u5df2\u83b7\u53d6 IMA \u8fd4\u56de\u7684\u539f\u59cb\u94fe\u63a5\u3002"
    };
  }

  return {
    localUrl: resourceUrl(row),
    sourceUrl: resourceUrl(row),
    sourceLabel: `IMA ${label}`,
    localSummary: "\u672a\u83b7\u53d6\u5230\u53ef\u4e0b\u8f7d\u6216\u53ef\u8df3\u8f6c\u7684\u94fe\u63a5\uff0c\u4fdd\u7559 IMA \u5185\u90e8\u94fe\u63a5\u3002"
  };
}

function listAllVtKnowledge() {
  const rows = [];
  let cursor = "";
  for (;;) {
    const data = ima("openapi/wiki/v1/get_knowledge_list", {
      knowledge_base_id: knowledgeBaseId,
      cursor,
      limit: 50
    });
    rows.push(...(data.knowledge_list ?? []));
    if (data.is_end) return rows;
    cursor = data.next_cursor || "";
    if (!cursor) return rows;
  }
}

const typeLabels = new Map([
  [1, "PDF"],
  [2, "\u7f51\u9875"],
  [6, "\u5fae\u4fe1\u6587\u7ae0"],
  [9, "\u56fe\u7247"],
  [11, "IMA\u7b14\u8bb0"],
  [12, "AI\u4f1a\u8bdd"]
]);

const palettes = ["mint", "cyan", "amber", "rose"];

function titleTags(title, label) {
  const tags = [vtLibraryName, label];
  const rules = [
    ["AI", /AI|ai|Agent|agent|OpenClaw|Openclaw|bot/i],
    ["\u8ba4\u77e5", /\u8ba4\u77e5|\u601d\u8003|\u5224\u65ad|\u8bb0\u5fc6|\u5143\u8ba4\u77e5|\u610f\u8bc6/],
    ["\u89c6\u9891", /\u89c6\u9891|Seedance/],
    ["\u4ea7\u54c1", /\u4ea7\u54c1|\u793e\u4ea4\u7f51\u7edc|App|\u5f00\u6e90|\u7f16\u7a0b/],
    ["\u7814\u7a76\u62a5\u544a", /\u62a5\u544a|\u7eaa\u8981|pdf/i]
  ];
  for (const [tag, pattern] of rules) {
    if (pattern.test(title) && !tags.includes(tag)) tags.push(tag);
  }
  return tags;
}

function resourceUrl(row) {
  if (row.media_type !== 11) {
    return `ima://knowledge/${encodeURIComponent(vtLibraryName)}/${encodeURIComponent(row.title)}?media_id=${encodeURIComponent(row.media_id)}`;
  }

  const match = row.media_id.match(/_(\d{12,})/);
  const docId = match ? match[1].slice(0, 16) : "";
  return `chrome://note?docid=${docId}&media_id=${row.media_id}`;
}

async function assetFrom(row, index) {
  const id = `vtlib-${createHash("sha1").update(row.media_id).digest("hex").slice(0, 14)}`;
  const label = typeLabels.get(row.media_type) ?? "IMA\u8d44\u6599";
  const title = row.title;
  const enriched = await enrichRow(row, id);
  const summary = enriched.contentExcerpt || `\u6765\u81ea IMA\u300c${vtLibraryName} / \u6839\u76ee\u5f55\u300d\u7684${label}\u7d20\u6750\uff1a${title}\u3002`;
  const tags = titleTags(title, label);
  const score = Math.max(76, Math.min(90, 78 + tags.length + (row.media_type === 1 ? 4 : row.media_type === 11 ? 3 : row.media_type === 6 ? 2 : 0)));

  return {
    id,
    title,
    theme: `${vtLibraryName} / ${label}`,
    source: `IMA ${vtLibraryName} / \u6839\u76ee\u5f55${row.media_type === 11 ? " / IMA Note" : ""}`,
    format: label,
    freshness: updated,
    score,
    tags,
    summary,
    owner,
    palette: palettes[index % palettes.length],
    notes: [
      `\u4ece IMA\u300c${vtLibraryName}\u300d\u540c\u6b65\uff0c\u9002\u5408\u4f5c\u4e3a\u9009\u9898\u3001\u89c2\u70b9\u6216\u8d44\u6599\u6e90\u3002`,
      `\u539f\u59cb\u7c7b\u578b\uff1a${label}\uff1b\u6807\u9898\uff1a${title}`,
      enriched.localSummary
    ],
    resources: [
      {
        id: `${id}-primary`,
        title,
        kind: row.media_type === 1 ? "pdf" : "web",
        url: enriched.localUrl,
        source: enriched.sourceLabel,
        updated,
        summary,
        highlights: [`\u76ee\u5f55\uff1a${vtLibraryName} / \u6839\u76ee\u5f55`, `\u7c7b\u578b\uff1a${label}`, `\u539f\u59cb\u6807\u9898\uff1a${title}`]
      }
    ]
  };

  if (enriched.sourceUrl && enriched.sourceUrl !== enriched.localUrl) {
    asset.resources.push({
      id: `${id}-source`,
      title: `${title} - IMA\u539f\u59cb\u94fe\u63a5`,
      kind: "web",
      url: enriched.sourceUrl,
      source: "IMA\u539f\u59cb\u94fe\u63a5",
      updated,
      summary: `IMA \u8fd4\u56de\u7684\u539f\u59cb\u8bbf\u95ee\u94fe\u63a5\uff1a${title}`,
      highlights: ["\u53ef\u80fd\u6709\u65f6\u6548", "\u9002\u5408\u56de\u5230 IMA \u6216\u539f\u6587\u67e5\u770b", `\u7c7b\u578b\uff1a${label}`]
    });
  }

  return asset;
}

function deleteAssetSet(assetIds) {
  if (!assetIds.length) return;

  const placeholders = assetIds.map(() => "?").join(", ");
  const contentIds = db.prepare(`SELECT id FROM contents WHERE asset_id IN (${placeholders})`).all(...assetIds).map((row) => row.id);
  if (contentIds.length) {
    const contentPlaceholders = contentIds.map(() => "?").join(", ");
    db.prepare(`UPDATE plans SET content_id = NULL WHERE content_id IN (${contentPlaceholders})`).run(...contentIds);
    db.prepare(`DELETE FROM activities WHERE content_id IN (${contentPlaceholders})`).run(...contentIds);
    db.prepare(`DELETE FROM contents WHERE id IN (${contentPlaceholders})`).run(...contentIds);
  }

  db.prepare(`DELETE FROM assets WHERE id IN (${placeholders})`).run(...assetIds);
}

ensureAssetDirs();
const assets = await Promise.all(listAllVtKnowledge().map(assetFrom));

db.prepare("BEGIN").run();
try {
  const nonVtAssetIds = db.prepare("SELECT id FROM assets WHERE source NOT LIKE 'IMA VT\u7d20\u6750\u5e93%'").all().map((row) => row.id);
  deleteAssetSet(nonVtAssetIds);

  const incomingIds = new Set(assets.map((asset) => asset.id));
  const staleVtAssetIds = db
    .prepare("SELECT id FROM assets WHERE source LIKE 'IMA VT\u7d20\u6750\u5e93%'")
    .all()
    .map((row) => row.id)
    .filter((id) => !incomingIds.has(id));
  deleteAssetSet(staleVtAssetIds);

  const upsert = db.prepare(`
    INSERT INTO assets
      (id, title, theme, source, format, freshness, score, tags_json, summary, owner, palette, notes_json, resources_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      theme = excluded.theme,
      source = excluded.source,
      format = excluded.format,
      freshness = excluded.freshness,
      score = excluded.score,
      tags_json = excluded.tags_json,
      summary = excluded.summary,
      owner = excluded.owner,
      palette = excluded.palette,
      notes_json = excluded.notes_json,
      resources_json = excluded.resources_json
  `);

  for (const asset of assets) {
    upsert.run(
      asset.id,
      asset.title,
      asset.theme,
      asset.source,
      asset.format,
      asset.freshness,
      asset.score,
      json(asset.tags),
      asset.summary,
      asset.owner,
      asset.palette,
      json(asset.notes),
      json(asset.resources)
    );
  }

  db.prepare("COMMIT").run();
} catch (error) {
  db.prepare("ROLLBACK").run();
  throw error;
}

console.log(JSON.stringify({ synced: assets.length, titles: assets.map((asset) => asset.title) }, null, 2));
