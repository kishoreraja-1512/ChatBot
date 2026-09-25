import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Send, Bot, User, Sparkles, Trash2, Github, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<'loading' | 'online' | 'offline'>('loading');
  const [isApiKeyMissing, setIsApiKeyMissing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Check API Key and Backend status
  useEffect(() => {
    // Check if API key is present
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
      console.warn("Gemini API Key is missing or using placeholder value.");
      setIsApiKeyMissing(true);
    }

    fetch('/api/health')
      .then(res => res.ok ? setBackendStatus('online') : setBackendStatus('offline'))
      .catch(() => setBackendStatus('offline'));
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      console.log("Sending message to Gemini...");
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: input.trim(),
        config: {
          systemInstruction: "You are a helpful, friendly, and concise AI assistant. You provide accurate information and engage in natural conversation.",
        }
      });

      console.log("Gemini response received:", response);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text || "I'm sorry, I couldn't generate a response.",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error("Gemini Error Details:", err);
      let errorMessage = "Failed to get response from AI.";
      
      if (err.message?.includes('API_KEY_INVALID')) {
        errorMessage = "Invalid API Key. Please check your Gemini API key in the Secrets panel.";
      } else if (err.message?.includes('quota')) {
        errorMessage = "API quota exceeded. Please try again later.";
      } else if (!process.env.GEMINI_API_KEY) {
        errorMessage = "Gemini API Key is missing. Please add it to the Secrets panel in AI Studio.";
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1a1a1a] font-sans selection:bg-blue-100">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-bottom border-gray-200">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <Bot size={20} />
            </div>
            <h1 className="font-semibold text-lg tracking-tight">AI Chatbot Pro</h1>
            <div className={cn(
              "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border",
              backendStatus === 'online' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
              backendStatus === 'loading' ? "bg-gray-50 text-gray-500 border-gray-100" :
              "bg-red-50 text-red-600 border-red-100"
            )}>
              <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                backendStatus === 'online' ? "bg-emerald-500 animate-pulse" : 
                backendStatus === 'loading' ? "bg-gray-400" : "bg-red-500"
              )} />
              {backendStatus.toUpperCase()}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={clearChat}
              className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors rounded-full"
              title="Clear chat"
            >
              <Trash2 size={18} />
            </button>
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 text-gray-500 hover:text-gray-900 transition-colors"
            >
              <Github size={18} />
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 flex flex-col h-[calc(100vh-4rem)]">
        {/* Chat Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-6 pb-8 scroll-smooth"
        >
          {isApiKeyMissing && (
            <div className="p-4 bg-amber-50 border border-amber-100 text-amber-700 rounded-xl text-sm flex flex-col gap-2 mb-4">
              <div className="flex items-center gap-2 font-bold">
                <Sparkles size={16} />
                Configuration Required
              </div>
              <p>It looks like your Gemini API key is missing. To fix this:</p>
              <ol className="list-decimal ml-4 space-y-1">
                <li>Go to the <b>Secrets</b> panel in the AI Studio sidebar.</li>
                <li>Add a secret named <b>GEMINI_API_KEY</b>.</li>
                <li>Paste your API key from Google AI Studio.</li>
              </ol>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-60 py-20">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                <Sparkles size={32} />
              </div>
              <div>
                <h2 className="text-xl font-medium text-gray-900">Welcome to AI Chatbot Pro</h2>
                <p className="text-sm max-w-xs mx-auto mt-2">
                  Ask me anything! I'm powered by Gemini and ready to help you with your queries.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md mt-8">
                {['Explain quantum physics', 'Write a poem about rain', 'How to bake a cake?', 'Tell me a joke'].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="p-3 text-sm text-left bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all"
                  >
                    "{suggestion}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex gap-4 max-w-[85%]",
                    msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                    msg.role === 'user' ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-blue-600"
                  )}>
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={cn(
                    "p-4 rounded-2xl shadow-sm leading-relaxed",
                    msg.role === 'user' 
                      ? "bg-blue-600 text-white rounded-tr-none" 
                      : "bg-white border border-gray-100 text-gray-800 rounded-tl-none"
                  )}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <span className={cn(
                      "text-[10px] mt-2 block opacity-50",
                      msg.role === 'user' ? "text-right" : "text-left"
                    )}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {isLoading && (
            <div className="flex gap-4 mr-auto max-w-[85%] animate-pulse">
              <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
              <div className="p-4 rounded-2xl bg-white border border-gray-100 w-32 h-12 flex items-center justify-center gap-1">
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-center gap-2">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="mt-auto pt-4 border-top border-gray-200 bg-[#f8f9fa]">
          <div className="relative group">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your message..."
              className="w-full p-4 pr-14 bg-white border border-gray-200 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className={cn(
                "absolute right-2 top-2 p-2 rounded-xl transition-all",
                input.trim() && !isLoading 
                  ? "bg-blue-600 text-white shadow-md shadow-blue-200 hover:bg-blue-700 active:scale-95" 
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
            >
              <Send size={20} />
            </button>
          </div>
          <p className="text-[10px] text-center text-gray-400 mt-3 flex items-center justify-center gap-1">
            Powered by <Sparkles size={10} className="text-blue-500" /> Gemini AI • Built with React & Express
          </p>
        </div>
      </main>
    </div>
  );
}
