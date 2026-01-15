import React, { useRef, useState } from 'react';
import { analyzeImage } from '../services/geminiService';

interface ImageAnalyzerProps {
    onAnalysisComplete: (text: string) => void;
}

const ImageAnalyzer: React.FC<ImageAnalyzerProps> = ({ onAnalysisComplete }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsAnalyzing(true);
        
        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result as string;
                // Remove data:image/...;base64, part
                const base64Content = base64String.split(',')[1];
                
                const result = await analyzeImage(base64Content);
                if (result) {
                    onAnalysisComplete(result);
                }
                setIsAnalyzing(false);
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error("Error analyzing image:", error);
            setIsAnalyzing(false);
        }
    };

    return (
        <>
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange}
            />
            <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isAnalyzing}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 transition-colors text-xs font-bold border border-indigo-200 dark:border-indigo-800"
                title="Analizar Foto con IA"
            >
                {isAnalyzing ? (
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                ) : (
                    <span className="material-symbols-outlined text-[18px]">document_scanner</span>
                )}
                {isAnalyzing ? "Analizando..." : "IA Scan"}
            </button>
        </>
    );
};

export default ImageAnalyzer;
