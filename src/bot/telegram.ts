import { Bot, InlineKeyboard, Keyboard } from "grammy";
import { analyzeClimateAction } from '../ai/vision';
import { mintRewardOnSolana } from '../blockchain/solana';
import { Report } from '../models/Report';
import { User } from "../models/User";

const bot = new Bot(process.env.TELEGRAM_TOKEN as string);

bot.command("start", (ctx) => {
    ctx.reply("🌍 Selamat datang di KlimaBot!\nSilakan kirimkan foto sampah untuk divalidasi oleh AI dan dapatkan Eco-Token di Solana!");
});

bot.on("message:photo", async (ctx) => {
    const chatId = ctx.chat.id.toString();
    const loadingMsg = await ctx.reply("⏳ Memindai gambar dengan AI Vision...");

    try {
        const photo = ctx.message.photo;
        const fileId = photo[photo.length - 1].file_id;
        const file = await ctx.api.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${file.file_path}`;

        const aiResult = await analyzeClimateAction(fileUrl);

        if (!aiResult.isAuthentic) {
            await ctx.api.editMessageText(chatId, loadingMsg.message_id, `❌ Verifikasi Gagal.\nAlasan: ${aiResult.reasoning}`);
            return;
        }

        const eduKeyboard = new InlineKeyboard()
            .text("📖 Cara mengolah sampah ini", `edu_${aiResult.actionType}`)

        await ctx.api.editMessageText(
            chatId, 
            loadingMsg.message_id, 
            `✅ Validasi Sukses!\nJenis: ${aiResult.actionType}\nSkor Ekologi: ${aiResult.impactScore}\n\nMemproses transaksi Solana...`, 
            { reply_markup: eduKeyboard }
        );

        const txHash = await mintRewardOnSolana(chatId, 10);

        await Report.create({
            chatId,
            imageUrl: fileUrl,
            isAuthentic: aiResult.isAuthentic,
            actionType: aiResult.actionType,
            impactScore: aiResult.impactScore,
            aiReasoning: aiResult.reasoning,
            solanaTxHash: txHash
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

            await ctx.reply("📍 Lokasi tercatat! Terima kasih telah berkontribusi pada peta DePIN KlimaChain.", {
                reply_markup: { remove_keyboard: true } 
            });
        }
    } catch (error) {
        console.error("Location Error:", error);
    }
});

bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;
    
    await ctx.answerCallbackQuery();

    if (data.startsWith("edu_")) {
        const jenisSampah = data.replace("edu_", "");
        
        let edukasi = "💡 Kumpulkan sampah ini, pastikan dalam keadaan kering, dan bawa ke Bank Sampah terdekat.";
        
        if (jenisSampah.toLowerCase().includes("organik")) {
            edukasi = "💡 Tips Organik: Cincang sisa makanan/daun ini, masukkan ke dalam pot atau lubang biopori, dan campur dengan sedikit tanah untuk dijadikan pupuk kompos yang menyuburkan tanamanmu!";
        } else if (jenisSampah.toLowerCase().includes("plastik") || jenisSampah.toLowerCase().includes("anorganik")) {
            edukasi = "💡 Tips Plastik: Bilas botol/plastik ini sampai bersih, remukkan agar menghemat tempat. Kamu bisa menyulapnya menjadi pot tanaman kecil atau menjualnya ke pengepul terdekat!";
        }

        await ctx.reply(`🌱 **Panduan Edukasi KlimaChain**\n\nUntuk: ${jenisSampah}\n\n${edukasi}`, { parse_mode: "Markdown" });
    }
});

if (!(globalThis as any).botStarted) {
    bot.start();
    (globalThis as any).botStarted = true;
    console.log("🤖 Sistem Polling Grammy Telegram AKTIF.");
}