import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Trash2,
  Copy,
  Check,
  Bot,
  User,
  RefreshCw,
  Zap,
  BookOpen,
  Compass,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  Minimize2,
  Maximize2,
  X,
} from 'lucide-react';
import { Book, LibrarySettings } from '../types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  modelUsed?: string;
  roleId?: string;
}

export type ChatbotRole = 'librarian' | 'scholar' | 'general';
export type GeminiModel = 'gemini-3.8-flash' | 'gemini-3.1-flash-lite' | 'gemini-4-argon';

interface GeminiChatbotProps {
  books?: Book[];
  settings?: LibrarySettings;
  isFloating?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  onNavigateTab?: (tab: string) => void;
}

const STORAGE_KEY = 'dac_gemini_chat_history';

const DEFAULT_WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome-1',
  role: 'model',
  text: `السلام عليكم ورحمة الله وبركاته! مرحباً بكم في المكتبة المركزية لكلية دينية العربية.
أنا **أمين المكتبة الذكي (Gemini AI)**، ومساعدك الأكاديمي للبحث في الفهرس وتصفح كتب العلوم الشرعية، الحديث، الفقه، واللغة العربية.

كيف يمكنني خدمتك اليوم؟ يمكنك اختياري للبحث عن عناوين، أو اقتراح مراجع، أو الاستفسار عن لوائح الاستعارة.`,
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  modelUsed: 'gemini-3.8-flash',
  roleId: 'librarian',
};

const PROMPT_SUGGESTIONS = [
  { label: 'أهم مراجع أصول الفقه', prompt: 'ما هي أهم مراجع وقواعد أصول الفقه المعتمدة في المكتبة؟' },
  { label: 'شروح صحيح البخاري', prompt: 'اقترح لي شروح موثوقة لصحيح الإمام البخاري وطريقة دراستها.' },
  { label: 'لوائح استعارة الكتب', prompt: 'ما هي شروط وسياسات استعارة الكتب للطلاب ومدة الإعارة المسموحة؟' },
  { label: 'Islamic Studies Dewey Class', prompt: 'How is Islamic literature classified according to the Dewey Decimal Classification system in the library?' },
  { label: 'خطة قراءة في النحو', prompt: 'ضع لي خطة متدرجة لقراءة كتب النحو العربي من المبتدئ إلى المتقدم.' },
];

export const GeminiChatbot: React.FC<GeminiChatbotProps> = ({
  books = [],
  settings,
  isFloating = false,
  isOpen = true,
  onClose,
  onNavigateTab,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore parse errors
    }
    return [DEFAULT_WELCOME_MESSAGE];
  });

  const [inputPrompt, setInputPrompt] = useState('');
  const [activeRole, setActiveRole] = useState<ChatbotRole>('librarian');
  const [selectedModel, setSelectedModel] = useState<GeminiModel>('gemini-3.8-flash');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Persist messages in localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Storage quota or private browsing
    }
  }, [messages]);

  const handleClearHistory = () => {
    if (confirm('هل أنت متأكد من مسح سجل المحادثة؟ (Clear conversation history?)')) {
      const reset = [
        {
          ...DEFAULT_WELCOME_MESSAGE,
          id: 'welcome-' + Date.now(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ];
      setMessages(reset);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reset));
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputPrompt).trim();
    if (!textToSend || isLoading) return;

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInputPrompt('');
    setIsLoading(true);
    setErrorMsg(null);

    try {
      // Prepare payload with history (up to last 12 turns for optimal context)
      const recentHistory = nextMessages.slice(-12).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: recentHistory,
          model: selectedModel,
          roleId: activeRole,
          context: {
            totalBooks: books.length,
            totalCopies: books.reduce((acc, b) => acc + 1, 0),
          },
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to get response from Gemini.');
      }

      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        role: 'model',
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: data.modelUsed || selectedModel,
        roleId: activeRole,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err: unknown) {
      console.error('Chat error:', err);
      const errMsg = err instanceof Error ? err.message : 'Network error communicating with Gemini.';
      setErrorMsg(errMsg);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  // Simple Markdown Formatter
  const renderFormattedText = (text: string) => {
    return text.split('\n').map((line, idx) => {
      // Bold rendering
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const isBullet = line.trim().startsWith('* ') || line.trim().startsWith('- ');
      const content = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={pIdx} className="font-bold text-slate-900 dark:text-amber-200">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      if (isBullet) {
        return (
          <li key={idx} className="ml-4 list-disc my-0.5 leading-relaxed">
            {content}
          </li>
        );
      }

      if (!line.trim()) {
        return <div key={idx} className="h-2" />;
      }

      return (
        <p key={idx} className="my-1 leading-relaxed">
          {content}
        </p>
      );
    });
  };

  const containerClasses = isFloating
    ? `fixed bottom-3 left-3 right-3 sm:left-auto sm:right-5 sm:w-[480px] z-50 shadow-2xl rounded-3xl border border-amber-500/40 overflow-hidden bg-white dark:bg-slate-900 flex flex-col transition-all duration-300 ${
        isMinimized ? 'h-14' : 'h-[580px] max-h-[88vh]'
      }`
    : 'w-full max-w-5xl mx-auto rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg bg-white dark:bg-slate-900 flex flex-col h-[760px] overflow-hidden';

  return (
    <div className={containerClasses}>
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 text-white flex items-center justify-between border-b border-emerald-800/40 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="p-2.5 bg-gradient-to-tr from-amber-600 to-emerald-600 rounded-2xl text-white shadow-md">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-slate-900 rounded-full"></span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm sm:text-base font-bold tracking-tight">
                Gemini AI Library Scholar · أمين المكتبة الذكي
              </h2>
            </div>
            <p className="text-[11px] text-emerald-300 font-arabic">
              مساعد البحث الرقمي وتوجيه الطلاب في العلوم الشرعية والعربية
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={handleClearHistory}
            className="p-1.5 rounded-xl text-slate-300 hover:text-red-300 hover:bg-white/10 transition"
            title="مسح سجل المحادثة · Clear conversation"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {isFloating && (
            <>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Subheader: Role & Model Switcher */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            {/* Roles selector */}
            <div className="flex items-center space-x-1 p-0.5 bg-slate-200/70 dark:bg-slate-800 rounded-xl">
              <button
                onClick={() => setActiveRole('librarian')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-medium transition ${
                  activeRole === 'librarian'
                    ? 'bg-white dark:bg-slate-700 text-emerald-800 dark:text-emerald-300 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Librarian: Catalog guide, book finder, borrowing guidelines"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>أمين المكتبة</span>
              </button>
              <button
                onClick={() => setActiveRole('scholar')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-medium transition ${
                  activeRole === 'scholar'
                    ? 'bg-white dark:bg-slate-700 text-amber-800 dark:text-amber-300 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Scholar: Classical Fiqh, Hadith verification, scholarly research"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>باحث التراث</span>
              </button>
              <button
                onClick={() => setActiveRole('general')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-medium transition ${
                  activeRole === 'general'
                    ? 'bg-white dark:bg-slate-700 text-blue-800 dark:text-blue-300 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="General: Quick questions on hours, loans, cards"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>مرشد سريع</span>
              </button>
            </div>

            {/* Model Selector */}
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">Model:</span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value as GeminiModel)}
                className="py-1 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-mono font-medium focus:ring-1 focus:ring-amber-500 outline-none"
              >
                <option value="gemini-3.8-flash">gemini-3.8-flash (General Scholar)</option>
                <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Fast Tasks)</option>
                <option value="gemini-4-argon">gemini-4-argon (Complex Research)</option>
              </select>
            </div>
          </div>

          {/* Quick Suggestions Chips */}
          <div className="px-3.5 py-2 bg-emerald-50/50 dark:bg-emerald-950/20 border-b border-emerald-900/10 flex items-center space-x-2 overflow-x-auto scrollbar-none text-[11px]">
            <span className="text-emerald-800 dark:text-emerald-300 font-semibold shrink-0 flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Suggested:</span>
            </span>
            {PROMPT_SUGGESTIONS.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(item.prompt)}
                className="shrink-0 px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-emerald-300/60 dark:border-emerald-700/60 hover:border-emerald-500 text-slate-700 dark:text-slate-300 font-medium hover:bg-emerald-50 transition"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Message Thread (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                      isUser
                        ? 'bg-emerald-700 text-white'
                        : 'bg-gradient-to-tr from-amber-600 to-emerald-700 text-white'
                    }`}
                  >
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  {/* Bubble */}
                  <div
                    className={`relative max-w-[85%] sm:max-w-[78%] rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm ${
                      isUser
                        ? 'bg-emerald-700 text-white rounded-tr-xs shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 rounded-tl-xs border border-slate-200 dark:border-slate-700/80 shadow-xs'
                    }`}
                  >
                    {/* Header info */}
                    <div className="flex items-center justify-between mb-1 pb-1 border-b border-black/5 dark:border-white/10 text-[10px] opacity-75">
                      <span className="font-semibold">
                        {isUser ? 'You · الباحث' : 'Gemini AI Scholar · أمين المكتبة'}
                      </span>
                      <div className="flex items-center space-x-2">
                        <span>{msg.timestamp}</span>
                        {!isUser && (
                          <button
                            onClick={() => handleCopyText(msg.id, msg.text)}
                            className="p-1 hover:text-amber-500 transition"
                            title="Copy response"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div dir="auto" className="font-sans antialiased text-left rtl:text-right">
                      {renderFormattedText(msg.text)}
                    </div>

                    {/* Model tag footer */}
                    {!isUser && msg.modelUsed && (
                      <div className="mt-2 pt-1 border-t border-black/5 dark:border-white/10 flex items-center justify-between text-[9px] opacity-60 font-mono">
                        <span>Model: {msg.modelUsed}</span>
                        <span>Role: {msg.roleId || 'librarian'}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Thinking / Loading indicator */}
            {isLoading && (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-amber-600 to-emerald-700 text-white flex items-center justify-center shrink-0 animate-pulse">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-center space-x-2.5">
                  <div className="flex space-x-1">
                    <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                  <span className="font-arabic font-medium">
                    جارٍ البحث والتحقيق بواسطة {selectedModel}...
                  </span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
                <button
                  onClick={() => handleSendMessage()}
                  className="px-2 py-1 bg-red-600 text-white rounded-lg text-[10px] font-semibold hover:bg-red-700"
                >
                  إعادة المحاولة (Retry)
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
            <div className="relative flex items-end rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 focus-within:ring-2 focus-within:ring-amber-500 focus-within:border-transparent transition">
              <textarea
                ref={inputRef}
                rows={2}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="اسأل أمين المكتبة عن أي كتاب، موضوع فقهي، أو مرجع علمي... (Ask Gemini Scholar in Arabic or English)"
                dir="auto"
                disabled={isLoading}
                className="w-full p-3 text-xs sm:text-sm bg-transparent outline-none resize-none text-slate-900 dark:text-slate-100 placeholder-slate-400"
              />

              <div className="p-2 shrink-0">
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputPrompt.trim() || isLoading}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-800 text-white hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition active:scale-95"
                  title="Send Message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 px-1">
              <span>Press <b>Enter</b> to send · <b>Shift+Enter</b> for new line</span>
              <span>Protected Gemini API · Deeniya Arabic College</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
