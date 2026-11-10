// server.js — прокси к YouTube Data API v3
const express = require("express");
const fetch = require("node-fetch");
const app = express();

const YT_KEY = process.env.YT_KEY;        // ключ YouTube Data API v3
const SHARED_SECRET = process.env.SECRET; // секрет для Roblox-сервера

app.get("/search", async (req, res) => {
  if (req.headers["x-secret"] !== SHARED_SECRET) {
    return res.status(403).json({ error: "forbidden" });
  }
  const q = String(req.query.q || "").slice(0, 100);
  if (!q) return res.json({ items: [] });

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", "10");
  url.searchParams.set("q", q);
  url.searchParams.set("key", YT_KEY);

  const r = await fetch(url);
  const data = await r.json();
  if (!r.ok) return res.status(r.status).json({ error: data });

  const items = (data.items || []).map(v => ({
    videoId: v.id.videoId,
    title: v.snippet.title,
    channel: v.snippet.channelTitle,
    thumb: v.snippet.thumbnails?.default?.url || "",
  }));
  res.json({ items });
});

// Проверка длительности и доступности конкретного видео
app.get("/video/:id", async (req, res) => {
  if (req.headers["x-secret"] !== SHARED_SECRET) {
    return res.status(403).json({ error: "forbidden" });
  }
  const id = String(req.params.id).slice(0, 20);
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "contentDetails,snippet,status");
  url.searchParams.set("id", id);
  url.searchParams.set("key", YT_KEY);

  const r = await fetch(url);
  const data = await r.json();
  const item = (data.items || [])[0];
  if (!item) return res.status(404).json({ error: "not found" });

  res.json({
    videoId: id,
    title: item.snippet.title,
    channel: item.snippet.channelTitle,
    duration: parseISODuration(item.contentDetails.duration),
    embeddable: item.status.embeddable === true,
  });
});

function parseISODuration(iso) {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  const h = +(m[1] || 0), min = +(m[2] || 0), s = +(m[3] || 0);
  return h * 3600 + min * 60 + s;
}

app.listen(process.env.PORT || 3000);
