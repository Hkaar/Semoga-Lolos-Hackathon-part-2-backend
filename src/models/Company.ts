import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
    name: { type: String, required: true },
    targetCategory: { type: String, required: true }, // Contoh: "plastik", "organik", "kertas"
    totalImpactAcquired: { type: Number, default: 0 } // Total skor CSR yang mereka kumpulkan
}, { timestamps: true });

export const Company = mongoose.model('Company', companySchema);