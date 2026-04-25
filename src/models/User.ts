import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    telegramId: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    username: { type: String },
    
    // --- INTEGRASI WEB3 ---
    solanaWalletAddress: { type: String, default: null }, 
    encryptedPrivateKey: { type: String, default: null },
    
    // --- GAMIFIKASI & LEADERBOARD ---
    totalImpactScore: { type: Number, default: 0 }, 
    totalReports: { type: Number, default: 0 }, 
    
    role: { type: String, default: "Eco-Warrior" } 
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);