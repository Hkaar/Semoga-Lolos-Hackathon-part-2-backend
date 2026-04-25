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

        const prompt = `Kamu adalah Auditor Forensik Lingkungan tingkat tinggi. Tugasmu memvalidasi foto aksi bersih sampah atau tanam pohon. 
        
        KAMU WAJIB MENOLAK FOTO JIKA:
        1. Difoto dari layar (monitor, laptop, HP lain). Cari pola moiré, piksel layar, atau pantulan kaca.
        2. Gambar buatan AI (AI Generated). Cari anatomi aneh, tekstur terlalu mulus, atau teks *gibberish*.
        3. Gambar stok internet (terlalu profesional/studio).
        4. Tidak ada konteks lingkungan nyata (hanya foto botol di atas kasur/meja kamar).
        
        Untuk lolos, gambar harus terlihat seperti diambil langsung dari kamera HP di luar ruangan/lingkungan asli.
        
        WAJIB BALAS DENGAN JSON FORMAT MURNI:
        { 
          "isAuthentic": boolean, 
          "actionType": "string", 
          "impactScore": number, 
          "reasoning": "string (Jelaskan secara detail kenapa ditolak/diterima berdasarkan forensik visual)" 
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
        
        const prompt = `Kamu adalah "Klima-Agent", asisten pintar dari aplikasi KlimaChain. 
        Tugasmu menjawab pertanyaan warga seputar lingkungan, cara daur ulang, atau info bank sampah.
        Aturan wajib: 
        1. Jawab dengan sangat singkat, padat, dan ramah (maksimal 2 paragraf).
        2. Gunakan emoji agar menarik.
        3. Jika ditanya hal di luar lingkungan/sampah/kripto/KlimaChain, tolak dengan sopan.
        
        Pertanyaan Warga: "${userMessage}"`;

        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error("Chat Agent Error:", error);
        return "Maaf, sistem komunikasi Klima-Agent sedang mengalami gangguan. 🌍🔌";
    }
};