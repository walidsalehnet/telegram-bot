const { Telegraf, Markup } = require('telegraf');
const admin = require('firebase-admin');

// ✅ تحميل بيانات Firebase
admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_CREDENTIALS))
});

const db = admin.firestore();
const bot = new Telegraf("YOUR_BOT_TOKEN"); // 🔹 استبدل بـ توكن البوت الخاص بك

// ✅ قائمة الأوامر كأزرار
bot.start((ctx) => {
    ctx.reply(
        '👋 أهلا بك في بوت الإدارة! اختر من القائمة:',
        Markup.keyboard([
            ['📋 عرض المستخدمين', '➕ إضافة رصيد', '➖ خصم رصيد'],
            ['🗑️ حذف مستخدم', '🔄 تحديث البيانات'],
            ['📦 عرض الطلبات', '🔒 قفل الطلب', '🗑️ حذف طلب']
        ])
        .resize()
        .oneTime()
    );
});

// ✅ عرض جميع المستخدمين
bot.hears('📋 عرض المستخدمين', async (ctx) => {
    const snapshot = await db.collection("users").get();
    if (snapshot.empty) return ctx.reply("🚫 لا يوجد مستخدمون حالياً.");

    let usersList = "👥 *قائمة المستخدمين:*\n\n";
    snapshot.forEach((doc) => {
        const user = doc.data();
        usersList += `🆔 *ID:* ${doc.id}\n👤 *الاسم:* ${user.name || 'غير متوفر'}\n💰 *الرصيد:* ${user.wallet || 0} جنيه\n\n`;
    });

    ctx.reply(usersList, { parse_mode: "Markdown" });
});

// ✅ إضافة رصيد إلى مستخدم
bot.hears('➕ إضافة رصيد', (ctx) => {
    ctx.reply("✏️ استخدم الأمر:\n`/addcredit [ID المستخدم] [المبلغ]`", { parse_mode: "Markdown" });
});

bot.command("addcredit", async (ctx) => {
    const args = ctx.message.text.split(" ");
    if (args.length !== 3) {
        return ctx.reply("❌ استخدم الأمر بالشكل التالي: `/addcredit [ID المستخدم] [المبلغ]`", { parse_mode: "Markdown" });
    }

    const userId = args[1];
    const amount = parseFloat(args[2]);

    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) return ctx.reply("❌ المستخدم غير موجود.");

    let currentBalance = userDoc.data().wallet || 0;
    await userRef.update({ wallet: currentBalance + amount });

    ctx.reply(`✅ تم إضافة ${amount} جنيه إلى رصيد المستخدم.`);
});

// ✅ خصم رصيد من مستخدم
bot.hears('➖ خصم رصيد', (ctx) => {
    ctx.reply("✏️ استخدم الأمر:\n`/deductcredit [ID المستخدم] [المبلغ]`", { parse_mode: "Markdown" });
});

bot.command("deductcredit", async (ctx) => {
    const args = ctx.message.text.split(" ");
    if (args.length !== 3) {
        return ctx.reply("❌ استخدم الأمر بالشكل التالي: `/deductcredit [ID المستخدم] [المبلغ]`", { parse_mode: "Markdown" });
    }

    const userId = args[1];
    const amount = parseFloat(args[2]);

    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) return ctx.reply("❌ المستخدم غير موجود.");

    let currentBalance = userDoc.data().wallet || 0;
    if (currentBalance < amount) return ctx.reply("❌ الرصيد غير كافٍ.");

    await userRef.update({ wallet: currentBalance - amount });

    ctx.reply(`✅ تم خصم ${amount} جنيه من رصيد المستخدم.`);
});

// ✅ حذف مستخدم
bot.hears('🗑️ حذف مستخدم', (ctx) => {
    ctx.reply("✏️ استخدم الأمر:\n`/deleteuser [ID المستخدم]`", { parse_mode: "Markdown" });
});

bot.command("deleteuser", async (ctx) => {
    const args = ctx.message.text.split(" ");
    if (args.length !== 2) {
        return ctx.reply("❌ استخدم الأمر بالشكل التالي: `/deleteuser [ID المستخدم]`", { parse_mode: "Markdown" });
    }

    const userId = args[1];

    await db.collection("users").doc(userId).delete();
    ctx.reply(`🗑️ تم حذف المستخدم ID: ${userId} بنجاح.`);
});

// ✅ تحديث بيانات المستخدمين
bot.hears('🔄 تحديث البيانات', async (ctx) => {
    ctx.reply("🔄 جارِ تحديث بيانات المستخدمين...");
});

// ✅ عرض جميع الطلبات للأدمن
bot.hears('📦 عرض الطلبات', async (ctx) => {
    const snapshot = await db.collection("orders").get();
    if (snapshot.empty) return ctx.reply("🚫 لا يوجد طلبات حالياً.");

    let ordersList = "📦 *الطلبات الحالية:*\n\n";
    snapshot.forEach((doc) => {
        const order = doc.data();
        ordersList += `🔢 *رقم الطلب:* ${order.orderId}\n💰 *المبلغ:* ${order.paidAmount} جنيه\n📲 *رقم الشحن:* ${order.toNumber}\n📞 *رقم التواصل:* ${order.contactNumber}\n📌 *الحالة:* ${order.status}\n\n`;
    });

    ctx.reply(ordersList, { parse_mode: "Markdown" });
});

// ✅ قفل الطلب لمنع المستخدم من إلغائه
bot.hears('🔒 قفل الطلب', (ctx) => {
    ctx.reply("✏️ أدخل رقم الطلب بهذا الشكل:\n`/lockorder [رقم الطلب]`", { parse_mode: "Markdown" });
});

bot.command("lockorder", async (ctx) => {
    const args = ctx.message.text.split(" ");
    if (args.length !== 2) {
        return ctx.reply("❌ استخدم الأمر بالشكل التالي: `/lockorder [رقم الطلب]`", { parse_mode: "Markdown" });
    }

    const orderId = parseInt(args[1]);

    const orderRef = db.collection("orders").where("orderId", "==", orderId);
    const snapshot = await orderRef.get();

    if (snapshot.empty) return ctx.reply("❌ لم يتم العثور على طلب بهذا الرقم.");

    snapshot.forEach(async (doc) => {
        await doc.ref.update({ status: "تم التنفيذ" });
    });

    ctx.reply(`✅ تم قفل الطلب رقم ${orderId} ولن يتمكن المستخدم من إلغائه.`);
});

// ✅ حذف طلب من قاعدة البيانات
bot.hears('🗑️ حذف طلب', (ctx) => {
    ctx.reply("✏️ أدخل رقم الطلب بهذا الشكل:\n`/deleteorder [رقم الطلب]`", { parse_mode: "Markdown" });
});

bot.command("deleteorder", async (ctx) => {
    const args = ctx.message.text.split(" ");
    if (args.length !== 2) {
        return ctx.reply("❌ استخدم الأمر بالشكل التالي: `/deleteorder [رقم الطلب]`", { parse_mode: "Markdown" });
    }

    const orderId = parseInt(args[1]);

    const orderRef = db.collection("orders").where("orderId", "==", orderId);
    const snapshot = await orderRef.get();

    if (snapshot.empty) return ctx.reply("❌ لم يتم العثور على طلب بهذا الرقم.");

    snapshot.forEach(async (doc) => {
        await doc.ref.delete();
    });

    ctx.reply(`🗑️ تم حذف الطلب رقم ${orderId} بنجاح.`);
});

// ✅ تشغيل البوت
bot.launch().then(() => console.log("🚀 البوت يعمل الآن!"));
