'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Send, Bot, User, Sparkles, RefreshCw } from 'lucide-react';
import axios from 'axios';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
}

export default function StandaloneChatPage() {
  const params = useParams();
  const botId = (params?.bot_id as string) || 'default';
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cloudbot-saas.onrender.com';

  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        sender: 'bot',
        text: 'Hello! How can I assist you today? Ask me anything about our knowledge base.'
      }
    ]);
  }, [botId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    const userMsg: Message = { id: `u_${Date.now()}`, sender: 'user', text: userText };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/chat/`, {
        bot_id: botId,
        question: userText
      });

      const botReply = response.data?.answer || 'I could not retrieve an answer.';
      setMessages((prev) => [
        ...prev,
        { id: `b_${Date.now()}`, sender: 'bot', text: botReply }
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { id: `b_${Date.now()}`, sender: 'bot', text: 'Error connecting to the chatbot server.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col bg-slate-950 text-slate-100">
      <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/50 px-6 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-semibold text-white">CloudBot Support Assistant</h1>
            <p className="text-xs text-emerald-400 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Active & Grounded RAG
            </p>
          </div>
        </div>
        <button
          onClick={() => setMessages([{ id: 'welcome', sender: 'bot', text: 'Hello! How can I assist you today?' }])}
          className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Clear Chat
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 md:px-20 lg:px-64">
        <div className="flex flex-col gap-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex items-start gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'bot' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                  <Bot className="h-4 w-4" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none'
                    : 'bg-slate-900 text-slate-200 rounded-bl-none border border-slate-800 shadow-md'
                }`}
              >
                {m.text}
              </div>
              {m.sender === 'user' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-400 border border-slate-700">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-2xl rounded-bl-none border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-400 flex items-center gap-2">
                <Sparkles className="h-4 w-4 animate-spin text-indigo-400" /> Generating response...
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </main>

      <footer className="border-t border-slate-800 bg-slate-900/60 p-4 md:px-20 lg:px-64 backdrop-blur">
        <form onSubmit={handleSend} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3.5 pl-4 pr-12 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white transition hover:bg-indigo-500 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        <p className="mt-2 text-center text-[11px] text-slate-500">
          Powered by CloudBot AI • Grounded RAG Architecture
        </p>
      </footer>
    </div>
  );
}