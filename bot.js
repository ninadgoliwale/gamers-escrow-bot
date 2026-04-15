const TelegramBot = require("node-telegram-bot-api");
const express = require("express");

const TOKEN       = "8031554539:AAHP4HPLNbVKs11GmlRsxXp2bcuCo-1SFj8";
const OWNER_ID    = 8558052873;
const PORT        = process.env.PORT || 3000;
const RENDER_URL  = process.env.RENDER_EXTERNAL_URL;
const FEE_PERCENT = 3;

const BLUE_TICK = `<tg-emoji emoji-id="5368324170671202286">✅</tg-emoji>`;
const RED_TICK  = `<tg-emoji emoji-id="5373141891321699086">❌</tg-emoji>`;
const CROWN     = `<tg-emoji emoji-id="5361800399697066660">👑</tg-emoji>`;
const DIAMOND   = `<tg-emoji emoji-id="5377376824911485200">💎</tg-emoji>`;
const STAR      = `<tg-emoji emoji-id="5368324170671202286">⭐</tg-emoji>`;
const FIRE      = `<tg-emoji emoji-id="5373141891321699086">🔥</tg-emoji>`;
const SHIELD    = `<tg-emoji emoji-id="5447644880824073051">🛡️</tg-emoji>`;
const LOCK      = `<tg-emoji emoji-id="5447644880824073051">🔒</tg-emoji>`;
const KEY       = `<tg-emoji emoji-id="5361800399697066660">🗝️</tg-emoji>`;

const allowedChats = new Set();
const app = express();
app.use(express.json());

let bot;

if (RENDER_URL) {
  bot = new TelegramBot(TOKEN);
  const webhookPath = `/webhook/${TOKEN}`;
  bot.setWebHook(`${RENDER_URL}${webhookPath}`).then(() =>
    console.log("Webhook set:", `${RENDER_URL}${webhookPath}`)
  );
  app.post(webhookPath, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });
} else {
  bot = new TelegramBot(TOKEN, { polling: true });
  console.log("Bot started in polling mode");
}

app.get("/", (_req, res) => res.send("Gamers Escrow Bot is live!"));

function isOwner(msg) {
  return msg.from && msg.from.id === OWNER_ID;
}
function esc(text) {
  return String(text).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

const HTML = { parse_mode: "HTML" };

bot.onText(/\/allow/, async (msg) => {
  if (!isOwner(msg)) {
    return bot.sendMessage(msg.chat.id,
      `${LOCK} <b>Access Denied.</b>\n${DIAMOND} Only the bot owner can use this command.`, HTML);
  }
  const chatId = msg.chat.id;
  allowedChats.add(chatId);
  await bot.sendMessage(chatId,
    `${BLUE_TICK} ${CROWN} <b>Group Approved!</b>\n\n${STAR} Chat ID: <code>${chatId}</code>\n${DIAMOND} Members can now use <code>/p amount</code> here.`, HTML);
});

bot.onText(/\/remove/, async (msg) => {
  if (!isOwner(msg)) {
    return bot.sendMessage(msg.chat.id,
      `${LOCK} <b>Access Denied.</b>\n${DIAMOND} Only the bot owner can use this command.`, HTML);
  }
  const chatId = msg.chat.id;
  allowedChats.delete(chatId);
  await bot.sendMessage(chatId,
    `${RED_TICK} ${CROWN} <b>Group Removed.</b>\n\n${SHIELD} Chat ID: <code>${chatId}</code>\n${FIRE} Bot will no longer respond here.`, HTML);
});

bot.onText(/\/chatid/, async (msg) => {
  if (!isOwner(msg)) return;
  await bot.sendMessage(msg.chat.id,
    `${KEY} ${CROWN} <b>Chat ID:</b> <code>${msg.chat.id}</code>`, HTML);
});

bot.onText(/\/groups/, async (msg) => {
  if (!isOwner(msg)) return;
  if (allowedChats.size === 0) {
    return bot.sendMessage(msg.chat.id,
      `${DIAMOND} ${CROWN} <b>No groups approved yet.</b>\n\nAdd the bot to a group and type /allow there.`, HTML);
  }
  const list = [...allowedChats].map((id) => `${STAR} <code>${id}</code>`).join("\n");
  await bot.sendMessage(msg.chat.id, `${CROWN} <b>Approved Groups:</b>\n\n${list}`, HTML);
});

bot.onText(/\/p(?:\s+(\d+(?:\.\d+)?))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const isPrivateOwner = msg.chat.type === "private" && isOwner(msg);

  if (!isPrivateOwner && !allowedChats.has(chatId)) {
    return bot.sendMessage(chatId,
      `${LOCK} ${CROWN} <b>This group is not approved.</b>\n\n${DIAMOND} Ask the bot owner to type /allow in this group.`, HTML);
  }
  if (!match || !match[1]) {
    return bot.sendMessage(chatId,
      `${DIAMOND} ${CROWN} <b>Usage:</b> <code>/p amount</code>\n\n${STAR} Example: <code>/p 500</code>`, HTML);
  }

  const amount = parseFloat(match[1]);
  if (isNaN(amount) || amount <= 0) {
    return bot.sendMessage(chatId,
      `${SHIELD} ${CROWN} <b>Invalid amount.</b>\n${STAR} Enter a positive number.\n${DIAMOND} Example: <code>/p 500</code>`, HTML);
  }

  const fee        = parseFloat(((amount * FEE_PERCENT) / 100).toFixed(2));
  const buyerPays  = parseFloat((amount + fee).toFixed(2));
  const sellerGets = parseFloat((amount - fee).toFixed(2));

  const reply =
    `${CROWN} <b>GAMERS ESCROW — Fee Calculator</b> ${CROWN}\n\n` +
    `${STAR} <b>Deal Amount:</b> ₹${esc(amount.toLocaleString("en-IN"))}\n` +
    `${FIRE} <b>Escrow Fee (${FEE_PERCENT}%):</b> ₹${esc(fee.toLocaleString("en-IN"))}\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `${BLUE_TICK} <b>Buyer Pays:</b> ₹${esc(buyerPays.toLocaleString("en-IN"))}\n` +
    `${RED_TICK} <b>Seller Receives:</b> ₹${esc(sellerGets.toLocaleString("en-IN"))}\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `${KEY} <i>Fee is ${FEE_PERCENT}% of deal amount</i>`;

  await bot.sendMessage(chatId, reply, HTML);
});

bot.on("polling_error", (err) => console.error("Polling error:", err.message));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));