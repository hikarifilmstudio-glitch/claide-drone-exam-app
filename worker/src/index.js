/* drone-exam-sync — 無人機學科練習 App 跨裝置進度同步 API
   Cloudflare Workers + KV，原生 fetch handler，不用框架。
   非機密資料（只有考題練習進度），刻意不做身份驗證，保持簡單。

   API：
     GET /progress?user=<名字>  → {"wrongIds": [...], "chapterProgress": {...}, "updatedAt": <毫秒時間戳>}
     PUT /progress?user=<名字>  body 同上格式 → 存進 KV，回傳存好的內容
*/

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...CORS_HEADERS,
    },
  });
}

// 跟前端 app.js 的 cleanUserName 同一套清理規則，確保兩邊算出同一個 key
function cleanUserName(name) {
  return String(name || "").trim().slice(0, 20);
}

// 只留下「章節名稱字串 → 非負整數索引」的合法項目，其他丟掉
function cleanChapterProgress(obj) {
  const out = {};
  if (!obj || typeof obj !== "object") return out;
  Object.keys(obj).forEach(function (key) {
    const val = obj[key];
    if (typeof val === "number" && val >= 0 && Number.isInteger(val)) {
      out[key] = val;
    }
  });
  return out;
}

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    if (url.pathname !== "/progress") {
      return json({ error: "not found" }, 404);
    }

    const user = cleanUserName(url.searchParams.get("user"));
    if (!user) {
      return json({ error: "缺少 user 參數或名字是空的" }, 400);
    }
    const kvKey = "user:" + user;

    if (request.method === "GET") {
      const stored = await env.PROGRESS_KV.get(kvKey, { type: "json" });
      if (!stored || !Array.isArray(stored.wrongIds)) {
        return json({ wrongIds: [], chapterProgress: {}, updatedAt: 0 });
      }
      return json({
        wrongIds: stored.wrongIds,
        chapterProgress: cleanChapterProgress(stored.chapterProgress),
        updatedAt: typeof stored.updatedAt === "number" ? stored.updatedAt : 0,
      });
    }

    if (request.method === "PUT") {
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return json({ error: "body 必須是合法 JSON" }, 400);
      }
      const wrongIds = Array.isArray(body && body.wrongIds)
        ? body.wrongIds.filter(function (id) {
            return typeof id === "string" || typeof id === "number";
          })
        : [];
      const chapterProgress = cleanChapterProgress(body && body.chapterProgress);
      const updatedAt =
        body && typeof body.updatedAt === "number" ? body.updatedAt : Date.now();
      const record = { wrongIds: wrongIds, chapterProgress: chapterProgress, updatedAt: updatedAt };
      await env.PROGRESS_KV.put(kvKey, JSON.stringify(record));
      return json(record);
    }

    return json({ error: "method not allowed" }, 405);
  },
};
