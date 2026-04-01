import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: 'AIzaSyA2ZutIFGKp8iblBNYOEPubCKgMpTyxFeQ' });

async function check() {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-pro',
            contents: 'Hello'
        });
        console.log("Success gemini-1.5-pro");
    } catch(e) {
        console.error("1.5 pro failed:", e.message);
    }
}
check();
