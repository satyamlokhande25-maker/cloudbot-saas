"use client";

import React, { useState } from "react";
import { Send, Globe, Slack, Webhook, CheckCircle2, Copy, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function IntegrationsPage() {
  const [tgToken, setTgToken] = useState("");
  const [slackToken, setSlackToken] = useState("");
  const [tgConnected, setTgConnected] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const BOT_ID = "bot_6d716159"; // Default active bot
  const BASE_URL = "https://cloudbot-saas.onrender.com";

  const tgWebhookUrl = `${BASE_URL}/integrations/telegram/${BOT_ID}?token=${tgToken}`;
  const slackWebhookUrl = `${BASE_URL}/integrations/slack/${BOT_ID}?token=${slackToken}`;
  const customWebhookUrl = `${BASE_URL}/integrations/webhook/${BOT_ID}`;
  const wpSnippet = `<script src="https://cloudbot-saas.vercel.app/widget.js" data-bot-id="${BOT_ID}" defer></script>`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleConnectTelegram = async () => {
    if (!tgToken.trim()) return;
    try {
      const url = `https://api.telegram.org/bot${tgToken}/setWebhook?url=${encodeURIComponent(tgWebhookUrl)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.ok) setTgConnected(true);
      else alert("Telegram Error: " + data.description);
    } catch (e) {
      alert("Failed to connect Telegram webhook.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div>
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:underline mb-2">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold">100% Free Integrations Hub</h1>
            <p className="text-xs text-slate-400 mt-1">Connect your CloudBot AI knowledge base to external channels without any paid subscription.</p>
          </div>
          <span className="text-xs bg-indigo-950 text-indigo-300 border border-indigo-800 px-3 py-1.5 rounded-lg font-mono">
            Active Bot: {BOT_ID}
          </span>
        </div>

        {/* Integrations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* 1. Telegram Bot */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-sky-500/20 text-sky-400 rounded-xl">
                    <Send className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Telegram Bot</h3>
                    <p className="text-[11px] text-slate-400">Direct instant messaging</p>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-950 border border-emerald-800 text-emerald-400 px-2 py-0.5 rounded-full">
                  100% Free
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Create a bot via <strong>@BotFather</strong> on Telegram, get your API token, and paste it here:
              </p>
              <input
                type="text"
                value={tgToken}
                onChange={(e) => setTgToken(e.target.value)}
                placeholder="e.g. 718293849:AAH..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white mb-3"
              />
            </div>
            <button
              onClick={handleConnectTelegram}
              disabled={!tgToken.trim() || tgConnected}
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
            >
              {tgConnected ? <><CheckCircle2 className="w-4 h-4" /> Connected to Telegram</> : "Activate Telegram Bot"}
            </button>
          </div>

          {/* 2. WordPress Embed */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl">
                    <Globe className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">WordPress & Webflow</h3>
                    <p className="text-[11px] text-slate-400">Floating widget bubble</p>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-950 border border-emerald-800 text-emerald-400 px-2 py-0.5 rounded-full">
                  Free Snippet
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Paste this script into WordPress via <em>WPCode</em> or in your website footer:
              </p>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-indigo-300 break-all mb-4">
                {wpSnippet}
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(wpSnippet, "wp")}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
            >
              {copiedKey === "wp" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copiedKey === "wp" ? "Copied Script Tag!" : "Copy WordPress Snippet"}
            </button>
          </div>

          {/* 3. Slack Workspace */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl">
                    <Slack className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Slack Workspace Bot</h3>
                    <p className="text-[11px] text-slate-400">Team internal support</p>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-950 border border-emerald-800 text-emerald-400 px-2 py-0.5 rounded-full">
                  100% Free
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Add this Request URL to your Slack App Event Subscriptions (<code>app_mention</code>):
              </p>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-amber-300 break-all mb-4">
                {slackWebhookUrl}
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(slackWebhookUrl, "slack")}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
            >
              {copiedKey === "slack" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              Copy Slack Endpoint
            </button>
          </div>

          {/* 4. Make / Zapier Custom Webhook */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-500/20 text-purple-400 rounded-xl">
                    <Webhook className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Make & Zapier Webhook</h3>
                    <p className="text-[11px] text-slate-400">Automate CRM, Sheets & Forms</p>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-950 border border-emerald-800 text-emerald-400 px-2 py-0.5 rounded-full">
                  REST API
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Send standard POST requests with JSON: <code>{`{"question": "..."}`}</code>
              </p>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-purple-300 break-all mb-4">
                {customWebhookUrl}
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(customWebhookUrl, "webhook")}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
            >
              {copiedKey === "webhook" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              Copy Webhook URL
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}