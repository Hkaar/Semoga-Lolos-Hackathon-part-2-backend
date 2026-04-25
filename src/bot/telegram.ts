import { Bot, InlineKeyboard, Keyboard } from "grammy";
import { analyzeClimateAction, askEcoAgent } from '../ai/vision';
import { mintRewardOnSolana } from '../blockchain/solana';
import { Report } from '../models/Report';
import { User } from "../models/User";

const bot = new Bot(process.env.TELEGRAM_TOKEN as string);
const userCooldowns = new Map<string, number>();
const userStrikes = new Map<string, number>();
const COOLDOWN_TIME = 60 * 1000;

const chatCooldowns = new Map<string, number>();
const CHAT_COOLDOWN_TIME = 10 * 1000;

bot.command("start", (ctx) => {
    ctx.reply("🌍 Selamat datang di KlimaBot!\nSilakan kirimkan foto sampah untuk divalidasi oleh AI dan dapatkan Eco-Token di Solana!");
});

bot.command("reward", async (ctx) => {
    const chatId = ctx.chat.id.toString();
    
    const user = await User.findOne({ telegramId: chatId });
    const saldoPoin = user ? user.totalImpactScore : 0;

    const rewardMenu = new InlineKeyboard()
        .text("📱 Pulsa Rp5.000 (50 Poin)", "redeem_pulsa_50").row()
        .text("☕ Voucher Kopi 15% (100 Poin)", "redeem_kopi_100").row()
        .text("🌳 Donasi 1 Pohon Bakau (200 Poin)", "redeem_pohon_200");

    await ctx.reply(
        `🎁 **Katalog Reward KlimaBot**\n\n💳 **Saldo Poin Anda:** \`${saldoPoin} Poin\`\n\nPilih hadiah yang ingin Anda tukarkan di bawah ini:`, 
        { parse_mode: "Markdown", reply_markup: rewardMenu }
    );
});

bot.command("profile", async (ctx) => {
    const chatId = ctx.chat.id.toString();
    const user = await User.findOne({ telegramId: chatId });

    if (!user) {
        return ctx.reply("Anda belum terdaftar. Kirim foto sampah pertama Anda untuk memulai!");
    }

    let tier = "🌱 Pemula Hijau";
    if (user.totalImpactScore > 100) tier = "⚔️ Ksatria Lingkungan";
    if (user.totalImpactScore > 500) tier = "👑 Penjaga Bumi (Earth Guardian)";

    await ctx.reply(
        `👤 **Profil Pahlawan Bumi**\n\n` +
        `🎖️ **Pangkat:** ${tier}\n` +
        `🌱 Total Aksi: ${user.totalReports} kali\n` +
        `💳 Saldo Poin: ${user.totalImpactScore} Poin\n\n` +
        `🔗 **Alamat Dompet Solana:**\n\`${user.solanaWalletAddress || "Belum dibuat"}\`\n\n` +
        `*Terus kumpulkan poin untuk mencapai pangkat tertinggi!*`,
        { parse_mode: "Markdown" }
    );
});

bot.on("message:photo", async (ctx) => {
    const chatId = ctx.chat.id.toString();

    const now = Date.now();

    if (userCooldowns.has(chatId)) {
        const lastTime = userCooldowns.get(chatId)!;
        if (now - lastTime < COOLDOWN_TIME) {
            const sisaWaktu = Math.ceil((COOLDOWN_TIME - (now - lastTime)) / 1000);
            return ctx.reply(`⏳ **Sistem AI Sedang Pendinginan.**\nMohon tunggu ${sisaWaktu} detik lagi sebelum mengirim foto baru.`);
        }
    }

    userCooldowns.set(chatId, now);

    const loadingMsg = await ctx.reply("⏳ Memindai gambar dengan AI Vision...");

    try {
        const photo = ctx.message.photo;
        const fileId = photo[photo.length - 1].file_id;
        const file = await ctx.api.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${file.file_path}`;

        const aiResult = await analyzeClimateAction(fileUrl);

        if (!aiResult.isAuthentic) {
            let strikes = (userStrikes.get(chatId) || 0) + 1;

            if (strikes >= 3) {
                await User.findOneAndUpdate(
                    { telegramId: chatId },
                    { $inc: { totalImpactScore: -5 } },
                    { upsert: true }
                );
                userStrikes.delete(chatId); 
                
                await ctx.api.editMessageText(chatId, loadingMsg.message_id, 
                    `❌ **Verifikasi Gagal.**\nAlasan: ${aiResult.reasoning}\n\n⚠️ **PENALTI: -5 POIN!**\nAnda telah 3x berturut-turut mengirim foto tidak valid. Poin Anda dipotong sebagai sanksi.`
                );
            } else {
                userStrikes.set(chatId, strikes);
                await ctx.api.editMessageText(chatId, loadingMsg.message_id, 
                    `❌ **Verifikasi Gagal.**\nAlasan: ${aiResult.reasoning}\n\n⚠️ *Peringatan ${strikes}/3: Jika 3x berturut-turut mengirim gambar palsu, poin Anda akan dipotong.*`
                );
            }
            return; 
        }

        userStrikes.delete(chatId);

        const eduKeyboard = new InlineKeyboard()
            .text("📖 Cara mengolah sampah ini", `edu_${aiResult.actionType}`)

        await ctx.api.editMessageText(
            chatId, 
            loadingMsg.message_id, 
            `✅ Validasi Sukses!\nJenis: ${aiResult.actionType}\nSkor Ekologi: ${aiResult.impactScore}\n\nMemproses transaksi Solana...`, 
            { reply_markup: eduKeyboard }
        );

        const txHash = await mintRewardOnSolana(chatId, aiResult.impactScore);

        await Report.create({
            chatId,
            imageUrl: fileUrl,
            isAuthentic: aiResult.isAuthentic,
            actionType: aiResult.actionType,
            impactScore: aiResult.impactScore,
            aiReasoning: aiResult.reasoning,
            solanaTxHash: txHash,
            imageHash: aiResult.imageHash
        });

        const user = await User.findOneAndUpdate(
            { telegramId: chatId }, 
            { 
                $set: { 
                    firstName: ctx.message.from.first_name || "Warga",
                    username: ctx.message.from.username || "anonim"
                },
                $inc: { 
                    totalImpactScore: aiResult.impactScore, 
                    totalReports: 1 
                }
            },
            { new: true, upsert: true } 
        );

        await ctx.reply(`🎉 Reward berhasil dikirim!\nCek transaksi Anda di Blockchain:\nhttps://explorer.solana.com/tx/${txHash}?cluster=devnet`);

        const locationKeyboard = new Keyboard()
            .requestLocation("📍 Bagikan Lokasi Temuan")
            .oneTime() 
            .resized();

        await ctx.reply("Satu langkah lagi! Bagikan lokasi temuanmu untuk memetakan Live Heatmap kami dan bantu komunitas memantau titik sampah.", {
            reply_markup: locationKeyboard
        });

    } catch (error) {
        console.error("Bot Pipeline Error:", error);
        ctx.reply("⚠️ Terjadi kesalahan pada server. Coba lagi nanti.");
        userCooldowns.delete(chatId);
    }
});

bot.on("message:text", async (ctx) => {
    const chatId = ctx.chat.id.toString();
    const text = ctx.message.text;
    const now = Date.now();

    if (text.startsWith("/")) return;

    if (chatCooldowns.has(chatId)) {
        const lastTime = chatCooldowns.get(chatId)!;
        if (now - lastTime < CHAT_COOLDOWN_TIME) {
            return ctx.reply(`⏳ Sedang memproses chat sebelumnya yang kamu kirim, tunggu sebentar.`); 
        }
    }

    chatCooldowns.set(chatId, now);

    await ctx.api.sendChatAction(ctx.chat.id, "typing");

    try {
        const reply = await askEcoAgent(text);
        await ctx.reply(reply, { parse_mode: "Markdown" });
    } catch (error) {
        console.error("Agent Spam Error:", error);
        chatCooldowns.delete(chatId);
    }
});

bot.on("message:location", async (ctx) => {
    const chatId = ctx.chat.id.toString();
    const { latitude, longitude } = ctx.message.location;

    try {
        const lastReport = await Report.findOne({ chatId }).sort({ createdAt: -1 });

        if (lastReport) {
            lastReport.location = { lat: latitude, lng: longitude };
            await lastReport.save();

            await ctx.reply("📍 Lokasi tercatat! Terima kasih telah berkontribusi pada peta DePIN KlimaBot.", {
                reply_markup: { remove_keyboard: true } 
            });
        }
    } catch (error) {
        console.error("Location Error:", error);
    }
});

bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;
    const chatId = ctx.callbackQuery.from.id.toString();

    if (data.startsWith("edu_")) {
        await ctx.answerCallbackQuery(); 
        const jenisSampah = data.replace("edu_", "");
        
        let edukasi = "💡 Kumpulkan sampah ini, pastikan dalam keadaan kering, dan bawa ke Bank Sampah terdekat.";
        
        if (jenisSampah.toLowerCase().includes("organik")) {
            edukasi = "💡 Tips Organik: Cincang sisa makanan/daun ini, masukkan ke dalam pot atau lubang biopori, dan campur dengan sedikit tanah untuk dijadikan pupuk kompos yang menyuburkan tanamanmu!";
        } else if (jenisSampah.toLowerCase().includes("plastik") || jenisSampah.toLowerCase().includes("anorganik")) {
            edukasi = "💡 Tips Plastik: Bilas botol/plastik ini sampai bersih, remukkan agar menghemat tempat. Kamu bisa menyulapnya menjadi pot tanaman kecil atau menjualnya ke pengepul terdekat!";
        }

        if (ctx.callbackQuery.message) {
            await ctx.reply(`🌱 **Panduan Edukasi KlimaBot**\n\nUntuk: ${jenisSampah}\n\n${edukasi}`, { 
                parse_mode: "Markdown",
                reply_parameters: { message_id: ctx.callbackQuery.message.message_id } 
            });
        }
    }

    if (data.startsWith("redeem_")) {
        const parts = data.split("_"); 
        const itemName = parts[1].toUpperCase();
        const cost = parseInt(parts[2]);

        const user = await User.findOne({ telegramId: chatId });
        const currentBalance = user ? user.totalImpactScore : 0;

        if (currentBalance < cost) {
            await ctx.answerCallbackQuery({ 
                text: `❌ Poin Anda tidak cukup! Anda butuh ${cost} poin, saldo Anda ${currentBalance}.`, 
                show_alert: true 
            });
            return;
        }

        await ctx.answerCallbackQuery("Memproses penukaran...");

        if (user) {
            user.totalImpactScore -= cost;
            await user.save();
        }

        if (ctx.callbackQuery.message) {
            await ctx.api.editMessageText(
                chatId, 
                ctx.callbackQuery.message.message_id, 
                `🎉 **PENUKARAN SUKSES!** 🎉\n\nAnda telah menukarkan **${cost} Poin** untuk **${itemName}**.\n\n💳 Sisa saldo Anda: \`${user?.totalImpactScore} Poin\`.\n\n⏳ *Reward sedang diproses oleh admin kami. Terus jaga bumi kita!* 🌍`, 
                { parse_mode: "Markdown" } 
            );
        }
    }
});

bot.on("message:text", async (ctx) => {
    const text = ctx.message.text;

    if (text.startsWith("/")) return;

    await ctx.api.sendChatAction(ctx.chat.id, "typing");

    try {
        const reply = await askEcoAgent(text);
        
        await ctx.reply(reply, { parse_mode: "Markdown" });
    } catch (error) {
        await ctx.reply("Waduh, Klima-Agent sedang pusing mengurus sampah dunia. Coba tanya lagi nanti ya!");
    }
});

if (!(globalThis as any).botStarted) {
    bot.start();
    (globalThis as any).botStarted = true;
    console.log("🤖 Sistem Polling Grammy Telegram AKTIF.");
}