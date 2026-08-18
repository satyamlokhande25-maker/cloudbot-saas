'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Layers, CheckCircle2, Copy, X, 
  Send, Globe, MessageSquare, Slack, Smartphone, ShoppingBag 
} from 'lucide-react';
import { getUserBots } from '@/lib/api';

export default function IntegrationsPage() {
  const [activeBotId, setActiveBotId] = useState('test_bot_1');
  const [activeBotName, setActiveBotName] = useState('Default Assistant');
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [tgToken, setTgToken] = useState('');
  const [tgSaved, setTgSaved] = useState(false);

  const BASE_URL = "https://cloudbot-saas.onrender.com";
  const VERCEL_URL = "https://cloudbot-saas.vercel.app";

  useEffect(() => {
    const savedBotId = localStorage.getItem('last_active_bot_id');
    if (savedBotId) setActiveBotId(savedBotId);

    const token = localStorage.getItem('access_token');
    if (token) {
      getUserBots()
        .then((bots) => {
          if (bots && bots.length > 0) {
            const found = bots.find((b: any) => b.id === savedBotId) || bots[0];
            setActiveBotId(found.id);
            setActiveBotName(found.name);
          }
        })
        .catch(() => {});
    }
  }, []);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const widgetSnippet = `<script 
  src="${VERCEL_URL}/widget.js" 
  data-bot-id="${activeBotId}" 
  defer>
</script>`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-6 gap-4">
          <div>
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:underline mb-2">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Main Dashboard
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Layers className="w-6 h-6 text-indigo-400" /> Integrations & Channels Hub (9 Platforms)
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Connect your trained AI knowledge base across 9 messaging, automation, and web platforms.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-indigo-950 text-indigo-300 border border-indigo-800 px-3 py-1.5 rounded-xl font-mono">
              Bot: <strong>{activeBotName}</strong> ({activeBotId})
            </span>
          </div>
        </div>

        {/* 9 Integrations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* 1. Telegram Bot (100% Free) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl">✈️</span>
                <span className="text-[10px] bg-emerald-950 border border-emerald-800 text-emerald-300 px-2 py-0.5 rounded-full font-semibold">100% Free</span>
              </div>
              <h3 className="font-bold text-base text-white mb-1">Telegram Bot</h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Connect your AI assistant to a Telegram bot via @BotFather for 24/7 direct messaging.
              </p>
            </div>
            <button 
              onClick={() => setActiveModal('telegram')}
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold transition"
            >
              Configure Telegram
            </button>
          </div>

          {/* 2. WhatsApp Cloud API (Free Tier) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl">💬</span>
                <span className="text-[10px] bg-emerald-950 border border-emerald-800 text-emerald-300 px-2 py-0.5 rounded-full font-semibold">1,000 Free / mo</span>
              </div>
              <h3 className="font-bold text-base text-white mb-1">WhatsApp Cloud API</h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Auto-reply to customer WhatsApp messages using Meta Developer Cloud Webhook.
              </p>
            </div>
            <button 
              onClick={() => setActiveModal('whatsapp')}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition"
            >
              Configure WhatsApp
            </button>
          </div>

          {/* 3. WordPress & Website Embed (100% Free) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl">🌐</span>
                <span className="text-[10px] bg-emerald-950 border border-emerald-800 text-emerald-300 px-2 py-0.5 rounded-full font-semibold">100% Free</span>
              </div>
              <h3 className="font-bold text-base text-white mb-1">WordPress / Web Embed</h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Lightweight floating chat bubble script for WordPress (WPCode), Webflow, or custom HTML.
              </p>
            </div>
            <button 
              onClick={() => setActiveModal('wordpress')}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition"
            >
              Get Embed Code
            </button>
          </div>

          {/* 4. Slack Workspace Bot (100% Free) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl">💼</span>
                <span className="text-[10px] bg-emerald-950 border border-emerald-800 text-emerald-300 px-2 py-0.5 rounded-full font-semibold">100% Free</span>
              </div>
              <h3 className="font-bold text-base text-white mb-1">Slack Workspace</h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Query company knowledge bases directly from team Slack channels via Event Subscriptions.
              </p>
            </div>
            <button 
              onClick={() => setActiveModal('slack')}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
            >
              Configure Slack
            </button>
          </div>

          {/* 5. Discord Server Bot (100% Free) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl">👾</span>
                <span className="text-[10px] bg-emerald-950 border border-emerald-800 text-emerald-300 px-2 py-0.5 rounded-full font-semibold">100% Free</span>
              </div>
              <h3 className="font-bold text-base text-white mb-1">Discord Bot</h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Connect your bot to Discord servers using the Discord Developer Interactions webhook.
              </p>
            </div>
            <button 
              onClick={() => setActiveModal('discord')}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition"
            >
              Configure Discord
            </button>
          </div>

          {/* 6. Zapier / Make.com Webhook (100% Free REST) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl">⚡</span>
                <span className="text-[10px] bg-indigo-950 border border-indigo-800 text-indigo-300 px-2 py-0.5 rounded-full font-semibold">REST API</span>
              </div>
              <h3 className="font-bold text-base text-white mb-1">Make / Zapier Webhook</h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Send queries, capture leads, and automate CRM & Google Sheets workflows via POST endpoint.
              </p>
            </div>
            <button 
              onClick={() => setActiveModal('webhook')}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
            >
              View Webhook Endpoint
            </button>
          </div>

          {/* 7. Twilio SMS / WhatsApp Sandbox (Free) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl">📱</span>
                <span className="text-[10px] bg-emerald-950 border border-emerald-800 text-emerald-300 px-2 py-0.5 rounded-full font-semibold">Free Sandbox</span>
              </div>
              <h3 className="font-bold text-base text-white mb-1">Twilio SMS / Messaging</h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Connect Twilio phone numbers to receive incoming SMS and return RAG AI answers via TwiML.
              </p>
            </div>
            <button 
              onClick={() => setActiveModal('twilio')}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
            >
              Configure Twilio
            </button>
          </div>

          {/* 8. Shopify Storefront (100% Free) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl">🛍️</span>
                <span className="text-[10px] bg-emerald-950 border border-emerald-800 text-emerald-300 px-2 py-0.5 rounded-full font-semibold">100% Free</span>
              </div>
              <h3 className="font-bold text-base text-white mb-1">Shopify Store</h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Embed your customer assistant into your Shopify theme (`theme.liquid`) for live product support.
              </p>
            </div>
            <button 
              onClick={() => setActiveModal('shopify')}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
            >
              Shopify Guide
            </button>
          </div>

          {/* 9. Instagram & Messenger (PRO Tier) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden">
            <div className="absolute top-3 right-3 bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-md">
              PRO Plan ($19/mo)
            </div>
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl">📸</span>
              </div>
              <h3 className="font-bold text-base text-white mb-1">Instagram & Messenger</h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Auto-reply to Instagram DMs and Facebook page comments directly via your AI knowledge base.
              </p>
            </div>
            <button 
              onClick={() => setActiveModal('upgrade')}
              className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white rounded-xl text-xs font-bold transition shadow-lg"
            >
              Upgrade to Unlock
            </button>
          </div>

        </div>
      </div>

      {/* Dynamic Popups / Modals */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg text-white shadow-2xl relative">
            <button 
              onClick={() => setActiveModal(null)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Telegram */}
            {activeModal === 'telegram' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold flex items-center gap-2">✈️ Telegram Bot Setup</h3>
                <p className="text-xs text-slate-400">1. Open Telegram and search <strong>@BotFather</strong>.<br/>2. Send <code>/newbot</code> and get your API Token.<br/>3. Paste token below and activate:</p>
                <input 
                  type="text" 
                  value={tgToken}
                  onChange={(e) => setTgToken(e.target.value)}
                  placeholder="Paste Telegram Bot Token (e.g. 71829...)" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
                <button 
                  onClick={() => {
                    if (tgToken.trim()) {
                      const tgWebhookUrl = `${BASE_URL}/integrations/telegram/${activeBotId}?token=${tgToken.trim()}`;
                      fetch(`https://api.telegram.org/bot${tgToken.trim()}/setWebhook?url=${encodeURIComponent(tgWebhookUrl)}`)
                        .then(() => {
                          setTgSaved(true);
                          setTimeout(() => setActiveModal(null), 1500);
                        })
                        .catch(() => alert("Could not reach Telegram servers."));
                    }
                  }}
                  className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold"
                >
                  {tgSaved ? "✓ Telegram Connected Live!" : "Activate Telegram Bot"}
                </button>
              </div>
            )}

            {/* WhatsApp */}
            {activeModal === 'whatsapp' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold flex items-center gap-2">💬 Meta WhatsApp Cloud API (1,000 Free / mo)</h3>
                <p className="text-xs text-slate-400">In developers.facebook.com ➔ WhatsApp ➔ Configuration, enter these details:</p>
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-2">
                  <div className="text-[11px] text-slate-400">Callback URL:</div>
                  <div className="font-mono text-emerald-400 text-[11px] break-all">{`${BASE_URL}/integrations/whatsapp/${activeBotId}`}</div>
                  <div className="text-[11px] text-slate-400 pt-1">Verify Token:</div>
                  <div className="font-mono text-amber-300 text-[11px]">cloudbot_secret_token_2026</div>
                </div>
                <button 
                  onClick={() => copyToClipboard(`${BASE_URL}/integrations/whatsapp/${activeBotId}`, 'wa_url')}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  {copiedKey === 'wa_url' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedKey === 'wa_url' ? "Copied Callback URL!" : "Copy Callback URL"}
                </button>
              </div>
            )}

            {/* WordPress */}
            {activeModal === 'wordpress' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold flex items-center gap-2">🌐 WordPress & Website Embed</h3>
                <p className="text-xs text-slate-400">Paste before <code>&lt;/body&gt;</code> in WordPress (via WPCode plugin) or any HTML template:</p>
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-[11px] font-mono text-indigo-300 break-all">{widgetSnippet}</div>
                <button 
                  onClick={() => copyToClipboard(widgetSnippet, 'wp_copy')}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  {copiedKey === 'wp_copy' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedKey === 'wp_copy' ? "Copied Script!" : "Copy Script Snippet"}
                </button>
              </div>
            )}

            {/* Slack */}
            {activeModal === 'slack' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold flex items-center gap-2">💼 Slack Workspace Setup</h3>
                <p className="text-xs text-slate-400">Set this Request URL in your Slack App Event Subscriptions:</p>
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs">
                  <div className="font-mono text-amber-300 text-[11px] break-all">{`${BASE_URL}/integrations/slack/${activeBotId}`}</div>
                </div>
                <button 
                  onClick={() => copyToClipboard(`${BASE_URL}/integrations/slack/${activeBotId}`, 'slack_copy')}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  {copiedKey === 'slack_copy' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  Copy Slack URL
                </button>
              </div>
            )}

            {/* Discord */}
            {activeModal === 'discord' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold flex items-center gap-2">👾 Discord Bot Setup</h3>
                <p className="text-xs text-slate-400">Set this Interactions Webhook URL in Discord Developer Portal:</p>
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs">
                  <div className="font-mono text-indigo-300 text-[11px] break-all">{`${BASE_URL}/integrations/discord/${activeBotId}`}</div>
                </div>
                <button 
                  onClick={() => copyToClipboard(`${BASE_URL}/integrations/discord/${activeBotId}`, 'disc_copy')}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  {copiedKey === 'disc_copy' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  Copy Discord Endpoint
                </button>
              </div>
            )}

            {/* Webhook */}
            {activeModal === 'webhook' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold flex items-center gap-2">⚡ Make & Zapier REST Webhook</h3>
                <p className="text-xs text-slate-400">Send standard POST requests to connect your bot with any CRM or Google Sheets:</p>
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-2">
                  <div className="text-[11px] text-slate-400">POST Endpoint:</div>
                  <div className="font-mono text-indigo-300 text-[11px] break-all">{`${BASE_URL}/integrations/webhook/${activeBotId}`}</div>
                  <div className="text-[11px] text-slate-400 pt-1">Payload (JSON):</div>
                  <pre className="text-[10px] text-amber-300 font-mono bg-slate-900 p-2 rounded">{`{ "question": "Customer question here" }`}</pre>
                </div>
                <button 
                  onClick={() => copyToClipboard(`${BASE_URL}/integrations/webhook/${activeBotId}`, 'webhook_copy')}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  {copiedKey === 'webhook_copy' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  Copy Webhook URL
                </button>
              </div>
            )}

            {/* Twilio */}
            {activeModal === 'twilio' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold flex items-center gap-2">📱 Twilio SMS Setup</h3>
                <p className="text-xs text-slate-400">In Twilio Console ➔ Phone Numbers ➔ Messaging, paste this Webhook URL for incoming messages:</p>
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs">
                  <div className="font-mono text-emerald-400 text-[11px] break-all">{`${BASE_URL}/integrations/twilio/${activeBotId}`}</div>
                </div>
                <button 
                  onClick={() => copyToClipboard(`${BASE_URL}/integrations/twilio/${activeBotId}`, 'tw_copy')}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  {copiedKey === 'tw_copy' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  Copy Twilio URL
                </button>
              </div>
            )}

            {/* Shopify */}
            {activeModal === 'shopify' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold flex items-center gap-2">🛍️ Shopify Store Integration</h3>
                <p className="text-xs text-slate-400">1. Go to Shopify Admin ➔ Online Store ➔ Themes ➔ Edit Code.<br/>2. Open <code>layout/theme.liquid</code> and paste this script right above <code>&lt;/body&gt;</code>:</p>
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-[11px] font-mono text-indigo-300 break-all">{widgetSnippet}</div>
                <button 
                  onClick={() => copyToClipboard(widgetSnippet, 'shop_copy')}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  {copiedKey === 'shop_copy' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  Copy Shopify Snippet
                </button>
              </div>
            )}

            {/* Upgrade */}
            {activeModal === 'upgrade' && (
              <div className="space-y-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto text-2xl">🚀</div>
                <h3 className="text-base font-bold">Upgrade to CloudBot Pro</h3>
                <p className="text-xs text-slate-400">Unlock Instagram DMs, Facebook Messenger, unlimited bots and 10,000+ monthly messages.</p>
                <button 
                  onClick={() => alert("Stripe Billing Gateway will be linked.")}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-xs font-bold shadow-lg"
                >
                  Upgrade for $19 / month
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}