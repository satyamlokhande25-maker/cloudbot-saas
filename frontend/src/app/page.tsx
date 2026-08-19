'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bot, Globe, Video, FileText, Send, Sparkles, 
  CheckCircle2, AlertCircle, Loader2, Code2, Copy, LogOut, Lock, Mail, MessageSquare, History, Plus,
  Palette, Layers, X, Share2, Smartphone, Download, ExternalLink, Layout
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  registerUser, 
  loginUser, 
  trainWebsite, 
  trainYouTube, 
  trainPdf, 
  askBot, 
  getChatHistory, 
  getUserBots, 
  createNewBot 
} from '@/lib/api';

interface BotItem {
  id: string;
  name: string;
  system_prompt?: string;
  temperature?: number;
  theme_color?: string;
}

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Multi-Bot States
  const [bots, setBots] = useState<BotItem[]>([]);
  const [activeBot, setActiveBot] = useState<BotItem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBotName, setNewBotName] = useState('');
  const [newBotPrompt, setNewBotPrompt] = useState('You are a helpful AI customer support assistant.');
  const [newBotColor, setNewBotColor] = useState('#4f46e5');
  const [isCreatingBot, setIsCreatingBot] = useState(false);

  // Navigation Tabs: 'train' | 'appearance' | 'deploy' | 'integrations' | 'logs'
  const [dashboardTab, setDashboardTab] = useState<'train' | 'appearance' | 'deploy' | 'integrations' | 'logs'>('train');
  const [activeTab, setActiveTab] = useState<'website' | 'youtube' | 'pdf'>('website');
  
  // Ingestion States
  const [webUrl, setWebUrl] = useState('');
  const [ytUrl, setYtUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [trainStatus, setTrainStatus] = useState<{ type: 'success' | 'error' | 'loading'; msg: string } | null>(null);

  // Chat Playground States
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([
    { role: 'bot', text: 'Hello! Train me with your data sources, and ask me anything.' }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Chat Logs State
  const [logs, setLogs] = useState<Array<{ id: string; sender: string; message: string; created_at: string }>>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);

  // Appearance States
  const [customThemeColor, setCustomThemeColor] = useState('#4f46e5');
  const [welcomeMessage, setWelcomeMessage] = useState('Hello! How can I assist you today?');
  const [appearanceSaved, setAppearanceSaved] = useState(false);

  // Modals & Copy Keys
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [tgToken, setTgToken] = useState('');
  const [tgSaved, setTgSaved] = useState(false);

  const BASE_URL = "https://cloudbot-saas.onrender.com";
  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://cloudbot-saas.vercel.app';
  const currentBotId = activeBot?.id || 'test_bot_1';
  const supportPageUrl = `${originUrl}/chat/${currentBotId}`;
  const directLinkUrl = `${originUrl}/chat/${currentBotId}`;
  const widgetSnippet = `<script\n  src="${originUrl}/widget.js"\n  data-bot-id="${currentBotId}"\n  defer>\n</script>`;
  const iframeSnippet = `<iframe\n  src="${supportPageUrl}"\n  width="100%"\n  height="600px"\n  frameborder="0"\n  style="border-radius: 12px; border: 1px solid #1e293b;">\n</iframe>`;

  useEffect(() => {
    const savedToken = localStorage.getItem('access_token');
    if (savedToken) setToken(savedToken);

    const savedTab = localStorage.getItem('dashboard_tab');
    if (savedTab) setDashboardTab(savedTab as any);
  }, []);

  useEffect(() => {
    if (activeBot) {
      const savedColor = localStorage.getItem(`bot_color_${activeBot.id}`);
      const savedMsg = localStorage.getItem(`bot_msg_${activeBot.id}`);
      if (savedColor) setCustomThemeColor(savedColor);
      else if (activeBot.theme_color) setCustomThemeColor(activeBot.theme_color);

      if (savedMsg) setWelcomeMessage(savedMsg);
      localStorage.setItem('last_active_bot_id', activeBot.id);
    }
  }, [activeBot]);

  const loadBots = async () => {
    try {
      const userBots = await getUserBots();
      setBots(userBots);
      const lastBotId = localStorage.getItem('last_active_bot_id');
      const matched = userBots.find((b: BotItem) => b.id === lastBotId);

      if (matched) {
        setActiveBot(matched);
      } else if (userBots.length > 0) {
        setActiveBot(userBots[0]);
      } else {
        const defaultBot = { id: 'test_bot_1', name: 'Default Assistant' };
        setActiveBot(defaultBot);
      }
    } catch {
      setActiveBot({ id: 'test_bot_1', name: 'Default Assistant' });
    }
  };

  useEffect(() => {
    if (token) loadBots();
  }, [token]);

  const handleCreateBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBotName.trim()) return;
    setIsCreatingBot(true);
    try {
      const created = await createNewBot({
        name: newBotName.trim(),
        system_prompt: newBotPrompt,
        theme_color: newBotColor,
      });
      setBots((prev) => [...prev, created]);
      setActiveBot(created);
      localStorage.setItem('last_active_bot_id', created.id);
      setShowCreateModal(false);
      setNewBotName('');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create bot');
    } finally {
      setIsCreatingBot(false);
    }
  };

  const fetchLogs = async () => {
    if (!activeBot) return;
    setIsLogsLoading(true);
    try {
      const data = await getChatHistory(activeBot.id);
      setLogs(data);
    } catch (e) {
      console.error('Error fetching logs:', e);
    } finally {
      setIsLogsLoading(false);
    }
  };

  useEffect(() => {
    if (token && dashboardTab === 'logs' && activeBot) {
      fetchLogs();
    }
  }, [dashboardTab, token, activeBot]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsAuthLoading(true);

    try {
      let data;
      if (authMode === 'register') {
        data = await registerUser(authEmail, authPassword);
      } else {
        data = await loginUser(authEmail, authPassword);
      }
      localStorage.setItem('access_token', data.access_token);
      setToken(data.access_token);
    } catch (err: any) {
      setAuthError(err.response?.data?.detail || 'Authentication failed.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('last_active_bot_id');
    setToken(null);
  };

  const handleTrain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBot) return;
    setTrainStatus({ type: 'loading', msg: 'Training bot and indexing knowledge base...' });

    try {
      if (activeTab === 'website') {
        const res = await trainWebsite(activeBot.id, webUrl);
        setTrainStatus({ type: 'success', msg: `Indexed ${res.chunks_indexed} chunks from website.` });
        setWebUrl('');
      } else if (activeTab === 'youtube') {
        const res = await trainYouTube(activeBot.id, ytUrl);
        setTrainStatus({ type: 'success', msg: `Indexed ${res.chunks_indexed} chunks from YouTube video.` });
        setYtUrl('');
      } else if (activeTab === 'pdf' && selectedFile) {
        const res = await trainPdf(activeBot.id, selectedFile);
        setTrainStatus({ type: 'success', msg: `Indexed ${res.chunks_indexed} chunks from PDF document.` });
        setSelectedFile(null);
      }
    } catch (err: any) {
      setTrainStatus({ type: 'error', msg: err.response?.data?.detail || 'Failed to process source.' });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim() || isChatLoading || !activeBot) return;

    const userMsg = inputQuery.trim();
    setInputQuery('');
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setIsChatLoading(true);

    try {
      const res = await askBot(activeBot.id, userMsg);
      setMessages((prev) => [...prev, { role: 'bot', text: res.answer }]);
    } catch (err: any) {
      const errorText = err.response?.status === 429 
        ? '⚠️ Free tier message limit reached. Please upgrade to continue.' 
        : 'Error: Could not retrieve answer.';
      setMessages((prev) => [...prev, { role: 'bot', text: errorText }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveAppearance = () => {
    if (activeBot) {
      localStorage.setItem(`bot_color_${activeBot.id}`, customThemeColor);
      localStorage.setItem(`bot_msg_${activeBot.id}`, welcomeMessage);
    }
    setAppearanceSaved(true);
    setTimeout(() => setAppearanceSaved(false), 2000);
  };

  const handleTabChange = (tab: 'train' | 'appearance' | 'deploy' | 'integrations' | 'logs') => {
    setDashboardTab(tab);
    localStorage.setItem('dashboard_tab', tab);
  };

  const downloadQR = () => {
    const svg = document.getElementById('bot-qr-code');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `${currentBotId}-qr.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-slate-100">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-3 bg-indigo-600 rounded-2xl">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold">CloudBot AI</h1>
          </div>

          <div className="flex bg-slate-950 p-1 rounded-xl mb-6 border border-slate-800">
            <button
              onClick={() => { setAuthMode('login'); setAuthError(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                authMode === 'login' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setAuthMode('register'); setAuthError(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                authMode === 'register' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-400" /> Email Address
              </label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-400" /> Password
              </label>
              <input
                type="password"
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 text-white"
              />
            </div>

            {authError && (
              <div className="p-3 bg-rose-950/50 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isAuthLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition flex items-center justify-center gap-2 mt-2"
            >
              {isAuthLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {authMode === 'login' ? 'Sign In to Dashboard' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-slate-900 border-r border-slate-800 p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div style={{ backgroundColor: customThemeColor }} className="p-2 rounded-lg transition-colors">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">CloudBot AI</h1>
          </div>

          {/* Bot Switcher */}
          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Bot</span>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> New Bot
              </button>
            </div>
            <select
              value={activeBot?.id || ''}
              onChange={(e) => {
                const found = bots.find((b) => b.id === e.target.value);
                if (found) setActiveBot(found);
              }}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {bots.map((b) => (
                <option key={b.id} value={b.id}>{b.name} ({b.id})</option>
              ))}
              {bots.length === 0 && <option value="test_bot_1">Default Assistant (test_bot_1)</option>}
            </select>
          </div>

          {/* Workspace Tabs */}
          <div className="space-y-1.5 mb-6">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">Workspace</p>
            <button
              onClick={() => handleTabChange('train')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                dashboardTab === 'train' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4" /> Training & Playground
            </button>
            <button
              onClick={() => handleTabChange('appearance')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                dashboardTab === 'appearance' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Palette className="w-4 h-4" /> Appearance & Theme
            </button>
            <button
              onClick={() => handleTabChange('deploy')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                dashboardTab === 'deploy' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Share2 className="w-4 h-4" /> Deploy Hub (QR & Page)
            </button>
            <button
              onClick={() => handleTabChange('integrations')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                dashboardTab === 'integrations' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" /> Integrations (9 Channels)
            </button>
            <button
              onClick={() => handleTabChange('logs')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                dashboardTab === 'logs' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <History className="w-4 h-4" /> Conversation Logs
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-indigo-400" /> Embed Widget
              </span>
              <button 
                onClick={() => copyText(widgetSnippet, 'sidebar_snippet')} 
                className="text-slate-400 hover:text-white transition"
              >
                {copiedKey === 'sidebar_snippet' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <pre className="bg-slate-900 p-2 rounded text-[10px] text-indigo-300 font-mono overflow-x-auto">
              {widgetSnippet}
            </pre>
          </div>

          <button
            onClick={handleLogout}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
        {/* Tab 1: Training & Playground */}
        {dashboardTab === 'train' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-6 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-400" /> Train Knowledge Base
                  </h2>
                  <span className="text-[11px] font-mono bg-indigo-950/60 border border-indigo-800 text-indigo-300 px-2 py-0.5 rounded-lg">
                    {activeBot?.name || 'Bot'}
                  </span>
                </div>
                <p className="text-sm text-slate-400 mb-6">
                  Connect external data sources to enhance your AI assistant.
                </p>

                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-950 rounded-xl mb-6 border border-slate-800">
                  <button
                    onClick={() => { setActiveTab('website'); setTrainStatus(null); }}
                    className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition ${
                      activeTab === 'website' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Globe className="w-4 h-4" /> Website
                  </button>
                  <button
                    onClick={() => { setActiveTab('youtube'); setTrainStatus(null); }}
                    className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition ${
                      activeTab === 'youtube' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Video className="w-4 h-4" /> YouTube
                  </button>
                  <button
                    onClick={() => { setActiveTab('pdf'); setTrainStatus(null); }}
                    className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition ${
                      activeTab === 'pdf' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FileText className="w-4 h-4" /> Document
                  </button>
                </div>

                <form onSubmit={handleTrain} className="space-y-4">
                  {activeTab === 'website' && (
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-2">Webpage URL</label>
                      <input
                        type="url"
                        required
                        placeholder="https://example.com/about"
                        value={webUrl}
                        onChange={(e) => setWebUrl(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 text-white"
                      />
                    </div>
                  )}

                  {activeTab === 'youtube' && (
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-2">YouTube Video URL</label>
                      <input
                        type="url"
                        required
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={ytUrl}
                        onChange={(e) => setYtUrl(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 text-white"
                      />
                    </div>
                  )}

                  {activeTab === 'pdf' && (
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-2">Upload Document (.pdf)</label>
                      <input
                        type="file"
                        required
                        accept=".pdf"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer text-white"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={trainStatus?.type === 'loading'}
                    style={{ backgroundColor: customThemeColor }}
                    className="w-full py-2.5 hover:opacity-90 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition flex items-center justify-center gap-2"
                  >
                    {trainStatus?.type === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
                    Ingest & Index Knowledge
                  </button>
                </form>

                {trainStatus && (
                  <div className={`mt-4 p-3 rounded-xl flex items-center gap-2 text-xs ${
                    trainStatus.type === 'success' ? 'bg-emerald-950/50 border border-emerald-800 text-emerald-300' :
                    trainStatus.type === 'error' ? 'bg-rose-950/50 border border-rose-800 text-rose-300' :
                    'bg-slate-950 border border-slate-800 text-slate-400'
                  }`}>
                    {trainStatus.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
                    {trainStatus.type === 'error' && <AlertCircle className="w-4 h-4" />}
                    {trainStatus.msg}
                  </div>
                )}
              </div>
            </div>

            {/* Chat Playground */}
            <div className="lg:col-span-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col h-[580px]">
                <div className="border-b border-slate-800 pb-4 mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm">Playground & Preview</h3>
                    <p className="text-xs text-slate-400">Testing bot: <span className="text-indigo-400 font-mono">{activeBot?.name}</span></p>
                  </div>
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4">
                  {messages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        style={m.role === 'user' ? { backgroundColor: customThemeColor } : {}}
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                          m.role === 'user'
                            ? 'text-white rounded-br-none'
                            : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-none px-4 py-3 text-xs flex items-center gap-1.5 text-slate-400">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ask something about your trained data..."
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 text-white"
                  />
                  <button
                    type="submit"
                    disabled={isChatLoading || !inputQuery.trim()}
                    style={{ backgroundColor: customThemeColor }}
                    className="p-2.5 hover:opacity-90 disabled:opacity-50 text-white rounded-xl transition"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Appearance */}
        {dashboardTab === 'appearance' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-2">
                <Palette className="w-5 h-5 text-indigo-400" /> Widget Customization
              </h2>
              <p className="text-xs text-slate-400 mb-6">Customize the look and brand identity of your chatbot widget.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Primary Theme Color</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      value={customThemeColor} 
                      onChange={(e) => setCustomThemeColor(e.target.value)} 
                      className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                    />
                    <input 
                      type="text" 
                      value={customThemeColor} 
                      onChange={(e) => setCustomThemeColor(e.target.value)} 
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Welcome Message</label>
                  <textarea 
                    rows={2}
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none"
                  />
                </div>

                <button 
                  onClick={handleSaveAppearance}
                  style={{ backgroundColor: customThemeColor }}
                  className="w-full py-2.5 hover:opacity-90 text-white rounded-xl text-xs font-medium transition flex items-center justify-center gap-2"
                >
                  {appearanceSaved ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : 'Save Appearance'}
                </button>
              </div>
            </div>

            <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col items-center justify-center">
              <p className="text-xs text-slate-400 mb-4 font-semibold">Live Widget Preview</p>
              <div className="w-72 bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-2xl">
                <div style={{ backgroundColor: customThemeColor }} className="p-3 rounded-xl text-white font-bold text-xs flex items-center justify-between mb-4 transition-colors">
                  <span>{activeBot?.name || 'Assistant'}</span>
                  <span className="w-2 h-2 bg-emerald-400 rounded-full" />
                </div>
                <div className="bg-slate-900 p-3 rounded-xl text-xs text-slate-200 mb-3 border border-slate-800">
                  {welcomeMessage}
                </div>
                <div className="h-8 bg-slate-900 rounded-lg border border-slate-800 flex items-center px-2 text-[10px] text-slate-500">
                  Type a reply...
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: FastBots-style Deploy Hub (QR, Standalone Page, Embeds) */}
        {dashboardTab === 'deploy' && (
          <div className="flex flex-col gap-6 max-w-5xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-indigo-400" /> Deployment & Sharing Hub
                </h2>
                <p className="text-xs text-slate-400">Share your AI chatbot via hosted link, QR code, website widget, or inline embed.</p>
              </div>
              <span className="text-xs bg-indigo-950 text-indigo-300 border border-indigo-800 px-3 py-1.5 rounded-lg font-mono">
                Bot: {currentBotId}
              </span>
            </div>

            {/* 1. Support Page */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400">
                  <Globe className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-white">Support Page</h3>
                  <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-medium text-indigo-400 uppercase">
                    New
                  </span>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-slate-400 mb-4">
                A hosted, branded standalone support page for your chatbot. Send customers directly to your dedicated chat URL without requiring any website or code modifications.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="flex-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-slate-300 font-mono overflow-x-auto">
                  {supportPageUrl}
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => copyText(supportPageUrl, 'support_page')}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
                  >
                    {copiedKey === 'support_page' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedKey === 'support_page' ? 'Copied' : 'Copy'}
                  </button>
                  <a
                    href={supportPageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-medium text-white hover:bg-indigo-500 transition"
                  >
                    Open Page <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* 2. Direct Link & QR Code */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400">
                      <Smartphone className="h-4 w-4" />
                    </div>
                    <h3 className="text-base font-semibold text-white">Direct Link</h3>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-400 mb-4">
                    Share instant access to your chatbot via direct URL in social media bios, WhatsApp status, or email signatures.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-slate-300 font-mono truncate">
                    {directLinkUrl}
                  </div>
                  <button
                    onClick={() => copyText(directLinkUrl, 'direct_link')}
                    className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
                  >
                    {copiedKey === 'direct_link' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedKey === 'direct_link' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur flex flex-col items-center justify-center text-center">
                <div className="p-3 bg-white rounded-xl shadow-lg mb-3">
                  <QRCodeSVG id="bot-qr-code" value={directLinkUrl} size={105} />
                </div>
                <button
                  onClick={downloadQR}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500 transition w-full justify-center"
                >
                  <Download className="h-3.5 w-3.5" /> Download QR
                </button>
              </div>
            </div>

            {/* 3. Add to a Website */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400">
                  <Code2 className="h-4 w-4" />
                </div>
                <h3 className="text-base font-semibold text-white">Add to a Website</h3>
              </div>
              <p className="text-xs leading-relaxed text-slate-400 mb-4">
                Add the code below before the closing &lt;/body&gt; tag of your website (WordPress, Shopify, Webflow, React) to render a floating chat bubble on all pages.
              </p>
              <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-indigo-300">
                <pre className="overflow-x-auto whitespace-pre-wrap">{widgetSnippet}</pre>
                <button
                  onClick={() => copyText(widgetSnippet, 'script_snippet')}
                  className="absolute top-3 right-3 flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700 transition"
                >
                  {copiedKey === 'script_snippet' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedKey === 'script_snippet' ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* 4. Display Inside Webpage */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400">
                  <Layout className="h-4 w-4" />
                </div>
                <h3 className="text-base font-semibold text-white">Display Inside Webpage</h3>
              </div>
              <p className="text-xs leading-relaxed text-slate-400 mb-4">
                Embed the chatbot directly into an inline container (such as inside a Contact Us page or Help Center) rather than a floating bottom bubble.
              </p>
              <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-emerald-300">
                <pre className="overflow-x-auto whitespace-pre-wrap">{iframeSnippet}</pre>
                <button
                  onClick={() => copyText(iframeSnippet, 'iframe_snippet')}
                  className="absolute top-3 right-3 flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700 transition"
                >
                  {copiedKey === 'iframe_snippet' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedKey === 'iframe_snippet' ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Integrations (9 Channels) */}
        {dashboardTab === 'integrations' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-400" /> Integrations & Channels Hub (9 Platforms)
                </h2>
                <p className="text-xs text-slate-400">Connect your trained bot across 9 messaging, automation & CMS platforms for free.</p>
              </div>
              <span className="text-xs bg-indigo-950 text-indigo-300 border border-indigo-800 px-3 py-1.5 rounded-lg font-mono">
                Active Bot: {currentBotId}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              
              {/* WhatsApp */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">💬</span>
                    <span className="text-[10px] bg-emerald-950 border border-emerald-800 text-emerald-300 px-2 py-0.5 rounded-full font-semibold">1,000 Free / mo</span>
                  </div>
                  <h3 className="font-bold text-sm text-white mb-1">WhatsApp Cloud API</h3>
                  <p className="text-xs text-slate-400 mb-4">Auto-reply to customer WhatsApp messages via Meta Graph API.</p>
                </div>
                <button 
                  onClick={() => setActiveModal('whatsapp')}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition"
                >
                  Configure WhatsApp
                </button>
              </div>

              {/* Telegram */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">✈️</span>
                    <span className="text-[10px] bg-emerald-950 border border-emerald-800 text-emerald-300 px-2 py-0.5 rounded-full font-semibold">100% Free</span>
                  </div>
                  <h3 className="font-bold text-sm text-white mb-1">Telegram Bot</h3>
                  <p className="text-xs text-slate-400 mb-4">Connect with @BotFather API token for 24/7 instant channel & DM support.</p>
                </div>
                <button 
                  onClick={() => setActiveModal('telegram')}
                  className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold transition"
                >
                  Configure Telegram
                </button>
              </div>

              {/* WordPress */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">🌐</span>
                    <span className="text-[10px] bg-emerald-950 border border-emerald-800 text-emerald-300 px-2 py-0.5 rounded-full font-semibold">100% Free</span>
                  </div>
                  <h3 className="font-bold text-sm text-white mb-1">WordPress / Webflow</h3>
                  <p className="text-xs text-slate-400 mb-4">Paste script tag into header/footer of WordPress (WPCode) or custom HTML.</p>
                </div>
                <button 
                  onClick={() => setActiveModal('wordpress')}
                  style={{ backgroundColor: customThemeColor }}
                  className="w-full py-2.5 hover:opacity-90 text-white rounded-xl text-xs font-semibold transition"
                >
                  Get Embed Code
                </button>
              </div>

              {/* Slack */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">💼</span>
                    <span className="text-[10px] bg-emerald-950 border border-emerald-800 text-emerald-300 px-2 py-0.5 rounded-full font-semibold">100% Free</span>
                  </div>
                  <h3 className="font-bold text-sm text-white mb-1">Slack Workspace Bot</h3>
                  <p className="text-xs text-slate-400 mb-4">Query company knowledge directly from Slack channels via Event Subscriptions.</p>
                </div>
                <button 
                  onClick={() => setActiveModal('slack')}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
                >
                  Configure Slack
                </button>
              </div>

              {/* Discord */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">👾</span>
                    <span className="text-[10px] bg-emerald-950 border border-emerald-800 text-emerald-300 px-2 py-0.5 rounded-full font-semibold">100% Free</span>
                  </div>
                  <h3 className="font-bold text-sm text-white mb-1">Discord Bot</h3>
                  <p className="text-xs text-slate-400 mb-4">Connect your bot to Discord servers using Discord Developer Bot Token.</p>
                </div>
                <button 
                  onClick={() => setActiveModal('discord')}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition"
                >
                  Configure Discord
                </button>
              </div>

              {/* Webhook */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">⚡</span>
                    <span className="text-[10px] bg-indigo-950 border border-indigo-800 text-indigo-300 px-2 py-0.5 rounded-full font-semibold">REST API</span>
                  </div>
                  <h3 className="font-bold text-sm text-white mb-1">Make / Zapier Webhook</h3>
                  <p className="text-xs text-slate-400 mb-4">Trigger automations, CRM lead sync & Google Sheets workflows via POST.</p>
                </div>
                <button 
                  onClick={() => setActiveModal('webhook')}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
                >
                  View Webhook URL
                </button>
              </div>

              {/* Twilio */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">📱</span>
                    <span className="text-[10px] bg-emerald-950 border border-emerald-800 text-emerald-300 px-2 py-0.5 rounded-full font-semibold">Free Sandbox</span>
                  </div>
                  <h3 className="font-bold text-sm text-white mb-1">Twilio SMS / WhatsApp</h3>
                  <p className="text-xs text-slate-400 mb-4">Connect Twilio Phone Numbers to respond to standard SMS via TwiML.</p>
                </div>
                <button 
                  onClick={() => setActiveModal('twilio')}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
                >
                  Configure Twilio
                </button>
              </div>

              {/* Shopify */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">🛍️</span>
                    <span className="text-[10px] bg-emerald-950 border border-emerald-800 text-emerald-300 px-2 py-0.5 rounded-full font-semibold">100% Free</span>
                  </div>
                  <h3 className="font-bold text-sm text-white mb-1">Shopify Store</h3>
                  <p className="text-xs text-slate-400 mb-4">Add floating support bubble directly inside your Shopify theme.liquid file.</p>
                </div>
                <button 
                  onClick={() => setActiveModal('shopify')}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
                >
                  Shopify Guide
                </button>
              </div>

              {/* Upgrade Pro */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-xl relative overflow-hidden">
                <div className="absolute top-2 right-2 bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-md">
                  PRO Plan ($19/mo)
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">📸</span>
                  </div>
                  <h3 className="font-bold text-sm text-white mb-1">Instagram & Messenger</h3>
                  <p className="text-xs text-slate-400 mb-4">Auto-reply to Instagram DMs and Facebook page comments directly via AI.</p>
                </div>
                <button 
                  onClick={() => setActiveModal('upgrade')}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition"
                >
                  Upgrade to Unlock
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Tab 5: Logs */}
        {dashboardTab === 'logs' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-indigo-400" /> Recorded Logs ({activeBot?.name})
                </h2>
                <p className="text-xs text-slate-400">Questions asked to {currentBotId}</p>
              </div>
              <button 
                onClick={fetchLogs} 
                style={{ backgroundColor: customThemeColor }}
                className="px-3 py-1.5 hover:opacity-90 text-white rounded-lg text-xs font-medium"
              >
                Refresh Logs
              </button>
            </div>

            {isLogsLoading ? (
              <div className="p-8 text-center text-slate-400 text-xs flex justify-center items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading recorded chats...
              </div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">No chat history recorded for this bot yet.</div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {logs.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[11px] font-semibold">
                      <span className={log.sender === 'user' ? 'text-indigo-400' : 'text-emerald-400'}>
                        {log.sender.toUpperCase()}
                      </span>
                      <span className="text-slate-500">{log.created_at}</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{log.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Dynamic Modals */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg text-white shadow-2xl relative">
            <button 
              onClick={() => setActiveModal(null)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {/* WhatsApp */}
            {activeModal === 'whatsapp' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold flex items-center gap-2">💬 Meta WhatsApp Cloud API</h3>
                <p className="text-xs text-slate-400">Meta provides 1,000 free conversations every month. Use these details in developers.facebook.com:</p>
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-2">
                  <div className="text-[11px] text-slate-400">Callback URL:</div>
                  <div className="font-mono text-emerald-400 text-[11px] break-all">{`${BASE_URL}/integrations/whatsapp/${currentBotId}`}</div>
                  <div className="text-[11px] text-slate-400 pt-1">Verify Token:</div>
                  <div className="font-mono text-amber-300 text-[11px]">cloudbot_secret_token_2026</div>
                </div>
                <button 
                  onClick={() => copyText(`${BASE_URL}/integrations/whatsapp/${currentBotId}`, 'wa_url')}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  {copiedKey === 'wa_url' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedKey === 'wa_url' ? "Copied Callback URL!" : "Copy Callback URL"}
                </button>
              </div>
            )}

            {/* Telegram */}
            {activeModal === 'telegram' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold flex items-center gap-2">✈️ Telegram Bot Setup</h3>
                <p className="text-xs text-slate-400">Create a bot on Telegram via <strong>@BotFather</strong>, paste your token, and activate:</p>
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
                      const tgWebhookUrl = `${BASE_URL}/integrations/telegram/${currentBotId}?token=${tgToken.trim()}`;
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

            {/* WordPress */}
            {activeModal === 'wordpress' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold flex items-center gap-2">🌐 WordPress & Website Embed</h3>
                <p className="text-xs text-slate-400">Paste before <code>&lt;/body&gt;</code> in WordPress (via WPCode plugin) or any HTML file:</p>
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-[11px] font-mono text-indigo-300 break-all">{widgetSnippet}</div>
                <button 
                  onClick={() => copyText(widgetSnippet, 'wp_copy')}
                  style={{ backgroundColor: customThemeColor }}
                  className="w-full py-2.5 hover:opacity-90 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  {copiedKey === 'wp_copy' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedKey === 'wp_copy' ? "Copied Script!" : "Copy Script"}
                </button>
              </div>
            )}

            {/* Slack */}
            {activeModal === 'slack' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold flex items-center gap-2">💼 Slack Workspace Setup</h3>
                <p className="text-xs text-slate-400">Set this Request URL in your Slack App Event Subscriptions:</p>
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs">
                  <div className="font-mono text-amber-300 text-[11px] break-all">{`${BASE_URL}/integrations/slack/${currentBotId}`}</div>
                </div>
                <button 
                  onClick={() => copyText(`${BASE_URL}/integrations/slack/${currentBotId}`, 'slack_copy')}
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
                  <div className="font-mono text-indigo-300 text-[11px] break-all">{`${BASE_URL}/integrations/discord/${currentBotId}`}</div>
                </div>
                <button 
                  onClick={() => copyText(`${BASE_URL}/integrations/discord/${currentBotId}`, 'disc_copy')}
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
                  <div className="font-mono text-indigo-300 text-[11px] break-all">{`${BASE_URL}/integrations/webhook/${currentBotId}`}</div>
                  <div className="text-[11px] text-slate-400 pt-1">Payload (JSON):</div>
                  <pre className="text-[10px] text-amber-300 font-mono bg-slate-900 p-2 rounded">{`{ "question": "Customer question here" }`}</pre>
                </div>
                <button 
                  onClick={() => copyText(`${BASE_URL}/integrations/webhook/${currentBotId}`, 'webhook_copy')}
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
                  <div className="font-mono text-emerald-400 text-[11px] break-all">{`${BASE_URL}/integrations/twilio/${currentBotId}`}</div>
                </div>
                <button 
                  onClick={() => copyText(`${BASE_URL}/integrations/twilio/${currentBotId}`, 'tw_copy')}
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
                  onClick={() => copyText(widgetSnippet, 'shop_copy')}
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

      {/* Create Bot Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md text-white shadow-2xl">
            <h3 className="text-base font-bold mb-1 flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-400" /> Create Custom Bot
            </h3>
            <p className="text-xs text-slate-400 mb-4">Configure a dedicated assistant instance.</p>

            <form onSubmit={handleCreateBot} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Bot Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sales Assistant"
                  value={newBotName}
                  onChange={(e) => setNewBotName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-indigo-500 text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">System Prompt</label>
                <textarea
                  rows={3}
                  value={newBotPrompt}
                  onChange={(e) => setNewBotPrompt(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-indigo-500 text-white"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingBot || !newBotName.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-medium transition flex items-center gap-2"
                >
                  {isCreatingBot && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Create Bot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}