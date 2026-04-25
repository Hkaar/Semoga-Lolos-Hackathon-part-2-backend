import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
    chatId: { type: String, required: true },
    userName: { type: String, default: "Pahlawan Anonim" },
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

    title: { type: String, default: "Unidentified Action" },

    location_name: { type: String },
    extractedMetrics: {
        waste_kg: { type: Number, default: 0 },
        trees_planted: { type: Number, default: 0 },
        co2e_reduced_kg: { type: Number, default: 0 },
    },

    sponsoredBy: [{
        companyName: { type: String },
        splitScore: { type: Number }
    }]
}, { timestamps: true });

export const Report = mongoose.model('Report', reportSchema);