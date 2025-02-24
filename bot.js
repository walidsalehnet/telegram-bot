const { Telegraf, Markup } = require('telegraf');
const admin = require('firebase-admin');

// ✅ تحميل بيانات Firebase
admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_CREDENTIALS))
});

const db = admin.firestore();
const bot = new Telegraf("7834569515:AAHGBtlyJ-clDjc_jv2j9TDudV0K0AlRjeo"); // 🔥 استخدم التوكن الخاص بك

// ✅ قائمة الأوامر
bot.start((ctx) => {
    ctx.reply(
        '👋 أهلا بك في بوت الإدارة! اختر من القائمة:',
        Markup.keyboard([
            ['📋 عرض المستخدمين', '➕ إضافة رصيد', '➖ خصم رصيد'],
            ['🗑️ حذف مستخدم', '🔄 تحديث البيانات'],
            ['✅ تنفيذ طلب', '➕ إضافة كارت'],
            ['➕ إنشاء قسيمة', '❌ حذف قسيمة'],
            ['📩 إرسال إشعار']
        ])
        .resize()
        .oneTime()
    );
});
// ✅ إرسال إشعار للمستخدم
bot.hears('📩 إرسال إشعار', (ctx) => {
    ctx.reply('✏️ استخدم الأمر التالي لإرسال إشعار:\n`/notify [البريد] [الرسالة]`', { parse_mode: 'Markdown' });
});

bot.command('notify', async (ctx) => {
    let [_, email, ...message] = ctx.message.text.split(' ');

    if (!email || message.length === 0) {
        return ctx.reply('❌ استخدم الأمر بالشكل الصحيح:\n`/notify [البريد] [الرسالة]`', { parse_mode: 'Markdown' });
    }

    message = message.join(' ');

    const snapshot = await db.collection('users').where('email', '==', email).get();

    if (snapshot.empty) {
        return ctx.reply('❌ المستخدم غير موجود.');
    }

    snapshot.forEach(async (doc) => {
        const userId = doc.id;
        await db.collection('notifications').add({
            userId: userId,
            message: message,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            read: false
        });

        ctx.reply(`✅ تم إرسال الإشعار إلى ${email}`);
    });
});
// ✅ عرض المستخدمين
bot.hears('📋 عرض المستخدمين', async (ctx) => {
    const snapshot = await db.collection('users').get();
    if (snapshot.empty) {
        return ctx.reply('🚫 لا يوجد مستخدمين.');
    }

    let usersList = '📌 *قائمة المستخدمين:*\n\n';
    snapshot.forEach(doc => {
        const data = doc.data();
        usersList += `👤 *${data.email}* | 💰 *${data.wallet || 0}* جنيه\n`;
    });

    ctx.reply(usersList, { parse_mode: 'Markdown' });
});

// ✅ إضافة رصيد
bot.hears('➕ إضافة رصيد', (ctx) => {
    ctx.reply('✏️ استخدم الأمر التالي:\n`/addcredit [البريد] [المبلغ]`', { parse_mode: 'Markdown' });
});

bot.command('addcredit', async (ctx) => {
    let [_, email, amount] = ctx.message.text.split(' ');

    if (!email || !amount) {
        return ctx.reply('❌ استخدم الأمر بالشكل الصحيح:\n`/addcredit [البريد] [المبلغ]`', { parse_mode: 'Markdown' });
    }

    amount = parseFloat(amount);
    const userRef = db.collection('users').where('email', '==', email);
    const snapshot = await userRef.get();

    if (snapshot.empty) {
        return ctx.reply('❌ المستخدم غير موجود.');
    }

    snapshot.forEach(async (doc) => {
        let wallet = doc.data().wallet || 0;
        await doc.ref.update({ wallet: wallet + amount });
        ctx.reply(`✅ تم إضافة ${amount} جنيه لحساب ${email}`);
    });
});

// ✅ خصم رصيد
bot.hears('➖ خصم رصيد', (ctx) => {
    ctx.reply('✏️ استخدم الأمر التالي:\n`/deductcredit [البريد] [المبلغ]`', { parse_mode: 'Markdown' });
});

bot.command('deductcredit', async (ctx) => {
    let [_, email, amount] = ctx.message.text.split(' ');

    if (!email || !amount) {
        return ctx.reply('❌ استخدم الأمر بالشكل الصحيح:\n`/deductcredit [البريد] [المبلغ]`', { parse_mode: 'Markdown' });
    }

    amount = parseFloat(amount);
    const userRef = db.collection('users').where('email', '==', email);
    const snapshot = await userRef.get();

    if (snapshot.empty) {
        return ctx.reply('❌ المستخدم غير موجود.');
    }

    snapshot.forEach(async (doc) => {
        let wallet = doc.data().wallet || 0;
        if (wallet < amount) {
            return ctx.reply('❌ الرصيد غير كافٍ.');
        }

        await doc.ref.update({ wallet: wallet - amount });
        ctx.reply(`✅ تم خصم ${amount} جنيه من حساب ${email}`);
    });
});

// ✅ حذف مستخدم
bot.hears('🗑️ حذف مستخدم', (ctx) => {
    ctx.reply('✏️ استخدم الأمر التالي:\n`/deleteuser [البريد]`', { parse_mode: 'Markdown' });
});

bot.command('deleteuser', async (ctx) => {
    let [_, email] = ctx.message.text.split(' ');

    if (!email) {
        return ctx.reply('❌ استخدم الأمر بالشكل الصحيح:\n`/deleteuser [البريد]`', { parse_mode: 'Markdown' });
    }

    const userRef = db.collection('users').where('email', '==', email);
    const snapshot = await userRef.get();

    if (snapshot.empty) {
        return ctx.reply('❌ المستخدم غير موجود.');
    }

    snapshot.forEach(async (doc) => {
        await doc.ref.delete();
        ctx.reply(`✅ تم حذف المستخدم ${email}`);
    });
});

// ✅ تنفيذ طلب
bot.hears('✅ تنفيذ طلب', async (ctx) => {
    ctx.reply('✏️ أدخل رقم الطلب:\n`/execute [رقم الطلب]`', { parse_mode: 'Markdown' });
});

bot.command('execute', async (ctx) => {
    let [_, orderId] = ctx.message.text.split(' ');

    if (!orderId) {
        return ctx.reply('❌ استخدم الأمر بالشكل الصحيح:\n`/execute [رقم الطلب]`', { parse_mode: 'Markdown' });
    }

    const orderRef = db.collection('orders').doc(orderId);
    const doc = await orderRef.get();

    if (!doc.exists) {
        return ctx.reply('❌ الطلب غير موجود.');
    }

    await orderRef.update({ status: "تم التنفيذ" });
    ctx.reply(`✅ تم تنفيذ الطلب رقم ${orderId}`);
});

// ✅ إضافة كارت
bot.hears('➕ إضافة كارت', (ctx) => {
    ctx.reply('✏️ استخدم الأمر التالي:\n`/addcard [الكود] [عدد الوحدات]`', { parse_mode: 'Markdown' });
});

bot.command('addcard', async (ctx) => {
    let [_, code, units] = ctx.message.text.split(' ');

    if (!code || !units) {
        return ctx.reply('❌ استخدم الأمر بالشكل الصحيح:\n`/addcard [الكود] [عدد الوحدات]`', { parse_mode: 'Markdown' });
    }

    await db.collection('cards').add({ code, units, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    ctx.reply(`✅ تم إضافة الكارت بنجاح!`);
});

// ✅ إنشاء قسيمة
bot.hears('➕ إنشاء قسيمة', (ctx) => {
    ctx.reply('✏️ استخدم الأمر التالي:\n`/addvoucher [القسيمة] [البريد]`', { parse_mode: 'Markdown' });
});

bot.command('addvoucher', async (ctx) => {
    let [_, voucher, email] = ctx.message.text.split(' ');

    if (!voucher || !email) {
        return ctx.reply('❌ استخدم الأمر بالشكل الصحيح:\n`/addvoucher [القسيمة] [البريد]`', { parse_mode: 'Markdown' });
    }

    await db.collection('vouchers').add({ voucher, email });
    ctx.reply(`✅ تم إنشاء القسيمة بنجاح!`);
});

// ✅ حذف قسيمة
bot.hears('❌ حذف قسيمة', (ctx) => {
    ctx.reply('✏️ استخدم الأمر التالي:\n`/deletevoucher [القسيمة]`', { parse_mode: 'Markdown' });
});

bot.command('deletevoucher', async (ctx) => {
    let [_, voucher] = ctx.message.text.split(' ');

    if (!voucher) {
        return ctx.reply('❌ استخدم الأمر بالشكل الصحيح:\n`/deletevoucher [القسيمة]`', { parse_mode: 'Markdown' });
    }

    const snapshot = await db.collection('vouchers').where('voucher', '==', voucher).get();
    snapshot.forEach(async (doc) => {
        await doc.ref.delete();
    });

    ctx.reply(`✅ تم حذف القسيمة!`);
});

// ✅ تشغيل البوت
bot.launch().catch((err) => {
    console.error("🚨 خطأ في تشغيل البوت:", err);
});
