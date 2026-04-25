// Company.ts
import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
    // Section 1 - Legal Identity
    name:    { type: String, required: true, unique: true },
    npwp:    { type: String, required: true, unique: true },
    nib:     { type: String, required: true, unique: true },
    address: { type: String, required: true },

    // Auth
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },

    // Section 2 - Sustainability Goals
    targetCategory:    { type: String, required: true },
    csrRegion:         { type: String, required: true },
    annualTargetVolume:{ type: Number, required: true },
    annualTargetUnit:  { type: String, required: true, default: 'Ton' },

    // Section 3 - PIC
    picName:  { type: String, required: true },
    picTitle: { type: String, required: true },
    phone:    { type: String, required: true },

    // Section 4 - Subscription
    subscriptionPlan: {
        type: String,
        required: true,
        enum: ['lite', 'pro', 'enterprise'],
        default: 'lite',
    },
    paymentMethod: { type: String, required: true },

    // Stats
    totalImpactAcquired: { type: Number, default: 0 },
}, { timestamps: true });

export const Company = mongoose.model('Company', companySchema);