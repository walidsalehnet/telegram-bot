const { Telegraf, Markup } = require('telegraf');
const admin = require('firebase-admin');

// ✅ تحميل بيانات Firebase
admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_CREDENTIALS))
});

const db = admin.firestore();
const bot = new Telegraf("7834569515:AAHGBtlyJ-clDjc_jv2j9TDudV0K0AlRjeo"); // استبدل بالتوكن الخاص بك

// ✅ قائمة الأوامر المحدثة
bot.start((ctx) => {
    ctx.reply(
        '👋 أهلا بك في بوت الاداره الخاص ب ويدوو! اختر من القائمة:',
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

// ✅ تنفيذ طلب
bot.hears('✅ تنفيذ طلب', async (ctx) => {
    ctx.reply('📩 يتم الآن تنفيذ الطلب...');
    // 🔄 ضع هنا الكود الخاص بتنفيذ الطلبات حسب نظامك
});

// ✅ إضافة كارت جديد
bot.hears('➕ إضافة كارت', (ctx) => {
    ctx.reply('✏️ استخدم الأمر التالي لإضافة كارت:\n`/addcard [رقم الكارت] [الوحدات]`', { parse_mode: 'Markdown' });
});

bot.command('addcard', async (ctx) => {
    let [_, number, units] = ctx.message.text.split(' ');

    if (!number || !units) {
        return ctx.reply('❌ استخدم الأمر بالشكل الصحيح:\n`/addcard [رقم الكارت] [الوحدات]`', { parse_mode: 'Markdown' });
    }

    await db.collection('cards').add({
        number: number,
        units: units,
        addedTime: Date.now()
    });

    ctx.reply(`✅ تم إضافة الكارت بنجاح:\n🔢 رقم الكارت: *${number}*\n⚡ الوحدات: *${units}*`, { parse_mode: 'Markdown' });
});

// ✅ تحديث البيانات
bot.hears('🔄 تحديث البيانات', async (ctx) => {
    ctx.reply('🔄 يتم تحديث البيانات الآن...');
    // 🔄 ضع هنا الكود الخاص بتحديث البيانات حسب نظامك
});

// ✅ عرض المستخدمين المسجلين
bot.hears('📋 عرض المستخدمين', async (ctx) => {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();

    if (snapshot.empty) {
        return ctx.reply('❌ لا يوجد مستخدمون حتى الآن.');
    }

    let userList = '📌 قائمة المستخدمين:\n';
    snapshot.forEach(doc => {
        const userData = doc.data();
        userList += `👤 ${userData.email} - 💰 ${userData.wallet} جنيه\n`;
    });

    ctx.reply(userList);
});

// ✅ إضافة رصيد للمستخدم
bot.hears('➕ إضافة رصيد', (ctx) => {
    ctx.reply('✏️ استخدم الأمر التالي لإضافة رصيد:\n`/addrased [البريد الإلكتروني] [المبلغ]`', { parse_mode: 'Markdown' });
});

bot.command('addrased', async (ctx) => {
    let [_, email, amount] = ctx.message.text.split(' ');
    amount = parseFloat(amount);

    if (!email || isNaN(amount)) {
        return ctx.reply('❌ استخدم الأمر بالشكل الصحيح:\n`/addrased [البريد الإلكتروني] [المبلغ]`', { parse_mode: 'Markdown' });
    }

    const userRef = db.collection('users').where('email', '==', email);
    const snapshot = await userRef.get();

    if (snapshot.empty) {
        return ctx.reply('❌ المستخدم غير موجود.');
    }

    snapshot.forEach(async (doc) => {
        let currentBalance = doc.data().wallet || 0;
        await doc.ref.update({ wallet: currentBalance + amount });

        ctx.reply(`✅ تم إضافة ${amount} جنيه إلى رصيد ${email}.`);
    });
});

// ✅ خصم رصيد من المستخدم
bot.hears('➖ خصم رصيد', (ctx) => {
    ctx.reply('✏️ استخدم الأمر التالي لخصم رصيد:\n`/subrased [البريد الإلكتروني] [المبلغ]`', { parse_mode: 'Markdown' });
});

bot.command('subrased', async (ctx) => {
    let [_, email, amount] = ctx.message.text.split(' ');
    amount = parseFloat(amount);

    if (!email || isNaN(amount)) {
        return ctx.reply('❌ استخدم الأمر بالشكل الصحيح:\n`/subrased [البريد الإلكتروني] [المبلغ]`', { parse_mode: 'Markdown' });
    }

    const userRef = db.collection('users').where('email', '==', email);
    const snapshot = await userRef.get();

    if (snapshot.empty) {
        return ctx.reply('❌ المستخدم غير موجود.');
    }

    snapshot.forEach(async (doc) => {
        let currentBalance = doc.data().wallet || 0;

        if (currentBalance < amount) {
            return ctx.reply('❌ الرصيد غير كافٍ.');
        }

        await doc.ref.update({ wallet: currentBalance - amount });

        ctx.reply(`✅ تم خصم ${amount} جنيه من رصيد ${email}.`);
    });
});

// ✅ حذف مستخدم
bot.hears('🗑️ حذف مستخدم', (ctx) => {
    ctx.reply('✏️ استخدم الأمر التالي لحذف مستخدم:\n`/deluser [البريد الإلكتروني]`', { parse_mode: 'Markdown' });
});

bot.command('deluser', async (ctx) => {
    let [_, email] = ctx.message.text.split(' ');

    if (!email) {
        return ctx.reply('❌ استخدم الأمر بالشكل الصحيح:\n`/deluser [البريد الإلكتروني]`', { parse_mode: 'Markdown' });
    }

    const userRef = db.collection('users').where('email', '==', email);
    const snapshot = await userRef.get();

    if (snapshot.empty) {
        return ctx.reply('❌ المستخدم غير موجود.');
    }

    snapshot.forEach(async (doc) => {
        await doc.ref.delete();
        ctx.reply(`✅ تم حذف المستخدم: ${email}`);
    });
});

// ✅ إنشاء قسيمة جديدة
bot.hears('➕ إنشاء قسيمة', (ctx) => {
    ctx.reply('✏️ أدخل بيانات القسيمة بهذا الشكل:\n`/addcode [البريد الإلكتروني] [كود القسيمة]`', { parse_mode: 'Markdown' });
});

bot.command('addcode', async (ctx) => {
    let [_, email, code] = ctx.message.text.split(' ');

    if (!email || !code) {
        return ctx.reply('❌ استخدم الأمر بالشكل الصحيح:\n`/addcode [البريد الإلكتروني] [كود القسيمة]`', { parse_mode: 'Markdown' });
    }

    await db.collection('trader_codes').doc(email).set({ code: code });

    ctx.reply(`✅ تم إنشاء القسيمة بنجاح للمستخدم: ${email}\n🔐 كود القسيمة: *${code}*`, { parse_mode: 'Markdown' });
});

// ✅ حذف قسيمة مستخدم
bot.hears('❌ حذف قسيمة', (ctx) => {
    ctx.reply('✏️ أدخل البريد الإلكتروني لحذف القسيمة:\n`/delcode [البريد الإلكتروني]`', { parse_mode: 'Markdown' });
});

bot.command('delcode', async (ctx) => {
    let [_, email] = ctx.message.text.split(' ');

// ✅ تشغيل البوت
bot.launch();
