// ===== IMPORTS =====
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require("mongoose");
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const ADMIN_ID = 7577278314;

const addresses = {
  BEP20: "0x7fc952f9c38facc2a46fe1d863267d01dda7276d",
  TRC20: "TVCvtgXAjuHGkJQ6FK5sLMDCuA72MLdz3n",
  TON: "UQCk6ZT-Xmi8-Hk2JyEUXhM8j1n0ufxp-UmXZ_F1OKhLLjqy"
};

// Wrap all top-level await code in an async function
async function startBot() {

  // ===== MONGODB SETUP =====
  await mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.log("❌ MongoDB Error:", err));

  // ===== SCHEMAS =====
  const userSchema = new mongoose.Schema({
    chatId: { type: String, unique: true },
    username: String,
    name: String,
    step: String,
    method: String,
    amount: Number,
    details: String,
    orderId: Number,
    isDemo: Boolean,
    demoUsed: Boolean,
    replyTo: String
  });

  const orderSchema = new mongoose.Schema({
    orderId: Number,
    processed: Boolean
  });

  const User = mongoose.model("User", userSchema);
  const Order = mongoose.model("Order", orderSchema);

  // ===== HELPERS =====
  async function getUser(chatId, username = "NoUsername", name = "User") {
    const user = await User.findOneAndUpdate(
      { chatId },
      { $setOnInsert: { username, name, demoUsed: false } },
      { new: true, upsert: true }
    );
    return user;
  }

  function getBalance(amount) {
    if (amount >= 100) return "$6000";
    if (amount >= 50) return "$3200";
    if (amount >= 30) return "$1400";
    if (amount >= 20) return "$800";
    if (amount >= 2) return "$20";
    return null;
  }

  // ---------------- START MENU ----------------
  async function showMainMenu(chatId) {
    const user = await getUser(chatId);
    user.step = null;
    await user.save();

    bot.sendMessage(
      chatId,
      `💎 Welcome to USDTExpress

👀 Curious how USDT appears inside a wallet?
...
Thanks for your patience 🙌`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "💰 Buy Flash USDT", callback_data: "buy" }],
            [{ text: "📊 Price List", callback_data: "price" }],
            [{ text: "📩 Support", callback_data: "support" }]
          ]
        }
      }
    );
  }

  bot.onText(/\/start/, (msg) => {
    showMainMenu(msg.chat.id);
  });

  // ---------------- CALLBACK ----------------
  bot.on("callback_query", async (query) => {
    // ... all your existing callback code here, unchanged
  });

  // ---------------- MESSAGE ----------------
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const username = msg.from.username ? `@${msg.from.username}` : "NoUsername";
    const name = msg.from.first_name || "User";

    const user = await getUser(chatId, username, name);

    // ---- Admin reply ----
    if (user.step === "admin_reply") {
      const targetId = user.replyTo;
      bot.sendMessage(targetId, `📩 Admin Reply:\n\n${text}`);
      bot.sendMessage(chatId, "✅ Reply sent");
      user.step = null;
      await user.save();
      return;
    }

    // ---- Support ----
    if (user.step === "support") {
      bot.sendMessage(
        ADMIN_ID,
        `Support from ${chatId} (${name} ${username}): ${text}`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "Reply", callback_data: `reply_${chatId}` }]
            ]
          }
        }
      );
      bot.sendMessage(chatId, "✅ Sent to admin");
      user.step = null;
      await user.save();
      return;
    }

    // ---- Details / Amount ----
    if (user.step === "details") {
      user.details = text;
      user.step = "amount";
      await user.save();
      bot.sendMessage(chatId, "💰 Enter amount sent:");
      return;
    }

    if (user.step === "amount") {
      const amount = parseInt(text);
      if (isNaN(amount) || amount <= 0) return bot.sendMessage(chatId, "❌ Please enter a valid number");
      if (user.isDemo && amount < 2) return bot.sendMessage(chatId, "❌ Minimum $2 for demo");
      if (!user.isDemo && amount < 20) return bot.sendMessage(chatId, "❌ Minimum $20");

      user.amount = amount;
      user.orderId = Date.now() + Math.floor(Math.random() * 1000);
      user.step = null;
      await user.save();

      bot.sendMessage(
        chatId,
        `⏳ Processing your request...

Due to high demand, processing may take some time.
You’ll be notified once it’s completed.

Thanks for your patience 🙌`
      );

      bot.sendMessage(
        ADMIN_ID,
        `New Order
User: ${chatId} (${name} ${username})
Amount: $${amount}
Method: ${user.method}

${user.details}`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "Approve", callback_data: `approve_${user.orderId}` },
                { text: "Reject", callback_data: `reject_${user.orderId}` }
              ]
            ]
          }
        }
      );
    }
  });

  // ---------------- BROADCAST ----------------
  bot.onText(/\/broadcast (.+)/, async (msg, match) => {
    if (msg.chat.id != ADMIN_ID) return;

    const text = match[1];
    const usersList = await User.find();
    for (let u of usersList) {
      bot.sendMessage(u.chatId, `📢 ${text}`).catch(() => {});
    }
    bot.sendMessage(ADMIN_ID, "✅ Broadcast sent");
  });

} // end startBot()

// RUN IT
startBot();
