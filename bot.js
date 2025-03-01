const { Telegraf, Markup } = require('telegraf');
const admin = require('firebase-admin');

// ✅ تحميل بيانات Firebase
admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_CREDENTIALS))
});

const db = admin.firestore();
const bot = new Telegraf("7834569515:AAHGBtlyJ-clDjc_jv2j9TDudV0K0AlRjeo"); // 🔥 استخدم التوكن الخاص بك

// ✅ قائمة المسؤولين (Admins)
let admins = new Set(); 

// ✅ تحميل الإداريين من Firebase عند تشغيل البوت
async function loadAdmins() {
    const snapshot = await db.collection('admins').get();
    snapshot.forEach(doc => admins.add(doc.id));
}
loadAdmins();

// ✅ دالة للتحقق مما إذا كان المستخدم مسؤولًا
function isAdmin(userId) {
    return admins.has(userId.toString());
}

// ✅ أمر لإضافة إداري جديد
bot.command('addadmin', async (ctx) => {
    const senderId = ctx.from.id.toString();
    
    if (!isAdmin(senderId)) {
        return ctx.reply('❌ ليس لديك صلاحية لإضافة إداريين.');
    }

    let [_, newAdminId] = ctx.message.text.split(' ');

    if (!newAdminId) {
        return ctx.reply('❌ استخدم الأمر بالشكل الصحيح:\n`/addadmin [ID الحساب]`', { parse_mode: 'Markdown' });
    }

    newAdminId = newAdminId.trim();

    await db.collection('admins').doc(newAdminId).set({ addedBy: senderId });
    admins.add(newAdminId);

    ctx.reply(`✅ تم إضافة المستخدم ${newAdminId} كإداري جديد.`);
});

// ✅ قائمة الأوامر المحدثة
bot.start((ctx) => {
    ctx.reply(
        '👋 أهلا بك في بوت الإدارة! اختر من القائمة:',
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

// ✅ إضافة كارت جديد
bot.hears('➕ إضافة كارت', (ctx) => {
    if (!isAdmin(ctx.from.id)) return ctx.reply('❌ ليس لديك صلاحية لاستخدام هذا الأمر.');
    ctx.reply('✏️ استخدم الأمر التالي لإضافة كارت:\n`/addcard [رقم الكارت] [الوحدات]`', { parse_mode: 'Markdown' });
});

// ✅ تحديث البيانات
bot.hears('🔄 تحديث البيانات', async (ctx) => {
    if (!isAdmin(ctx.from.id)) return ctx.reply('❌ ليس لديك صلاحية لاستخدام هذا الأمر.');
    ctx.reply('🔄 يتم تحديث البيانات الآن...');
});

// ✅ عرض المستخدمين المسجلين
bot.hears('📋 عرض المستخدمين', async (ctx) => {
    if (!isAdmin(ctx.from.id)) return ctx.reply('❌ ليس لديك صلاحية لاستخدام هذا الأمر.');
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

// ✅ تنفيذ طلب
bot.hears('✅ تنفيذ طلب', (ctx) => {
    if (!isAdmin(ctx.from.id)) return ctx.reply('❌ ليس لديك صلاحية لاستخدام هذا الأمر.');
    ctx.reply('✏️ أدخل رقم الطلب لتنفيذه بالشكل التالي:\n`/executeorder [رقم الطلب]`', { parse_mode: 'Markdown' });
});

// ✅ إضافة رصيد للمستخدم
bot.hears('➕ إضافة رصيد', (ctx) => {
    if (!isAdmin(ctx.from.id)) return ctx.reply('❌ ليس لديك صلاحية لاستخدام هذا الأمر.');
    ctx.reply('✏️ استخدم الأمر التالي لإضافة رصيد:\n`/addrased [البريد الإلكتروني] [المبلغ]`', { parse_mode: 'Markdown' });
});

// ✅ خصم رصيد من المستخدم
bot.hears('➖ خصم رصيد', (ctx) => {
    if (!isAdmin(ctx.from.id)) return ctx.reply('❌ ليس لديك صلاحية لاستخدام هذا الأمر.');
    ctx.reply('✏️ استخدم الأمر التالي لخصم رصيد:\n`/subrased [البريد الإلكتروني] [المبلغ]`', { parse_mode: 'Markdown' });
});

// ✅ إنشاء قسيمة جديدة
bot.hears('➕ إنشاء قسيمة', (ctx) => {
    if (!isAdmin(ctx.from.id)) return ctx.reply('❌ ليس لديك صلاحية لاستخدام هذا الأمر.');
    ctx.reply('✏️ أدخل بيانات القسيمة بهذا الشكل:\n`/addcode [البريد الإلكتروني] [كود القسيمة]`', { parse_mode: 'Markdown' });
});

// ✅ حذف قسيمة مستخدم
bot.hears('❌ حذف قسيمة', (ctx) => {
    if (!isAdmin(ctx.from.id)) return ctx.reply('❌ ليس لديك صلاحية لاستخدام هذا الأمر.');
    ctx.reply('✏️ أدخل البريد الإلكتروني لحذف القسيمة:\n`/delcode [البريد الإلكتروني]`', { parse_mode: 'Markdown' });
});

// ✅ تشغيل البوت مع معالجة الأخطاء
bot.launch().catch((err) => {
    console.error("🚨 خطأ في تشغيل البوت:", err);
});
