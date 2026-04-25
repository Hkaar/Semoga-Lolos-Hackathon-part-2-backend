import { GoogleGenerativeAI } from "@google/generative-ai";
import crypto from "crypto";
import { Report } from "../models/Report"; 

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string); 

export const analyzeClimateAction = async (imageUrl: string) => {
    try {
        const imageResp = await fetch(imageUrl);
        const arrayBuffer = await imageResp.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        const imageHash = crypto.createHash('md5').update(buffer).digest('hex');
        
        const isDuplicate = await Report.exists({ imageHash: imageHash });
        if (isDuplicate) {
            return {
                isAuthentic: false,
                actionType: "Fraud",
                impactScore: 0,
                reasoning: "Sistem mendeteksi bahwa foto ini persis sama dengan laporan yang sudah pernah diklaim sebelumnya (Duplikat).",
                imageHash 
            };
        }

        const base64Image = buffer.toString("base64");
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `Kamu adalah Auditor Lingkungan dari KlimaBot. Tugasmu memvalidasi foto aksi bersih sampah, daur ulang, atau tumpukan sampah yang dikumpulkan warga. 
        
        ATURAN VALIDASI (PENTING):
        1. TOLAK HANYA JIKA: Gambar difoto dari layar monitor/laptop (ada pola moiré) atau murni buatan AI generator (gambar tidak logis).
        2. TERIMA JIKA: Gambar menunjukkan sampah (plastik, organik, kertas, dll) atau aksi lingkungan, meskipun itu hanya difoto di atas meja, di dalam kamar, atau terlihat seperti tumpukan sampah biasa. Beri toleransi tinggi selama itu adalah foto sampah.
        3. Beri skor TINGGI (>70) hanya jika sampah terlihat sudah dimasukkan ke dalam kantong sampah (trash bag), karung, atau tong sampah. Jika sampah hanya dijejerkan di atas meja atau lantai biasa, beri skor RENDAH (<30).
        
        ATURAN OUTPUT JSON:
        Bagian "reasoning" WAJIB sangat singkat, ramah, dan tidak lebih dari 2 kalimat pendek! Jangan berikan analisis forensik yang panjang.
        
        WAJIB BALAS DENGAN JSON FORMAT MURNI:
        { 
          "isAuthentic": boolean, 
          "actionType": "string", 
          "impactScore": number, 
          "reasoning": "string (Maksimal 2 kalimat pendek)" 
        }`;

        const result = await model.generateContent([
            prompt,
            { inlineData: { data: base64Image, mimeType: "image/jpeg" } }
        ]);

        const responseText = result.response.text();
        const jsonResult = JSON.parse(responseText);
        
        return { ...jsonResult, imageHash }; 

    } catch (error) {
        console.error("Gemini AI Error:", error);
        return { isAuthentic: false, actionType: "Error", impactScore: 0, reasoning: "Gagal memproses gambar." };
    }
};

export const askEcoAgent = async (userMessage: string) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 
        
        const prompt = `Kamu adalah "Klima-Agent", asisten pintar dari aplikasi Klima. 
        Tugasmu menjawab pertanyaan warga seputar lingkungan, cara daur ulang, atau info bank sampah.
        Aturan wajib: 
        1. Jawab dengan sangat singkat, padat, dan ramah (maksimal 2 paragraf).
        2. Gunakan emoji agar menarik.
        3. Jika ditanya hal di luar lingkungan/sampah/kripto/Klima, tolak dengan sopan.
        
        Pertanyaan Warga: "${userMessage}"`;

        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error("Chat Agent Error:", error);
        return "Maaf, sistem komunikasi Klima-Agent sedang mengalami gangguan. 🌍🔌";
    }
};