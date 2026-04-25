import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }, // bcrypt hashed
    targetCategory: { type: String, required: true }, 
    totalImpactAcquired: { type: Number, default: 0 } 
}, { timestamps: true });

export const Company = mongoose.model('Company', companySchema);