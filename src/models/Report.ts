import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
    chatId: { type: String, required: true },
    imageUrl: { type: String, required: true },
    isAuthentic: { type: Boolean, required: true },
    actionType: { type: String, default: "Unidentified" },
    impactScore: { type: Number, default: 0 },
    aiReasoning: { type: String },
    solanaTxHash: { type: String }, 
    imageHash: { type: String }, 
    location: {
        lat: { type: Number },
        lng: { type: Number }
    },
}, { timestamps: true });

export const Report = mongoose.model('Report', reportSchema);