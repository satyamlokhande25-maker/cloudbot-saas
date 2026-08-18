"use client";

import React, { useState } from "react";

export default function WidgetTestPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Array<{ sender: "user" | "bot"; text: string }>>([
    { sender: "bot", text: "Hello! How can I assist you today?" }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const BOT_ID = "bot_6d716159"; // Your active Supabase bot
  const BACKEND_URL = "https://cloudbot-saas.onrender.com";

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = input.trim();
    if (!query || isLoading) return;

    // Append user message
    setMessages((prev) => [...prev, { sender: "user", text: query }]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/chat/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_id: BOT_ID, question: query }),
      });
      const data = await res.json();
      const botReply = data.answer || data.detail || "I do not have enough information from the provided content.";
      setMessages((prev) => [...prev, { sender: "bot", text: botReply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Server is waking up (Render Free Tier). Please try sending your message again in 5 seconds." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white flex flex-col items-center justify-center p-6 relative">
      {/* Mock Client Website Card */}
      <div className="bg-[#111827] border border-gray-800 p-8 rounded-2xl max-w-lg text-center shadow-2xl">
        <h1 className="text-2xl font-bold text-indigo-400 mb-3">🚀 My Awesome Business Website</h1>
        <p className="text-gray-400 text-sm leading-relaxed mb-4">
          This is a live mock client portal demonstrating your embedded CloudBot AI widget.
        </p>
        <div className="inline-block bg-indigo-950/80 text-indigo-300 text-xs px-3 py-1.5 rounded-md font-mono border border-indigo-800/40">
          Connected Bot: {BOT_ID}
        </div>
        <p className="text-gray-500 text-xs mt-4">
          Click the floating chat bubble on the bottom-right corner to test!
        </p>
      </div>

      {/* Floating Chat Widget */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {isOpen && (
          <div className="w-[360px] h-[500px] bg-[#0f172a] border border-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-3 animate-in fade-in slide-in-from-bottom-5">
            {/* Header */}
            <div className="bg-gray-900 border-b border-gray-800 px-4 py-3.5 flex justify-between items-center">
              <span className="font-semibold text-sm text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                CloudBot Support
              </span>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                    m.sender === "user"
                      ? "bg-indigo-600 text-white ml-auto rounded-br-none"
                      : "bg-gray-800/80 border border-gray-700 text-gray-200 mr-auto rounded-bl-none"
                  }`}
                >
                  {m.text}
                </div>
              ))}
              {isLoading && (
                <div className="bg-gray-800/80 border border-gray-700 text-gray-400 text-xs p-3 rounded-2xl rounded-bl-none mr-auto animate-pulse">
                  Thinking...
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="p-3 bg-gray-900 border-t border-gray-800 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question..."
                className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-semibold"
              >
                Send
              </button>
            </form>
          </div>
        )}

        {/* Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl flex items-center justify-center transition-all hover:scale-105"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      </div>
    </div>
  );
}