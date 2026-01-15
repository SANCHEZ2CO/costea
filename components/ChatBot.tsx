import React, { useState, useRef, useEffect } from 'react';
import { generateChatResponse } from '../services/geminiService';
import { ChatMessage } from '../types';

const ChatBot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!inputText.trim()) return;

        const userMsg: ChatMessage = { role: 'user', text: inputText, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setIsLoading(true);

        const history = messages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));

        const responseText = await generateChatResponse(history, userMsg.text);
        
        const botMsg: ChatMessage = { role: 'model', text: responseText || "Error", timestamp: Date.now() };
        setMessages(prev => [...prev, botMsg]);
        setIsLoading(false);
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
            {isOpen && (
                <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-2xl w-80 md:w-96 h-[500px] border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden animate-fade-in-up">
                    <div className="bg-gradient-to-r from-secondary to-primary p-4 flex justify-between items-center text-white">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined">smart_toy</span>
                            <span className="font-bold">Asistente Sánchez</span>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 rounded-full p-1">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-black/20">
                        {messages.length === 0 && (
                            <div className="text-center text-gray-400 text-sm mt-10">
                                <span className="material-symbols-outlined text-4xl mb-2">forum</span>
                                <p>¡Hola! Soy tu asistente de costos. Pregúntame lo que necesites.</p>
                            </div>
                        )}
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-primary text-white rounded-tr-none' : 'bg-white dark:bg-gray-700 text-slate-800 dark:text-white rounded-tl-none shadow-sm'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-gray-700 p-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1">
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    <div className="p-3 bg-white dark:bg-surface-dark border-t border-gray-100 dark:border-gray-700 flex gap-2">
                        <input 
                            type="text" 
                            className="flex-1 bg-gray-100 dark:bg-gray-800 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/50"
                            placeholder="Escribe tu duda..."
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        />
                        <button 
                            onClick={handleSend}
                            disabled={isLoading}
                            className="bg-primary hover:bg-primary-light text-white p-2 rounded-xl flex items-center justify-center transition-colors disabled:opacity-50"
                        >
                            <span className="material-symbols-outlined text-[20px]">send</span>
                        </button>
                    </div>
                </div>
            )}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="h-14 w-14 rounded-full bg-gradient-to-tr from-secondary to-primary hover:scale-105 active:scale-95 transition-all shadow-glow text-white flex items-center justify-center"
            >
                <span className="material-symbols-outlined text-3xl">{isOpen ? 'close' : 'voice_chat'}</span>
            </button>
        </div>
    );
};

export default ChatBot;
