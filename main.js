const TelegramBot = require('node-telegram-bot-api');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const ADMIN_ID = 7577278314;

const addresses = {
  BEP20: "0x7fc952f9c38facc2a46fe1d863267d01dda7276d",
  TRC20: "TVCvtgXAjuHGkJQ6FK5sLMDCuA72MLdz3n",
  TON: "UQCk6ZT-Xmi8-Hk2JyEUXhM8j1n0ufxp-UmXZ_F1OKhLLjqy"
};

let users = {}; // Tracks purchase/payment flow & support state
let lastSupportTime = {}; // For spam-proof support

function getBalance(amount) {
  if (amount >= 100) return "$25,000";
  if (amount >= 50) return "$10,000";
  if (amount >= 30) return "$3,000";
  if (amount >= 20) return "$1,000";
  return null;
}

// ---------------- START MENU ----------------
function showMainMenu(chatId) {
  users[chatId] = users[chatId] || {};
  users[chatId].step = null;

  bot.sendMessage(chatId,
`💎 Welcome to USDTExpress

Buy Flash USDT (For Show-Off Only)

⚠️ This is NOT real USDT 
‼️ Can work on gambling sites (eg. stake)
🚫 Does not support EXCHANGE 
💰 Minimum Order: $20

🔥 57 users served today

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

// /start command
bot.onText(/\/start/, (msg) => {
  showMainMenu(msg.chat.id);
});

// ---------------- CALLBACK HANDLER ----------------
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  // ----- BUY FLOW -----
  if (data === "buy") {
    users[chatId].step = null;
    bot.editMessageText(
`💳 Choose Payment Method

Send $20 or more using any option below:`,
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

  // ----- PRICE LIST -----
  else if (data === "price") {
    bot.editMessageText(
`💎 Flash USDT Price List

💵 $20 Real USDT $1,000 Flash Balance 
💵 $30 Real USDT $3,000 Flash Balance
💵 $50 Real USDT $10,000 Flash Balance
💵 $100 Real USDT $25,000 Flash Balance 

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

  // ----- SUPPORT -----
  else if (data === "support") {
    if (users[chatId].supportLocked) {
      return bot.answerCallbackQuery(query.id, { text: "Please wait for admin reply before sending another message." });
    }
    users[chatId].step = "support";
    bot.sendMessage(chatId,
`📩 Support Chat

Send your message here and our admin will reply to you inside the bot.

Type your question or issue now:`);
  }

  // ----- PAYMENT METHOD -----
  else if (data.startsWith("pay_")) {
    const method = data.split("_")[1];
    users[chatId] = { method };
    users[chatId].step = null;

    bot.editMessageText(
`${method} Payment

Send $20+ to address below:

\`${addresses[method]}\`

⚠️ Send exact or higher amount

After payment, click below:`,
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

  // ----- I PAID -----
  else if (data === "paid") {
    users[chatId].step = "details";
    bot.sendMessage(chatId,
`📩 Submit Your Details

Send your receiving addresses like this:

BEP20 - your address
TRC20 - your address
TON - your address

(You can send only the one you need)`);
  }

  // ----- BACK -----
  else if (data === "back") {
    showMainMenu(chatId);
  }

  // ----- ADMIN APPROVE/REJECT -----
  else if (data.startsWith("approve_") || data.startsWith("reject_")) {
    const userId = data.split("_")[1];
    const user = users[userId];

    if (!user) return;

    if (data.startsWith("approve_")) {
      const balance = getBalance(user.amount);
      bot.sendMessage(userId,
`🎉 Order Completed!

💎 Your Flash USDT Balance:
${balance}

⚠️ This is for display/show-off only

Thank you for using USDTExpress 🚀`);
      bot.answerCallbackQuery(query.id, { text: "Approved ✅" });
    } else {
      bot.sendMessage(userId,
`❌ Payment Failed

We could not verify your payment.

If you believe this is a mistake,
contact support.`);
      bot.answerCallbackQuery(query.id, { text: "Rejected ❌" });
    }
  }

  // ----- ADMIN REPLY TO SUPPORT -----
  else if (data.startsWith("reply_")) {
    const userId = data.split("_")[1];
    bot.sendMessage(query.from.id, "✏️ Type your reply message now:");

    users[query.from.id] = users[query.from.id] || {};
    users[query.from.id].replyingTo = userId;
  }
});

// ---------------- USER MESSAGE HANDLER ----------------
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  users[chatId] = users[chatId] || {};
  const step = users[chatId].step;

  // ----- SUPPORT FLOW -----
  if (step === "support") {
    if (users[chatId].supportLocked) return;

    // Forward to admin
    bot.sendMessage(ADMIN_ID,
`💬 Support Message
From: @${msg.from.username || "NoUsername"} (${chatId})
Message: ${text}`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "✅ Reply", callback_data: `reply_${chatId}` }]
          ]
        }
      });

    bot.sendMessage(chatId, "✅ Your message has been sent to admin. Please wait for a reply.");
    users[chatId].supportLocked = true; // lock until admin replies
    users[chatId].step = null;
    return;
  }

  // ----- PURCHASE FLOW -----
  if (step === "details") {
    users[chatId].details = text;
    bot.sendMessage(chatId, "💰 Enter amount you sent (USD):");
    users[chatId].step = "amount";
    return;
  }

  if (step === "amount") {
    const amount = parseInt(text);
    if (isNaN(amount) || amount < 20) {
      return bot.sendMessage(chatId, "❌ Minimum amount is $20. Enter again:");
    }

    users[chatId].amount = amount;
    users[chatId].step = null;

    bot.sendMessage(chatId,
`⏳ Payment Under Review

🔍 Verifying your payment...
⏱️ Usually takes 2–10 minutes`);

    // Send to admin for approval
    bot.sendMessage(ADMIN_ID,
`🚀 New Order

👤 User: @${msg.from.username || "NoUsername"}
💰 Amount: $${amount}
💳 Method: ${users[chatId].method}

📩 Addresses:
${users[chatId].details}`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✅ Approve", callback_data: `approve_${chatId}` },
              { text: "❌ Reject", callback_data: `reject_${chatId}` }
            ]
          ]
        }
      });
    return;
  }

  // ----- ADMIN REPLY FLOW -----
  if (users[chatId] && users[chatId].replyingTo) {
    const userId = users[chatId].replyingTo;
    bot.sendMessage(userId,
`💬 Admin Reply:

${text}`);

    bot.sendMessage(chatId, "✅ Reply sent to user!");
    users[chatId].replyingTo = null;

    // Unlock support for user
    if (users[userId]) users[userId].supportLocked = false;
    return;
  }
});
