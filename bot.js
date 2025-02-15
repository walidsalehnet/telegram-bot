const { execSync } = require('child_process');
const { Telegraf } = require('telegraf');
const admin = require('firebase-admin');
const fs = require('fs');

// تثبيت الحزم تلقائيًا إذا لم تكن مثبتة
function installPackages() {
    try {
        require.resolve('telegraf');
        require.resolve('firebase-admin');
    } catch (e) {
        console.log("🚀 جاري تثبيت الحزم المفقودة...");
        execSync('npm install telegraf firebase-admin', { stdio: 'inherit' });
    }
}
installPackages();

// تحميل ملف Firebase Service Account
if (!process.env.FIREBASE_CREDENTIALS) {
    console.log("❌ متغير البيئة 'FIREBASE_CREDENTIALS' غير موجود. يرجى إضافته في Railway.");
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_CREDENTIALS))
});


const db = admin.firestore();
const bot = new Telegraf("7834569515:AAHGBtlyJ-clDjc_jv2j9TDudV0K0AlRjeo"); // استبدل بالتوكن الخاص بك

bot.start((ctx) => ctx.reply('👋 أهلا بك في بوت الإدارة! استخدم الأوامر للتحكم في المستخدمين.'));

bot.command('users', async (ctx) => {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();
    
    if (snapshot.empty) return ctx.reply('❌ لا يوجد مستخدمين.');

    let userList = '📋 قائمة المستخدمين:\n';
    snapshot.forEach(doc => {
        let user = doc.data();
        userList += `🆔 ${doc.id}\n👤 ${user.username}\n💰 ${user.wallet} جنيه\n📧 ${user.email}\n\n`;
    });

    ctx.reply(userList);
});

bot.command('addcredit', async (ctx) => {
    let [_, userId, amount] = ctx.message.text.split(' ');
    amount = parseFloat(amount);
    if (!userId || isNaN(amount)) return ctx.reply('❌ استخدم الأمر: /addcredit [userId] [المبلغ]');
    
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return ctx.reply('❌ المستخدم غير موجود.');

    let newBalance = userDoc.data().wallet + amount;
    await userRef.update({ wallet: newBalance });

    ctx.reply(`✅ تم إضافة ${amount} جنيه لرصيد المستخدم!`);
});

bot.command('deductcredit', async (ctx) => {
    let [_, userId, amount] = ctx.message.text.split(' ');
    amount = parseFloat(amount);
    if (!userId || isNaN(amount)) return ctx.reply('❌ استخدم الأمر: /deductcredit [userId] [المبلغ]');
    
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return ctx.reply('❌ المستخدم غير موجود.');

    let newBalance = userDoc.data().wallet - amount;
    if (newBalance < 0) return ctx.reply('❌ لا يمكن أن يكون الرصيد أقل من صفر.');

    await userRef.update({ wallet: newBalance });

    ctx.reply(`✅ تم خصم ${amount} جنيه من رصيد المستخدم!`);
});

bot.launch();
