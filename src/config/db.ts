import mongoose from 'mongoose';

export const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) {
        return;
    }
    
    try {
        await mongoose.connect(process.env.MONGO_URI as string);
        console.log('📦 BENTENG DATA: MongoDB Atlas Terhubung!');
    } catch (error) {
        console.error('❌ FATAL: Koneksi MongoDB Gagal', error);
        process.exit(1); 
    }
};