import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
    name: { type: String, required: true },
    targetCategory: { type: String, required: true }, 
    totalImpactAcquired: { type: Number, default: 0 } 
}, { timestamps: true });

export const Company = mongoose.model('Company', companySchema);