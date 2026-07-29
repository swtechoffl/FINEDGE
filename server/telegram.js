const TELEGRAM_API = "https://api.telegram.org";

// Telegram's sendMediaGroup only accepts photos as multipart file parts
// referenced via "attach://<field>" — it rejects base64 data URIs once a
// photo is more than a few KB, so every poster is attached as its own form
// field rather than inlined into the JSON media array.
export async function sendTelegramPosterAlbum(photos, caption) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) throw new Error("TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not configured");
  if (photos.length === 0) throw new Error("no poster images to send");

  // sendMediaGroup requires 2-10 items; a single poster (e.g. only GIFT
  // Nifty had data today) has to go through the plain sendPhoto endpoint
  // instead.
  if (photos.length === 1) return sendTelegramPhoto(photos[0].buffer, photos[0].posterId, caption);

  const form = new FormData();
  form.set("chat_id", chatId);
  const media = photos.map((p, i) => ({
    type: "photo",
    media: `attach://photo${i}`,
    ...(i === 0 && caption ? { caption } : {}),
  }));
  form.set("media", JSON.stringify(media));
  photos.forEach((p, i) => {
    form.set(`photo${i}`, new Blob([p.buffer], { type: "image/png" }), `${p.posterId}.png`);
  });

  const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMediaGroup`, { method: "POST", body: form });
  const json = await res.json();
  if (!json.ok) throw new Error(`Telegram sendMediaGroup failed: ${json.description || res.status}`);
  return json.result;
}

async function sendTelegramPhoto(buffer, posterId, caption) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const form = new FormData();
  form.set("chat_id", chatId);
  if (caption) form.set("caption", caption);
  form.set("photo", new Blob([buffer], { type: "image/png" }), `${posterId}.png`);

  const res = await fetch(`${TELEGRAM_API}/bot${token}/sendPhoto`, { method: "POST", body: form });
  const json = await res.json();
  if (!json.ok) throw new Error(`Telegram sendPhoto failed: ${json.description || res.status}`);
  return json.result;
}
