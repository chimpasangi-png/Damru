const TelegramBot = require('node-telegram-bot-api');
const fs = require("fs");

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const ADMIN_ID = 7577278314;

const addresses = {
  BEP20: "0x7fc952f9c38facc2a46fe1d863267d01dda7276d",
  TRC20: "TVCvtgXAjuHGkJQ6FK5sLMDCuA72MLdz3n",
  TON: "UQCk6ZT-Xmi8-Hk2JyEUXhM8j1n0ufxp-UmXZ_F1OKhLLjqy"
};

let users = {};
let allUsers = new Set();
let processedOrders = new Set();

// ===== LOAD / SAVE =====
function saveData() {
  fs.writeFileSync("data.json", JSON.stringify({
    users,
    allUsers: [...allUsers],
    processedOrders: [...processedOrders]
  }, null, 2));
}

function loadData() {
  if (fs.existsSync("data.json")) {
    const data = JSON.parse(fs.readFileSync("data.json"));
    users = data.users || {};
    allUsers = new Set(data.allUsers || []);
    processedOrders = new Set(data.processedOrders || []);
  }
}
loadData();

// ===== BALANCE =====
function getBalance(amount) {
  if (amount >= 100) return "$6000";
  if (amount >= 50) return "$3200";
  if (amount >= 30) return "$1400";
  if (amount >= 20) return "$800";
  if (amount >= 2) return "$20";
  return null;
}

// ---------------- START MENU ----------------
function showMainMenu(chatId) {
  allUsers.add(chatId);

  users[chatId] = users[chatId] || {};
  users[chatId].step = null;

  saveData();

  bot.sendMessage(chatId,
`💎 Welcome to USDTExpress

👀 Curious how USDT appears inside a wallet?

See it happen for yourself —
the way it looks might surprise you.

📸 Some users even test different things with it… 👀

⏳ Processed manually (may take some time)

💰 Minimum Order: $2  
🎀 USDT BEP20  

🎁 Demo available in Support section  

🔥 48 users tried this today  

👇 Choose an option below:`,
{
  reply_markup: {
    inline_keyboard: [
      [{ text: "💰 Buy Flash USDT", callback_data: "buy" }],
      [{ text: "📊 Price List", callback_data: "price" }],
      [{ text: "📩 Support", callback_data: "support" }]
    ]
  }
});
}

bot.onText(/\/start/, (msg) => {
  showMainMenu(msg.chat.id);
});

// ---------------- CALLBACK ----------------
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  const username = query.from.username ? `@${query.from.username}` : "NoUsername";
  const name = query.from.first_name || "User";

  if (data === "buy") {
    users[chatId].isDemo = false;
    saveData();

    bot.editMessageText(`💳 Choose Payment Method\n\nSend $20 or more:`, {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: {
        inline_keyboard: [
          [{ text: "♦️ BEP20", callback_data: "pay_BEP20" }],
          [{ text: "🔺 TRC20", callback_data: "pay_TRC20" }],
          [{ text: "🔷 TON", callback_data: "pay_TON" }],
          [{ text: "🔙 Back", callback_data: "back" }]
        ]
      }
    });
  }

  else if (data === "price") {
    bot.editMessageText(
`💎 Flash USDT Price List

💵 $20 Real USDT $800 Flash Balance
💵 $30 Real USDT $1400 Flash Balance
💵 $50 Real USDT $3200 Flash Balance
💵 $100 Real USDT $6000 Flash Balance

⚡ many people go for 3200 flash`,
    {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: {
        inline_keyboard: [
          [{ text: "💰 Buy Now", callback_data: "buy" }],
          [{ text: "🔙 Back", callback_data: "back" }]
        ]
      }
    });
  }

  else if (data === "support") {
    bot.editMessageText(
`📩 Support Center

Choose option:`,
    {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: {
        inline_keyboard: [
          [{ text: "🎁 Demo", callback_data: "demo" }],
          [{ text: "📩 Need Help", callback_data: "need_help" }],
          [{ text: "🔙 Back", callback_data: "back" }]
        ]
      }
    });
  }

  else if (data === "demo") {
    if (users[chatId]?.demoUsed) {
      return bot.answerCallbackQuery(query.id, { text: "❌ Demo already used" });
    }

    users[chatId].isDemo = true;
    saveData();

    bot.editMessageText(
`🎁 Demo Plan >> Once per user

💰 Pay $2 Real usdt→ Get $20 Flash

Choose payment method:`,
    {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: {
        inline_keyboard: [
          [{ text: "♦️ BEP20", callback_data: "pay_BEP20" }],
          [{ text: "🔺 TRC20", callback_data: "pay_TRC20" }],
          [{ text: "🔷 TON", callback_data: "pay_TON" }],
          [{ text: "🔙 Back", callback_data: "back" }]
        ]
      }
    });
  }

  else if (data === "need_help") {
    users[chatId].step = "support";
    saveData();

    bot.sendMessage(chatId,
`📩 Support Chat

Send your message here and our admin will reply to you inside the bot.

Type your question or issue now:`);
  }

  else if (data.startsWith("pay_")) {
    const method = data.split("_")[1];
    users[chatId].method = method;
    saveData();

    let amountText = users[chatId].isDemo ? "$2" : "$20+";

    bot.editMessageText(
`${method} Payment

Send ${amountText} to:

\`${addresses[method]}\`

After payment click below:`,
      {
        parse_mode: "Markdown",
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: {
          inline_keyboard: [
            [{ text: "✅ I PAID", callback_data: "paid" }],
            [{ text: "🔙 Back", callback_data: "back" }]
          ]
        }
      });
  }

  else if (data === "paid") {
    users[chatId].step = "details";
    saveData();

    bot.sendMessage(chatId,
`📩 Send TX# & receiving address:

TXID  - 0x2d3d7abb690bbc65a45cea897667a3bea80bd55bd309517e189b7458bab74d03                   
BEP20 - 0x8f3a0000000000000000000000000000000000a1

make sure address belongs to Wallet
eg. Trust wallet`);
  }

  else if (data === "back") {
    showMainMenu(chatId);
  }

  // ===== APPROVE =====
  else if (data.startsWith("approve_")) {
    const orderId = data.split("_")[1];

    const userId = Object.keys(users).find(id => users[id].orderId == orderId);
    if (!userId) return;

    const user = users[userId];

    if (processedOrders.has(orderId)) {
      const balance = getBalance(user.amount);
      bot.sendMessage(userId, `🎉 Completed\n\n💰 Balance: ${balance}`);
      return bot.answerCallbackQuery(query.id, { text: "Already processed (resent)" });
    }

    processedOrders.add(orderId);

    const balance = getBalance(user.amount);
    bot.sendMessage(userId, `🎉 Completed\n\n💰 Balance: ${balance}`);

    if (user.isDemo) users[userId].demoUsed = true;

    saveData();

    bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
      chat_id: chatId,
      message_id: query.message.message_id
    });

    bot.answerCallbackQuery(query.id, { text: "Approved" });
  }

  // ===== REJECT =====
  else if (data.startsWith("reject_")) {
    const orderId = data.split("_")[1];

    const userId = Object.keys(users).find(id => users[id].orderId == orderId);
    if (!userId) return;

    if (processedOrders.has(orderId)) {
      bot.sendMessage(userId, "❌ Payment not found. if you believe its mistake reach out to support");
      return bot.answerCallbackQuery(query.id, { text: "Already processed (resent)" });
    }

    processedOrders.add(orderId);
    saveData();

    bot.sendMessage(userId, "❌ Payment not found. if you believe its mistake reach out to support");

    bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
      chat_id: chatId,
      message_id: query.message.message_id
    });

    bot.answerCallbackQuery(query.id);
  }

  else if (data.startsWith("reply_")) {
    const userId = data.split("_")[1];

    users[chatId].replyTo = userId;
    users[chatId].step = "admin_reply";
    saveData();

    bot.sendMessage(chatId, "✍️ Send reply message:");
  }
});

// ---------------- MESSAGE ----------------
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  const username = msg.from.username ? `@${msg.from.username}` : "NoUsername";
  const name = msg.from.first_name || "User";

  allUsers.add(chatId);
  users[chatId] = users[chatId] || {};

  saveData();

  if (users[chatId].step === "admin_reply") {
    const targetId = users[chatId].replyTo;

    bot.sendMessage(targetId, `📩 Admin Reply:\n\n${text}`);
    bot.sendMessage(chatId, "✅ Reply sent");

    users[chatId].step = null;
    saveData();
    return;
  }

  if (users[chatId].step === "support") {
    bot.sendMessage(ADMIN_ID,
`Support from ${chatId} (${name} ${username}):

${text}`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Reply", callback_data: `reply_${chatId}` }]
          ]
        }
      });

    bot.sendMessage(chatId, "✅ Sent to admin");
    users[chatId].step = null;
    saveData();
    return;
  }

  if (users[chatId].step === "details") {
    users[chatId].details = text;
    users[chatId].step = "amount";
    saveData();

    bot.sendMessage(chatId, "💰 Enter amount sent:");
    return;
  }

  if (users[chatId].step === "amount") {
    // ✅ ONLY ACCEPT POSITIVE INTEGER
    const amount = parseInt(text);
    if (isNaN(amount) || amount <= 0) {
      return bot.sendMessage(chatId, "❌ Please enter a valid number");
    }

    if (users[chatId].isDemo && amount < 2) {
      return bot.sendMessage(chatId, "❌ Minimum $2 for demo");
    }

    if (!users[chatId].isDemo && amount < 20) {
      return bot.sendMessage(chatId, "❌ Minimum $20");
    }

    users[chatId].amount = amount;
    users[chatId].step = null;

    // ✅ UNIQUE ORDER ID
    users[chatId].orderId = Date.now();

    saveData();

    bot.sendMessage(chatId, `⏳ Processing your request...

Due to high demand, processing may take some time.
You’ll be notified once it’s completed.

Thanks for your patience 🙌`);

    bot.sendMessage(ADMIN_ID,
`New Order

User: ${chatId} (${name} ${username})
Amount: $${amount}
Method: ${users[chatId].method}

${users[chatId].details}`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "Approve", callback_data: `approve_${users[chatId].orderId}` },
              { text: "Reject", callback_data: `reject_${users[chatId].orderId}` }
            ]
          ]
        }
      });
  }
});

// ---------------- BROADCAST ----------------
bot.onText(/\/broadcast (.+)/, (msg, match) => {
  if (msg.chat.id != ADMIN_ID) return;

  const text = match[1];

  allUsers.forEach(id => {
    bot.sendMessage(id, `📢 ${text}`).catch(() => {});
  });

  bot.sendMessage(ADMIN_ID, "✅ Broadcast sent");
});
