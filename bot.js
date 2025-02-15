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
            ['🗑️ حذف مستخدم', '🔄 تحديث البيانات'],
            ['✅ تنفيذ طلب']
        ])
        .resize()
        .oneTime()
    );
});

// عرض جميع المستخدمين
bot.hears('📋 عرض المستخدمين', async (ctx) => {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();

    if (snapshot.empty) return ctx.reply('❌ لا يوجد مستخدمين مسجلين.');

    let userList = '📋 قائمة المستخدمين:\n';
    snapshot.forEach(doc => {
        let user = doc.data();
        userList += `📧 ${user.email}\n👤 ${user.username}\n💰 ${user.wallet} جنيه\n\n`;
    });

    ctx.reply(userList);
});

// إضافة رصيد للمستخدم عبر البريد الإلكتروني
bot.hears('➕ إضافة رصيد', (ctx) => {
    ctx.reply('✏️ أدخل البيانات بهذا الشكل:\n`/addcredit [البريد] [المبلغ]`', { parse_mode: 'Markdown' });
});

bot.command('addcredit', async (ctx) => {
    let [_, email, amount] = ctx.message.text.split(' ');
    amount = parseFloat(amount);

    if (!email || isNaN(amount)) return ctx.reply('❌ استخدم الأمر: `/addcredit [البريد] [المبلغ]`', { parse_mode: 'Markdown' });

    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();

    if (snapshot.empty) return ctx.reply('❌ المستخدم غير موجود.');

    snapshot.forEach(async (doc) => {
        let newBalance = doc.data().wallet + amount;
        await doc.ref.update({ wallet: newBalance });
    });

    ctx.reply(`✅ تم إضافة ${amount} جنيه لرصيد المستخدم: ${email}`);
});

// خصم رصيد من المستخدم عبر البريد الإلكتروني
bot.hears('➖ خصم رصيد', (ctx) => {
    ctx.reply('✏️ أدخل البيانات بهذا الشكل:\n`/deductcredit [البريد] [المبلغ]`', { parse_mode: 'Markdown' });
});

bot.command('deductcredit', async (ctx) => {
    let [_, email, amount] = ctx.message.text.split(' ');
    amount = parseFloat(amount);

    if (!email || isNaN(amount)) return ctx.reply('❌ استخدم الأمر: `/deductcredit [البريد] [المبلغ]`', { parse_mode: 'Markdown' });

    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();

    if (snapshot.empty) return ctx.reply('❌ المستخدم غير موجود.');

    snapshot.forEach(async (doc) => {
        let newBalance = doc.data().wallet - amount;
        if (newBalance < 0) return ctx.reply('❌ لا يمكن أن يكون الرصيد أقل من صفر.');
        
        await doc.ref.update({ wallet: newBalance });
    });

    ctx.reply(`✅ تم خصم ${amount} جنيه من رصيد المستخدم: ${email}`);
});

// حذف مستخدم عبر البريد الإلكتروني
bot.hears('🗑️ حذف مستخدم', (ctx) => {
    ctx.reply('✏️ أدخل البيانات بهذا الشكل:\n`/deleteuser [البريد]`', { parse_mode: 'Markdown' });
});

bot.command('deleteuser', async (ctx) => {
    let [_, email] = ctx.message.text.split(' ');

    if (!email) return ctx.reply('❌ استخدم الأمر: `/deleteuser [البريد]`', { parse_mode: 'Markdown' });

    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();

    if (snapshot.empty) return ctx.reply('❌ المستخدم غير موجود.');

    snapshot.forEach(async (doc) => {
        await doc.ref.delete();
    });

    ctx.reply(`🗑️ تم حذف المستخدم بالبريد: ${email} بنجاح.`);
});

// تحديث بيانات المستخدمين وعرضها
bot.hears('🔄 تحديث البيانات', async (ctx) => {
    ctx.reply('♻️ جارٍ تحديث بيانات المستخدمين...');

    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();

    if (snapshot.empty) return ctx.reply('❌ لا يوجد بيانات لتحديثها.');

    let userList = '📋 تحديث قائمة المستخدمين:\n';
    snapshot.forEach(doc => {
        let user = doc.data();
        userList += `📧 ${user.email}\n👤 ${user.username}\n💰 ${user.wallet} جنيه\n\n`;
    });

    ctx.reply(userList);
});

// تنفيذ الطلب وتحديث حالته
bot.hears('✅ تنفيذ طلب', (ctx) => {
    ctx.reply('✏️ أدخل رقم الطلب الذي تم تنفيذه باستخدام الأمر:\n`/completeorder [رقم الطلب]`', { parse_mode: 'Markdown' });
});

bot.command('completeorder', async (ctx) => {
    let [_, orderId] = ctx.message.text.split(' ');

    if (!orderId) return ctx.reply('❌ استخدم الأمر بالشكل التالي: `/completeorder [رقم الطلب]`', { parse_mode: 'Markdown' });

    const ordersRef = db.collection('orders');
    const snapshot = await ordersRef.where('orderId', '==', parseInt(orderId)).get();

    if (snapshot.empty) return ctx.reply('❌ الطلب غير موجود.');

    snapshot.forEach(async (doc) => {
        await doc.ref.update({ status: "تم التنفيذ" });
    });

    ctx.reply(`✅ تم تنفيذ الطلب رقم ${orderId} ولن يتمكن المستخدم من إلغائه بعد الآن.`);
});

// تشغيل البوت
bot.launch();
