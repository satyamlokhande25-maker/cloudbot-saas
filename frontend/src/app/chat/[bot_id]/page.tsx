'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';
import axios from 'axios';

interface SourceItem {
  label: string;
  uri: string;
  snippet: string;
}

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  verificationStatus?: 'verified' | 'unverified';
  confidenceScore?: number;
  sources?: SourceItem[];
}

export default function StandaloneChatPage() {
  const params = useParams();
  const botId = (params?.bot_id as string) || 'default';
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedSourceIndex, setExpandedSourceIndex] = useState<string | null>(null);
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
  }, [messages, loading, expandedSourceIndex]);

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

      const rawData = response.data;
      let botReply = 'I could not retrieve an answer.';
      let sources: SourceItem[] | undefined = undefined;
      let verificationStatus: 'verified' | 'unverified' | undefined = undefined;
      let confidenceScore: number | undefined = undefined;

      // Handle both standard string and structured assurance response gracefully
      if (typeof rawData?.answer === 'string') {
        botReply = rawData.answer;
      } else if (rawData?.answer && typeof rawData.answer === 'object') {
        botReply = rawData.answer.answer || 'I could not retrieve an answer.';
        sources = rawData.answer.sources;
        verificationStatus = rawData.answer.verification_status;
        confidenceScore = rawData.answer.confidence_score;
      }

      // If sources or verification exist at root level
      if (rawData?.sources) sources = rawData.sources;
      if (rawData?.verification_status) verificationStatus = rawData.verification_status;
      if (rawData?.confidence_score) confidenceScore = rawData.confidence_score;

      setMessages((prev) => [
        ...prev,
        { 
          id: `b_${Date.now()}`, 
          sender: 'bot', 
          text: botReply,
          verificationStatus,
          confidenceScore,
          sources
        }
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

  const toggleSourceSnippet = (msgId: string, srcIdx: number) => {
    const key = `${msgId}_${srcIdx}`;
    setExpandedSourceIndex(prev => prev === key ? null : key);
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
                {/* 1. Optional Verification Assurance Badge */}
                {m.sender === 'bot' && m.verificationStatus && (
                  <div className="mb-2 pb-2 border-b border-slate-800/80 flex items-center">
                    {m.verificationStatus === 'verified' ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/70 px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Verified Grounded Answer {m.confidenceScore ? `(${Math.round(m.confidenceScore * 100)}%)` : ''}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-400 bg-amber-950/60 border border-amber-800/70 px-2.5 py-0.5 rounded-full">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        Unverified / General Knowledge
                      </span>
                    )}
                  </div>
                )}

                {/* 2. Main Message Text */}
                <div className="text-slate-200">
                  {m.text}
                </div>

                {/* 3. Source Traceability Badges (Citations) */}
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Verified Sources & Citations:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {m.sources.map((src, sIdx) => {
                        const isExpanded = expandedSourceIndex === `${m.id}_${sIdx}`;
                        return (
                          <div key={sIdx} className="flex flex-col">
                            <button
                              type="button"
                              onClick={() => toggleSourceSnippet(m.id, sIdx)}
                              className="flex items-center gap-1.5 text-[11px] bg-slate-950 hover:bg-slate-800 border border-slate-700/80 text-indigo-300 px-2.5 py-1 rounded-lg transition-colors"
                            >
                              <FileText className="w-3 h-3 text-indigo-400" />
                              <span>{src.label}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-3 h-3 text-slate-400" />
                              )}
                            </button>

                            {/* Dropdown Exact Document Snippet */}
                            {isExpanded && (
                              <div className="mt-1.5 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-300 font-mono leading-relaxed shadow-inner max-w-sm">
                                <div className="text-slate-500 font-semibold mb-1 flex items-center justify-between">
                                  <span>Document Snippet:</span>
                                  {src.uri && src.uri.startsWith('http') && (
                                    <a
                                      href={src.uri}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-indigo-400 flex items-center gap-0.5 hover:underline"
                                    >
                                      Open <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  )}
                                </div>
                                <p className="italic text-slate-300">"{src.snippet}"</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
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