const { Telegraf, Markup } = require('telegraf');
const admin = require('firebase-admin');

// تحميل بيانات Firebase
admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_CREDENTIALS))
});

const db = admin.firestore();
const bot = new Telegraf("7834569515:AAHGBtlyJ-clDjc_jv2j9TDudV0K0AlRjeo"); // استبدل بالتوكن الخاص بك

// قائمة الأوامر كأزرار
bot.start((ctx) => {
    ctx.reply(
        '👋 أهلا بك في بوت الإدارة! اختر من القائمة:',
        Markup.keyboard([
            ['📋 عرض المستخدمين', '➕ إضافة رصيد', '➖ خصم رصيد'],
            ['🗑️ حذف مستخدم', '🔄 تحديث البيانات']
        ])
        .resize()
        .oneTime()
    );
});

// عرض جميع المستخدمين
bot.hears('📋 عرض المستخدمين', async (ctx) => {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();

    if (snapshot.empty) return ctx.reply('❌ لا يوجد مستخدمين.');

    let userList = '📋 قائمة المستخدمين:\n';
    snapshot.forEach(doc => {
        let user = doc.data();
        userList += `🆔 ${doc.id}\n👤 ${user.username}\n📧 ${user.email}\n💰 ${user.wallet} جنيه\n\n`;
    });

    ctx.reply(userList);
});

// إضافة رصيد
bot.hears('➕ إضافة رصيد', (ctx) => {
    ctx.reply('✏️ أدخل البيانات بهذا الشكل:\n`/addcredit [userId] [المبلغ]`', { parse_mode: 'Markdown' });
});

bot.command('addcredit', async (ctx) => {
    let [_, userId, amount] = ctx.message.text.split(' ');
    amount = parseFloat(amount);

    if (!userId || isNaN(amount)) return ctx.reply('❌ استخدم الأمر: `/addcredit [userId] [المبلغ]`', { parse_mode: 'Markdown' });

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) return ctx.reply('❌ المستخدم غير موجود.');

    let newBalance = userDoc.data().wallet + amount;
    await userRef.update({ wallet: newBalance });

    ctx.reply(`✅ تم إضافة ${amount} جنيه لرصيد المستخدم!`);
});

// خصم رصيد
bot.hears('➖ خصم رصيد', (ctx) => {
    ctx.reply('✏️ أدخل البيانات بهذا الشكل:\n`/deductcredit [userId] [المبلغ]`', { parse_mode: 'Markdown' });
});

bot.command('deductcredit', async (ctx) => {
    let [_, userId, amount] = ctx.message.text.split(' ');
    amount = parseFloat(amount);

    if (!userId || isNaN(amount)) return ctx.reply('❌ استخدم الأمر: `/deductcredit [userId] [المبلغ]`', { parse_mode: 'Markdown' });

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) return ctx.reply('❌ المستخدم غير موجود.');

    let newBalance = userDoc.data().wallet - amount;
    if (newBalance < 0) return ctx.reply('❌ لا يمكن أن يكون الرصيد أقل من صفر.');

    await userRef.update({ wallet: newBalance });

    ctx.reply(`✅ تم خصم ${amount} جنيه من رصيد المستخدم!`);
});

// حذف مستخدم
bot.hears('🗑️ حذف مستخدم', (ctx) => {
    ctx.reply('✏️ أدخل البيانات بهذا الشكل:\n`/deleteuser [userId]`', { parse_mode: 'Markdown' });
});

bot.command('deleteuser', async (ctx) => {
    let [_, userId] = ctx.message.text.split(' ');

    if (!userId) return ctx.reply('❌ استخدم الأمر: `/deleteuser [userId]`', { parse_mode: 'Markdown' });

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) return ctx.reply('❌ المستخدم غير موجود.');

    await userRef.delete();
    ctx.reply(`🗑️ تم حذف المستخدم ID: ${userId} بنجاح.`);
});

// تحديث البيانات
bot.hears('🔄 تحديث البيانات', (ctx) => {
    ctx.reply('♻️ جارٍ تحديث بيانات المستخدمين...');

    db.collection('users').get().then(snapshot => {
        if (snapshot.empty) return ctx.reply('❌ لا يوجد بيانات لتحديثها.');

        snapshot.forEach(doc => {
            const user = doc.data();
            ctx.reply(`🆔 ${doc.id}\n👤 ${user.username}\n📧 ${user.email}\n💰 ${user.wallet} جنيه`);
        });
    });
});

// تشغيل البوت
bot.launch();
