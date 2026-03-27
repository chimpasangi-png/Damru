const TelegramBot = require('node-telegram-bot-api');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const ADMIN_ID = 7577278314;

const addresses = {
  BEP20: "0x7fc952f9c38facc2a46fe1d863267d01dda7276d",
  TRC20: "TVCvtgXAjuHGkJQ6FK5sLMDCuA72MLdz3n",
  TON: "UQCk6ZT-Xmi8-Hk2JyEUXhM8j1n0ufxp-UmXZ_F1OKhLLjqy"
};

let users = {};
let allUsers = new Set(); // for broadcast

function getBalance(amount) {
  if (amount >= 100) return "$3200";
  if (amount >= 50) return "$1500";
  if (amount >= 30) return "$800";
  if (amount >= 20) return "$500";
  if (amount >= 2) return "$20"; // demo
  return null;
}

// ---------------- START MENU ----------------
function showMainMenu(chatId) {
  allUsers.add(chatId);

  users[chatId] = users[chatId] || {};
  users[chatId].step = null;

  bot.sendMessage(chatId,
`💎 Welcome to USDTExpress 

Buy Flash USDT (For Show-Off Only)

⚠️ This is NOT real USDT
‼️ Can work on gambling sites
🚫 Does not support EXCHANGE

💰 Minimum Order: $20
🎀 Available - Usdt Bep20

For Demo - Support >> Demo

🔥 72 users served today

Choose an option below:`,
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

  // BUY
  if (data === "buy") {
    users[chatId].isDemo = false;

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

  // PRICE
  else if (data === "price") {
    bot.editMessageText(
`💎 Flash USDT Price List

💵 $20 Real USDT $500 Flash Balance 
💵 $30 Real USDT $800 Flash Balance
💵 $50 Real USDT $1500 Flash Balance
💵 $100 Real USDT $3200 Flash Balance 

⚡ Bigger order = Better value`,
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

  // SUPPORT MENU
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

  // DEMO FLOW
  else if (data === "demo") {
    if (users[chatId]?.demoUsed) {
      return bot.answerCallbackQuery(query.id, {
        text: "❌ Demo already used"
      });
    }

    users[chatId].isDemo = true;

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

  // NEED HELP (same old support)
  else if (data === "need_help") {
    users[chatId].step = "support";

    bot.sendMessage(chatId,
`📩 Support Chat

Send your message here and our admin will reply to you inside the bot.

Type your question or issue now:`);
  }

  // PAYMENT METHOD
  else if (data.startsWith("pay_")) {
    const method = data.split("_")[1];

    users[chatId].method = method;

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

  // PAID
  else if (data === "paid") {
    users[chatId].step = "details";

    bot.sendMessage(chatId,
`📩 Send receiving address:

BEP20 - 0x8f3a0000000000000000000000000000000000a1

make sure address belongs to Wallet 
eg. Trust wallet`);
  }

  // BACK
  else if (data === "back") {
    showMainMenu(chatId);
  }
// ADMIN REPLY
else if (data.startsWith("reply_")) {
    const userId = data.split("_")[1]; // user to reply
    users[ADMIN_ID] = users[ADMIN_ID] || {};
    users[ADMIN_ID].replyingTo = userId;

    bot.sendMessage(ADMIN_ID, `✏️ Type your reply now to user ${userId}`);
}
  // ADMIN APPROVE
  else if (data.startsWith("approve_")) {
    const userId = data.split("_")[1];
    const user = users[userId];

    const balance = getBalance(user.amount);

    bot.sendMessage(userId,
`🎉 Completed

💰 Balance: ${balance}`);

    if (user.isDemo) users[userId].demoUsed = true;

    bot.answerCallbackQuery(query.id, { text: "Approved" });
  }

  // ADMIN REJECT
  else if (data.startsWith("reject_")) {
    const userId = data.split("_")[1];

    bot.sendMessage(userId, "❌ Payment not found. if you believe its mistake reach out to support");
    bot.answerCallbackQuery(query.id);
  }
});

// ---------------- MESSAGE ----------------
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  allUsers.add(chatId);

  users[chatId] = users[chatId] || {};
// ---- SUPPORT REPLY FROM ADMIN ----
if (chatId === ADMIN_ID && users[ADMIN_ID]?.replyingTo) {
    const userId = users[ADMIN_ID].replyingTo;

    if (!text) return; // ignore non-text

    bot.sendMessage(userId, `💬 Admin Reply:\n\n${text}`);
    bot.sendMessage(ADMIN_ID, "✅ Reply sent!");

    users[ADMIN_ID].replyingTo = null; // reset after reply
    return;
}
  // SUPPORT
  if (users[chatId].step === "support") {
    bot.sendMessage(ADMIN_ID,
`Support from ${chatId}:

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
    return;
  }

  // DETAILS
  if (users[chatId].step === "details") {
    users[chatId].details = text;
    users[chatId].step = "amount";

    bot.sendMessage(chatId, "💰 Enter amount sent:");
    return;
  }

  // AMOUNT
  if (users[chatId].step === "amount") {
    const amount = parseInt(text);

    if (users[chatId].isDemo && amount < 2) {
      return bot.sendMessage(chatId, "❌ Minimum $2 for demo");
    }

    if (!users[chatId].isDemo && amount < 20) {
      return bot.sendMessage(chatId, "❌ Minimum $20");
    }

    users[chatId].amount = amount;
    users[chatId].step = null;

    bot.sendMessage(chatId, "⏳ Verifying...");

    bot.sendMessage(ADMIN_ID,
`New Order

User: ${chatId}
Amount: $${amount}
Method: ${users[chatId].method}

${users[chatId].details}`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "Approve", callback_data: `approve_${chatId}` },
              { text: "Reject", callback_data: `reject_${chatId}` }
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
