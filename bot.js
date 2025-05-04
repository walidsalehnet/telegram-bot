const { Telegraf, Markup } = require('telegraf');
const admin = require('firebase-admin');

// ✅ تحميل بيانات Firebase
admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_CREDENTIALS))
});

const db = admin.firestore();
const bot = new Telegraf("7808305189:AAHtlzubXLTCyKvNSEHFHZ6jARSMDGorDGk");

// ✅ حالات المستخدمين
const userStates = new Map();

// ✅ قائمة الأوامر
bot.start((ctx) => {
    ctx.reply(
        '👋اهلا بيك ي باشا في بوت الاداره خلي بالك انت برنس وتقدر تعمنل المستحيل :',
        Markup.keyboard([
            ['📋 عرض المستخدمين', '➕ إضافة رصيد', '➖ خصم رصيد'],
            ['🗑️ حذف مستخدم', '🔄 تحديث البيانات'],
            ['✅ تنفيذ طلب', '➕ إضافة كارت'],
            ['➕ إنشاء قسيمة', '❌ حذف قسيمة']
        ])
        .resize()
        .oneTime()
    );
});

// ✅ عرض المستخدمين
bot.hears('📋 عرض المستخدمين', async (ctx) => {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();

    if (snapshot.empty) return ctx.reply('❌ لا يوجد مستخدمون حتى الآن.');

    let userList = '📌 قائمة المستخدمين:\n';
    snapshot.forEach(doc => {
        const data = doc.data();
        userList += `👤 ${data.email} - 💰 ${data.wallet} جنيه\n`;
    });

    ctx.reply(userList);
});

// ✅ إضافة كارت
bot.hears('➕ إضافة كارت', (ctx) => {
    ctx.reply('✏️ أدخل رقم الكارت والوحدات بالشكل التالي:\n`رقم_الكارت وحدات`', { parse_mode: 'Markdown' });
    userStates.set(ctx.from.id, 'awaiting_card');
});

// ✅ تنفيذ طلب
bot.hears('✅ تنفيذ طلب', (ctx) => {
    ctx.reply('✏️ أدخل رقم الطلب لتنفيذه:', { parse_mode: 'Markdown' });
    userStates.set(ctx.from.id, 'awaiting_order');
});

// ✅ إضافة رصيد
bot.hears('➕ إضافة رصيد', (ctx) => {
    ctx.reply('✏️ أدخل البريد الإلكتروني والمبلغ بالشكل:\n`email@example.com 100`', { parse_mode: 'Markdown' });
    userStates.set(ctx.from.id, 'awaiting_add_balance');
});

// ✅ خصم رصيد
bot.hears('➖ خصم رصيد', (ctx) => {
    ctx.reply('✏️ أدخل البريد الإلكتروني والمبلغ للخصم:\n`email@example.com 50`', { parse_mode: 'Markdown' });
    userStates.set(ctx.from.id, 'awaiting_sub_balance');
});

// ✅ إنشاء قسيمة
bot.hears('➕ إنشاء قسيمة', (ctx) => {
    ctx.reply('✏️ أدخل البريد الإلكتروني وكود القسيمة:\n`email@example.com CODE123`', { parse_mode: 'Markdown' });
    userStates.set(ctx.from.id, 'awaiting_add_code');
});

// ✅ حذف قسيمة
bot.hears('❌ حذف قسيمة', (ctx) => {
    ctx.reply('✏️ أدخل البريد الإلكتروني لحذف القسيمة:', { parse_mode: 'Markdown' });
    userStates.set(ctx.from.id, 'awaiting_del_code');
});

// ✅ تحديث البيانات (ثابت)
bot.hears('🔄 تحديث البيانات', async (ctx) => {
    ctx.reply('🔄 يتم تحديث البيانات الآن...');
    // ضع كود التحديث الخاص بك هنا
});

// ✅ استقبال الرسائل النصية ومعالجة الحالات
bot.on('text', async (ctx) => {
    const state = userStates.get(ctx.from.id);
    const text = ctx.message.text.trim();

    switch (state) {
        case 'awaiting_card': {
            const [number, units] = text.split(' ');
            if (!number || !units) return ctx.reply('❌ أدخل البيانات بهذا الشكل: `رقم_الكارت وحدات`', { parse_mode: 'Markdown' });

            await db.collection('cards').add({ number, units, addedTime: Date.now() });
            ctx.reply(`✅ تم إضافة الكارت بنجاح:\n🔢 رقم: *${number}*\n⚡ وحدات: *${units}*`, { parse_mode: 'Markdown' });
            break;
        }

        case 'awaiting_order': {
            const orderId = text;
            const collections = ["orders", "recharges", "withdrawals"];
            let found = false;

            for (let collection of collections) {
                const doc = await db.collection(collection).doc(orderId).get();
                if (doc.exists) {
                    await doc.ref.update({ status: "تم التنفيذ" });
                    ctx.reply(`✅ تم تنفيذ الطلب في *${collection}*\n🔢 رقم: *${orderId}*`, { parse_mode: 'Markdown' });
                    found = true;
                    break;
                }
            }

            if (!found) ctx.reply('❌ الطلب غير موجود.');
            break;
        }

        case 'awaiting_add_balance':
        case 'awaiting_sub_balance': {
            const [email, amountStr] = text.split(' ');
            const amount = parseFloat(amountStr);
            if (!email || isNaN(amount)) return ctx.reply('❌ تأكد من كتابة البريد والمبلغ بشكل صحيح.');

            const snapshot = await db.collection('users').where('email', '==', email).get();
            if (snapshot.empty) return ctx.reply('❌ المستخدم غير موجود.');

            snapshot.forEach(async (doc) => {
                const current = doc.data().wallet || 0;
                const newBalance = state === 'awaiting_add_balance' ? current + amount : current - amount;

                if (state === 'awaiting_sub_balance' && newBalance < 0) {
                    return ctx.reply('❌ الرصيد غير كافٍ.');
                }

                await doc.ref.update({ wallet: newBalance });
                ctx.reply(`✅ تم ${state === 'awaiting_add_balance' ? 'إضافة' : 'خصم'} ${amount} جنيه ${state === 'awaiting_add_balance' ? 'إلى' : 'من'} ${email}.`);
            });
            break;
        }

        case 'awaiting_add_code': {
            const [email, code] = text.split(' ');
            if (!email || !code) return ctx.reply('❌ أدخل البريد وكود القسيمة.');

            await db.collection('trader_codes').doc(email).set({ code });
            ctx.reply(`✅ تم إنشاء القسيمة لـ ${email}\n🔐 الكود: *${code}*`, { parse_mode: 'Markdown' });
            break;
        }

        case 'awaiting_del_code': {
            const email = text;
            const doc = await db.collection('trader_codes').doc(email).get();

            if (!doc.exists) return ctx.reply('❌ لا توجد قسيمة لهذا المستخدم.');

            await doc.ref.delete();
            ctx.reply(`✅ تم حذف القسيمة للمستخدم: ${email}`);
            break;
        }

        default:
            return; // لا يوجد حالة، تجاهل الرسالة
    }

    userStates.delete(ctx.from.id); // إنهاء الحالة بعد التنفيذ
});

// ✅ تشغيل البوت
bot.launch().catch((err) => {
    console.error("🚨 خطأ في تشغيل البوت:", err);
});
