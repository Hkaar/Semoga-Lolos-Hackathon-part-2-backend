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

        const prompt = `Kamu adalah Auditor Lingkungan dari KlimaChain. Tugasmu memvalidasi foto aksi lingkungan.
        
        ATURAN VALIDASI:
        1. TOLAK JIKA: Gambar difoto dari layar monitor atau murni buatan AI generator.
        2. TERIMA JIKA: Gambar menunjukkan aksi nyata lingkungan.
        
        LOGIKA PENILAIAN (STRICT):
        - Beri skor TINGGI (>70) hanya jika sampah terlihat sudah dimasukkan ke dalam kantong sampah (trash bag), karung, atau tong sampah. Ini menandakan aksi nyata pengumpulan.
        - Jika sampah hanya dijejerkan di atas meja atau lantai biasa tanpa wadah pengumpulan, beri skor RENDAH (<30).
        
        KATEGORI WAJIB:
        - "Plastic Waste" (Botol, plastik, kemasan)
        - "Air Pollution" (Aksi naik sepeda, transportasi umum, atau penanganan asap)
        - "General Environment" (Organik, kertas, atau aksi bersih-bersih umum)
        
        ATURAN OUTPUT JSON:
        Bagian "reasoning" maksimal 2 kalimat pendek!
        Estimasi dampak lingkungan (extractedMetrics):
        - waste_kg: Estimasi berat sampah (Kg).
        - trees_planted: Jumlah pohon yang ditanam.
        - co2e_reduced_kg: Estimasi reduksi emisi (impactScore * 0.2).
        
        WAJIB BALAS DENGAN JSON FORMAT MURNI:
        { 
          "isAuthentic": boolean, 
          "actionType": "Plastic Waste" | "Air Pollution" | "General Environment", 
          "impactScore": number, 
          "reasoning": "string",
          "title": "string",
          "extractedMetrics": {
            "waste_kg": number,
            "trees_planted": number,
            "co2e_reduced_kg": number
          }
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