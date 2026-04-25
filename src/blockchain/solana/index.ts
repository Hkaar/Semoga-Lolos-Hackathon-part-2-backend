import { User } from "@/src/models/User";
import { deductTokens, rewardUser } from "./token-service";
import { generateWallet, keypairFromEncrypted } from "./wallet-service";

export const mintRewardOnSolana = async (chatId: string, amount: number): Promise<string> => {
    console.log(`[WEB3] Memulai proses minting untuk ChatID: ${chatId}`);

    let user = await User.findOne({ telegramId: chatId });
    if (!user) {
        user = await User.create({ telegramId: chatId, firstName: "Unknown" });
        console.log(`[WEB3] User baru dibuat untuk ${chatId}`);
    }

    if (!user.solanaWalletAddress || !user.encryptedPrivateKey) {
        const wallet = generateWallet();
        user.solanaWalletAddress = wallet.address;
        user.encryptedPrivateKey = wallet.encryptedPrivateKey;
        await user.save();
        console.log(`[WEB3] Wallet baru dibuat untuk ${chatId}: ${wallet.address}`);
    }

    const sig = await rewardUser(user.solanaWalletAddress!, amount);
    return sig;
};

export const deductRewardOnSolana = async (chatId: string, amount: number): Promise<string> => {
    console.log(`[WEB3] Memulai proses burning untuk ChatID: ${chatId}`);

    let user = await User.findOne({ telegramId: chatId });
    if (!user) {
        user = await User.create({ telegramId: chatId, firstName: "Unknown" });
        console.log(`[WEB3] User baru dibuat untuk ${chatId}`);
    }

    if (!user.solanaWalletAddress || !user.encryptedPrivateKey) {
        const wallet = generateWallet();
        user.solanaWalletAddress = wallet.address;
        user.encryptedPrivateKey = wallet.encryptedPrivateKey;
        await user.save();
        console.log(`[WEB3] Wallet baru dibuat untuk ${chatId}: ${wallet.address}`);
    }

    const keyPair = keypairFromEncrypted(user.encryptedPrivateKey!);
    const sig = await deductTokens(keyPair, amount);
    return sig;
};