'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bot, Globe, Video, FileText, Send, Sparkles, 
  CheckCircle2, AlertCircle, Loader2, Code2, Copy, LogOut, Lock, Mail, MessageSquare, History, Plus,
  Palette, Share2, Layers, MessageCircle, Sliders, ExternalLink
} from 'lucide-react';
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

  // Navigation: FastBots Style Hub Tabs
  const [dashboardTab, setDashboardTab] = useState<'train' | 'logs' | 'appearance' | 'integrations'>('train');
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
  const [copied, setCopied] = useState(false);

  // Chat Logs State
  const [logs, setLogs] = useState<Array<{ id: string; sender: string; message: string; created_at: string }>>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);

  // Appearance States
  const [customThemeColor, setCustomThemeColor] = useState('#4f46e5');
  const [welcomeMessage, setWelcomeMessage] = useState('Hello! How can I assist you today?');
  const [appearanceSaved, setAppearanceSaved] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('access_token');
    if (savedToken) setToken(savedToken);
  }, []);

  const loadBots = async () => {
    try {
      const userBots = await getUserBots();
      setBots(userBots);
      if (userBots.length > 0 && !activeBot) {
        setActiveBot(userBots[0]);
      } else if (userBots.length === 0) {
        const defaultBot = { id: 'test_bot_1', name: 'Default Assistant' };
        setActiveBot(defaultBot);
      }
    } catch {
      setActiveBot({ id: 'test_bot_1', name: 'Default Assistant' });
    }
  };

  useEffect(() => {
    if (token) {
      loadBots();
    }
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
      setAuthError(err.response?.data?.detail || 'Authentication failed. Please check credentials.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
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
        ? '⚠️ Free tier message limit reached (50/50). Please contact support to continue.' 
        : 'Error: Could not retrieve answer.';
      setMessages((prev) => [...prev, { role: 'bot', text: errorText }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const widgetSnippet = `<script 
  src="https://cloudbot-saas.onrender.com/widget.js" 
  data-bot-id="${activeBot?.id || 'test_bot_1'}" 
  defer>
</script>`;

  const copyWidgetCode = () => {
    navigator.clipboard.writeText(widgetSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            <div className="p-2 bg-indigo-600 rounded-lg">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">CloudBot AI</h1>
          </div>

          {/* Bot Switcher & Creator */}
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

          {/* Navigation Menu (FastBots Inspired) */}
          <div className="space-y-1.5 mb-6">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">Workspace</p>
            <button
              onClick={() => setDashboardTab('train')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                dashboardTab === 'train' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4" /> Training & Playground
            </button>
            <button
              onClick={() => setDashboardTab('appearance')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                dashboardTab === 'appearance' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Palette className="w-4 h-4" /> Appearance & Theme
            </button>
            <button
              onClick={() => setDashboardTab('integrations')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                dashboardTab === 'integrations' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" /> Integrations
            </button>
            <button
              onClick={() => setDashboardTab('logs')}
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
                onClick={copyWidgetCode} 
                className="text-slate-400 hover:text-white transition"
                title="Copy snippet"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
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

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
        {dashboardTab === 'train' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Data Ingestion */}
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
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition flex items-center justify-center gap-2"
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

            {/* Right Column: Live Chat Playground */}
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
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                          m.role === 'user'
                            ? 'bg-indigo-600 text-white rounded-br-none'
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
                    className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Appearance & Theme Customizer */}
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
                  onClick={() => {
                    setAppearanceSaved(true);
                    setTimeout(() => setAppearanceSaved(false), 2000);
                  }}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium transition flex items-center justify-center gap-2"
                >
                  {appearanceSaved ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : 'Save Appearance'}
                </button>
              </div>
            </div>

            <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col items-center justify-center">
              <p className="text-xs text-slate-400 mb-4 font-semibold">Live Widget Preview</p>
              <div className="w-72 bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-2xl">
                <div style={{ backgroundColor: customThemeColor }} className="p-3 rounded-xl text-white font-bold text-xs flex items-center justify-between mb-4">
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

        {/* Tab 3: Integrations Hub (FastBots Style) */}
        {dashboardTab === 'integrations' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="mb-6 pb-4 border-b border-slate-800">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" /> Native Integrations
              </h2>
              <p className="text-xs text-slate-400">Connect your trained bot directly to external channels and apps.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* WhatsApp */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">🟢</span>
                    <span className="text-[10px] bg-indigo-950 border border-indigo-800 text-indigo-300 px-2 py-0.5 rounded-full font-semibold">Ready</span>
                  </div>
                  <h3 className="font-bold text-sm text-white mb-1">WhatsApp Business</h3>
                  <p className="text-xs text-slate-400 mb-4">Connect your bot with WhatsApp Cloud API to automate 24/7 client messages.</p>
                </div>
                <button className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition">
                  Configure
                </button>
              </div>

              {/* WordPress */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">🌐</span>
                    <span className="text-[10px] bg-emerald-950 border border-emerald-800 text-emerald-300 px-2 py-0.5 rounded-full font-semibold">Active</span>
                  </div>
                  <h3 className="font-bold text-sm text-white mb-1">WordPress / Web Embed</h3>
                  <p className="text-xs text-slate-400 mb-4">One-line script integration for any WordPress, Webflow, or Shopify site.</p>
                </div>
                <button onClick={copyWidgetCode} className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition">
                  Copy Script Code
                </button>
              </div>

              {/* Webhooks / Zapier */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">⚡</span>
                    <span className="text-[10px] bg-indigo-950 border border-indigo-800 text-indigo-300 px-2 py-0.5 rounded-full font-semibold">Ready</span>
                  </div>
                  <h3 className="font-bold text-sm text-white mb-1">Zapier / Webhooks</h3>
                  <p className="text-xs text-slate-400 mb-4">Send chat leads and logs straight into Google Sheets or your CRM.</p>
                </div>
                <button className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition">
                  Manage Webhook
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Conversation Logs */}
        {dashboardTab === 'logs' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-indigo-400" /> Recorded Logs ({activeBot?.name})
                </h2>
                <p className="text-xs text-slate-400">Questions asked to {activeBot?.id}</p>
              </div>
              <button 
                onClick={fetchLogs} 
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium"
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

      {/* Create New Bot Modal */}
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