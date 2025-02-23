const { Telegraf, Markup } = require('telegraf');
const admin = require('firebase-admin');

// تحميل بيانات Firebase
admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_CREDENTIALS))
});

const db = admin.firestore();
const bot = new Telegraf("7834569515:AAHGBtlyJ-clDjc_jv2j9TDudV0K0AlRjeo"); // استبدل بالتوكن الخاص بك

// ✅ قائمة الأوامر كأزرار
bot.start((ctx) => {
    ctx.reply(
        '👋 أهلا بك في بوت الإدارة! اختر من القائمة:',
        Markup.keyboard([
            ['📋 عرض المستخدمين', '➕ إضافة رصيد', '➖ خصم رصيد'],
            ['🗑️ حذف مستخدم', '🔄 تحديث البيانات'],
            ['✅ تنفيذ طلب', '➕ إضافة كارت']
        ])
        .resize()
        .oneTime()
    );
});

// ✅ عرض المستخدمين
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

// ✅ إضافة كارت جديد لمتجر الكروت
bot.hears('➕ إضافة كارت', (ctx) => {
    ctx.reply('✏️ أدخل بيانات الكارت بهذا الشكل:\n`/addcard [كود الكارت] [عدد الوحدات]`', { parse_mode: 'Markdown' });
});

bot.command('addcard', async (ctx) => {
    let [_, cardNumber, units] = ctx.message.text.split(' ');
    units = parseInt(units);

    if (!cardNumber || isNaN(units)) {
        return ctx.reply('❌ استخدم الأمر بالشكل الصحيح:\n`/addcard [كود الكارت] [عدد الوحدات]`', { parse_mode: 'Markdown' });
    }

    const addedTime = new Date().getTime();

    await db.collection('cards').add({
        number: cardNumber,
        units: units,
        addedTime: addedTime
    });

    ctx.reply(`✅ تم إضافة كارت جديد بنجاح:\n🔢 *رقم الكارت:* ${cardNumber}\n⚡ *عدد الوحدات:* ${units} وحدة`, { parse_mode: 'Markdown' });
});

// ✅ تنفيذ الطلبات
bot.hears('✅ تنفيذ طلب', (ctx) => {
    ctx.reply('🚀 ميزة تنفيذ الطلبات قيد التطوير...');
});

// ✅ تحديث البيانات
bot.hears('🔄 تحديث البيانات', (ctx) => {
    ctx.reply('🔄 يتم تحديث البيانات الآن...');
});

// ✅ تشغيل البوت
bot.launch();
