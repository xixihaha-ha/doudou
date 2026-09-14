import { zhLabel } from './locale'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Settings,
  User,
  Zap,
  Globe,
  Terminal,
  Copy,
  Check,
  X,
  Mic,
  Play,
  Pause,
  Upload,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Send,
  Monitor,
  Eye,
  EyeOff,
  ClipboardList,
  Minimize2,
  History,
  BookOpen,
  Sparkles,
  Search,
  Award,
  HelpCircle
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import './App.css'
import Tooltip from './components/Tooltip'
import questionBank from './data/question_bank.json'

declare global {
  interface Window {
    electron: any;
  }
}

type DrawerMode = 'response' | 'account' | 'settings' | 'strategy' | 'chat' | 'history' | 'notes' | 'practice' | 'guide';

const springGentle: any = { type: "spring", stiffness: 300, damping: 30 };

const pillVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 10 },
  visible: {
    opacity: 1, scale: 1, y: 0,
    transition: springGentle
  },
  exit: { opacity: 0, scale: 0.9, y: 5, transition: { duration: 0.2 } }
};

interface StarContent {
  situation: string;
  task: string;
  action: string;
  result: string;
}

function parseStarResponse(text: string): StarContent {
  const getTag = (tag: string) => {
    if (!text) return '';
    const startTag = `<${tag}>`;
    const endTag = `</${tag}>`;
    const lowerText = text.toLowerCase();
    const startIdx = lowerText.indexOf(startTag.toLowerCase());
    if (startIdx === -1) return '';
    const contentStart = startIdx + startTag.length;
    const endIdx = lowerText.indexOf(endTag.toLowerCase(), contentStart);
    if (endIdx === -1) {
      return text.substring(contentStart).trim();
    }
    return text.substring(contentStart, endIdx).trim();
  };
  return {
    situation: getTag('situation'),
    task: getTag('task'),
    action: getTag('action'),
    result: getTag('result')
  };
}

function BehavioralStarPanel({ text }: { text: string }) {
  const parsed = parseStarResponse(text);
  const [activeTab, setActiveTab] = useState<'S' | 'T' | 'A' | 'R'>('S');
  
  const steps = [
    { key: 'S' as const, label: "情境", content: parsed.situation, tips: "交代背景：公司、团队和遇到的问题。" },
    { key: 'T' as const, label: "任务", content: parsed.task, tips: "明确挑战：预期、目标和你的职责。" },
    { key: 'A' as const, label: "行动", content: parsed.action, tips: "说明细节：做了什么、如何做，以及为什么这样做。" },
    { key: 'R' as const, label: "结果", content: parsed.result, tips: "突出成果：具体指标、经验和收获。" }
  ];

  const currentStep = steps.find(s => s.key === activeTab)!;

  useEffect(() => {
    if (parsed.result && activeTab !== 'R') {
      setActiveTab('R');
    } else if (parsed.action && !parsed.result && activeTab !== 'A') {
      setActiveTab('A');
    } else if (parsed.task && !parsed.action && activeTab !== 'T') {
      setActiveTab('T');
    } else if (parsed.situation && !parsed.task && activeTab !== 'S') {
      setActiveTab('S');
    }
  }, [parsed.situation, parsed.task, parsed.action, parsed.result]);

  return (
    <div className="star-panel no-drag">
      <nav className="star-progress-bar" aria-label="STAR 回答步骤">
        {steps.map(step => (
          <button 
            key={step.key} 
            className={`star-step-btn ${activeTab === step.key ? 'active' : ''} ${step.content ? 'has-content' : ''}`}
            onClick={() => setActiveTab(step.key)}
            type="button"
          >
            <span className="step-badge">{step.key}</span>
            <span className="step-label">{step.label}</span>
          </button>
        ))}
      </nav>
      
      <section className="star-content-card">
        <header className="star-header">
          <h4>{currentStep.label} 阶段</h4>
          <span className="star-tips">{currentStep.tips}</span>
        </header>
        <div className="star-body">
          {currentStep.content ? (
            <p className="star-text">{currentStep.content}</p>
          ) : (
            <div className="star-placeholder">正在等待回答内容…</div>
          )}
        </div>
      </section>
    </div>
  );
}

function CodingAssistantPanel({ responseText }: { responseText: string }) {
  const [selectedLang, setSelectedLang] = useState<'python' | 'javascript' | 'cpp'>('python');

  const codeBlocks: { lang: string; code: string }[] = [];
  const regex = /```(\w*)\n([\s\S]*?)(?:```|$)/g;
  let match;
  while ((match = regex.exec(responseText)) !== null) {
    codeBlocks.push({
      lang: match[1].toLowerCase(),
      code: match[2].trim()
    });
  }
  
  const getCodeForLang = (lang: string) => {
    const direct = codeBlocks.find(b => b.lang === lang || (lang === 'cpp' && b.lang === 'c++'));
    if (direct) return direct.code;
    if (codeBlocks.length > 0) return codeBlocks[0].code;
    return '';
  };

  const currentCode = getCodeForLang(selectedLang);
  const explanation = responseText.replace(/```[\s\S]*?```/g, '').trim();

  return (
    <div className="coding-assistant-panel no-drag">
      <div className="assistant-tabs-header no-drag">
        {(['python', 'javascript', 'cpp'] as const).map(lang => (
          <button 
            key={lang}
            className={`tab-btn no-drag ${selectedLang === lang ? 'active' : ''}`}
            onClick={() => setSelectedLang(lang)}
            type="button"
          >
            {lang === 'cpp' ? 'C++' : lang.charAt(0).toUpperCase() + lang.slice(1)}
          </button>
        ))}
      </div>

      <div className="code-display-section">
        {currentCode ? (
          <CodeBlock code={currentCode} lang={selectedLang} />
        ) : (
          <div className="code-placeholder">正在生成代码方案…</div>
        )}
      </div>

      {explanation && (
        <div className="explanation-section">
          <h3>解题说明</h3>
          <ResponseRenderer text={explanation} />
        </div>
      )}
    </div>
  );
}

function App() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('response')
  const [isLive, setIsLive] = useState(false)
  const [status, setStatus] = useState("v1.3.0 开源版")
  const [isError, setIsError] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [platform, setPlatform] = useState<string>('win32')

  const [transcript, setTranscript] = useState("")
  const [aiResponse, setAiResponse] = useState("")
  const [history, setHistory] = useState<{ id: number, q: string, a: string, strategy: string }[]>([])
  const [ossMode, setOssMode] = useState(false)
  const [contextText, setContextText] = useState("")
  const [detectedStrategy, setDetectedStrategy] = useState<string | null>(null)
  const [chatInput, setChatInput] = useState('')
  const [audioDevices, setAudioDevices] = useState<{ id: string, name: string }[]>([])
  const [outputDevices, setOutputDevices] = useState<{ id: string, name: string }[]>([])
  const [isThinking, setIsThinking] = useState(false)
  const [liveTranscript, setLiveTranscript] = useState("")
  const liveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [linkedFilesCount, setLinkedFilesCount] = useState(0)
  const [snapshotsCount, setSnapshotsCount] = useState(0)

  // Meeting Notes state
  const [sessionStatus, setSessionStatus] = useState<any>({ entries: 0, questions: 0, duration_seconds: 0, is_active: false, last_saved: '' })
  const [savedNotes, setSavedNotes] = useState<any[]>([])

  const [availableModels, setAvailableModels] = useState<{ [provider: string]: string[] }>({
    groq: [
      "openai/gpt-oss-120b",
      "meta-llama/llama-4-scout-17b-16e-instruct",
      "openai/gpt-oss-20b",
      "moonshotai/kimi-k2-instruct",
      "llama-3.3-70b-versatile",
    ],
    gemini: [
      "gemini-2.5-flash",
      "gemini-2.5-pro",
      "gemini-2.0-flash",
      "gemini-3.7-flash",
    ],
    openai: [
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4.1",
      "gpt-4.1-mini",
      "gpt-4.1-nano",
      "o3-mini",
      "o4-mini",
    ],
    anthropic: [
      "claude-sonnet-4-6",
      "claude-sonnet-5",
      "claude-opus-4-8",
      "claude-3-5-haiku-20241022",
    ],
    deepseek: [
      "deepseek-v4-pro",
      "deepseek-v4-flash",
      "deepseek-v4-flash-vision-exp",
    ],
    openrouter: [],
  })
  const [modelSelections, setModelSelections] = useState<{ [provider: string]: string }>({})
  const [modelDefaults, setModelDefaults] = useState<{ [provider: string]: string }>({})

  const [settingsTab, setSettingsTab] = useState<'General' | 'Display' | 'Hotkeys' | 'API Keys'>('General')
  const [volume, setVolume] = useState(0)
  const [practiceCategory, setPracticeCategory] = useState('All')
  const [practiceSearch, setPracticeSearch] = useState('')

  const chatInputRef = useRef<HTMLInputElement>(null)
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const responseScrollRef = useRef<HTMLDivElement>(null)
  const followResponseRef = useRef(true)
  const containerRef = useRef<HTMLDivElement>(null)

  // Toast notification system (v1.3.0)
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: 'error' | 'success' | 'info' }[]>([])
  const toastIdRef = useRef(0)
  const showToast = useCallback((msg: string, type: 'error' | 'success' | 'info' = 'info') => {
    const id = ++toastIdRef.current
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3500)
  }, [])

  // Sidecar connection health (v1.3.0)
  const [sidecarConnected, setSidecarConnected] = useState(true)
  const sidecarConnectedRef = useRef(true) // Ref to avoid stale closures
  const healthCheckRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Auto-scroll chat / response stream
  useEffect(() => {
    if (!aiResponse) followResponseRef.current = true;
    if (drawerMode === 'response' && responseScrollRef.current && followResponseRef.current) {
      const panel = responseScrollRef.current;
      panel.scrollTop = panel.scrollHeight;
    }
  }, [aiResponse, isThinking, liveTranscript]);

  // Auto-focus Chat Input (v1.1.8)
  useEffect(() => {
    if (drawerOpen && drawerMode === 'chat') {
      // Small timeout to ensure AnimatePresence mount
      const t = setTimeout(() => {
        chatInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(t);
    }
  }, [drawerOpen, drawerMode]);

  const isFirstLoadRef = useRef(true);

  const [settings, setSettings] = useState<any>({
    auto_answer: true,
    interview_mode: true,
    stealth_mode: false,
    save_transcripts: false,
    transcript_language: 'auto',
    text_size: 15,
    low_credit_alert: true,
    session_end_warning: true,
    autoload_resume: false,
    show_guide_startup: true,
    light_mode: false,
    opacity: 255,
    hotkey: 'F2',
    hotkey_manual: 'Alt+Z',
    hotkey_chat: 'Alt+C',
    hotkey_strategy: 'Alt+S',
    hotkey_settings: 'Alt+,',
    hotkey_history: 'Alt+H',
    hotkey_retry: 'Alt+R',
    expert_mode: 'Standard assistant',
    audio_device_id: null,
    output_device_id: null,
    show_tooltips: true,
    hotkey_screen: 'Alt+X',
    hotkey_close: 'Alt+W'
  })

  const [apiPurpose, setApiPurpose] = useState<'实时转写' | '回答'>('实时转写')
  const [apiKeys, setApiKeys] = useState<{ groq: string; openai: string; gemini: string; anthropic: string; deepseek: string; openrouter: string }>({ groq: '', openai: '', gemini: '', anthropic: '', deepseek: '', openrouter: '' })
  const [visibleApiKeys, setVisibleApiKeys] = useState<{ groq: boolean; openai: boolean; gemini: boolean; anthropic: boolean; deepseek: boolean; openrouter: boolean }>({ groq: false, openai: false, gemini: false, anthropic: false, deepseek: false, openrouter: false })
  const apiKeyTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const [providerPriority, setProviderPriority] = useState<string[]>(['groq', 'gemini', 'openai', 'anthropic', 'deepseek', 'openrouter'])

  const hasAnyKey = Boolean(
    apiKeys.groq?.trim() ||
    apiKeys.openai?.trim() ||
    apiKeys.gemini?.trim() ||
    apiKeys.anthropic?.trim() ||
    apiKeys.deepseek?.trim() ||
    apiKeys.openrouter?.trim() ||
    settings.groq_api_key?.trim() ||
    settings.openai_api_key?.trim() ||
    settings.gemini_api_key?.trim() ||
    settings.anthropic_api_key?.trim() ||
    settings.deepseek_api_key?.trim() ||
    settings.openrouter_api_key?.trim()
  );

  const isAuthorized = true;

  useEffect(() => {
    const subs: (() => void)[] = [];
    if (!window.electron) return;

    window.electron?.ipcRenderer.invoke('get-platform').then((p: string) => setPlatform(p));

    // Request initial context count (v51.53)
    window.electron?.ipcRenderer.send('send-to-sidecar', { action: 'get-context-count' });
    setStatus("正在连接…");
    
    // Listen for sidecar ready event (v1.3.0)
    subs.push(window.electron?.ipcRenderer.on('ready-received', (p: any) => {
      console.log("UI: Sidecar Ready:", p);
      setStatus("doudou 已就绪");
      setSidecarConnected(true);
      sidecarConnectedRef.current = true;
      showToast("后台引擎已连接", 'success');
    }));

    subs.push(window.electron?.ipcRenderer.on('status-received', (s: any) => {
      console.log("UI: Status Message:", s.msg, "IsError:", s.is_error);
      if (s.msg) {
        setStatus(s.msg);
        if (s.is_error) {
          setIsError(true);
          setIsThinking(false);
        } else {
          setIsError(false);
        }
      }
    }));

    subs.push(window.electron?.ipcRenderer.on('error-received', (e: any) => {
      console.error("UI: Error Received:", e.msg);
      setIsThinking(false);
      setIsError(true);
      // Show toast for visible errors (v1.3.0)
      if (e.msg) {
        showToast(e.msg, 'error');
      }
      if (e.msg && (e.msg.includes("429") || e.msg.includes("Quota"))) {
        setStatus("额度超限，请等待 60 秒");
      } else if (e.msg && e.msg.includes("Connection Lost")) {
        setStatus("连接已断开");
        setSidecarConnected(false);
      } else {
        setStatus(e.msg ? `错误：${e.msg}` : "发生错误");
      }
    }));
    subs.push(window.electron?.ipcRenderer.on('transcript-received', (t: any) => {
      console.log("UI: Transcription Received:", t.text);
      if (t.text && t.text.trim() !== "") {
        setTranscript(t.text);
      }
    }));

    subs.push(window.electron?.ipcRenderer.on('live-transcript-received', (p: any) => {
      console.log("UI: Live Transcript Received:", p.text);
      if (p.text) {
        setLiveTranscript(prev => {
          const combined = (prev + " " + p.text).trim();
          // Keep only last 100 chars for the live bubble
          return combined.length > 100 ? "..." + combined.slice(-100) : combined;
        });

        // Auto-clear after 3 seconds of silence
        if (liveTimerRef.current) clearTimeout(liveTimerRef.current);
        liveTimerRef.current = setTimeout(() => {
          setLiveTranscript("");
        }, 3000);
      }
    }));

    subs.push(window.electron?.ipcRenderer.on('context-update-received', (p: any) => {
      console.log("UI: Context Update received:", p.count);
      setSnapshotsCount(p.count);
    }));

    subs.push(window.electron?.ipcRenderer.on('context-count-received', (p: any) => {
      console.log("UI: Context Count received from Sidecar:", p.count);
      setLinkedFilesCount(p.count);
    }));

    subs.push(window.electron?.ipcRenderer.on('resume-parsed-received', (_: any) => {
      console.log("UI: Resume Parsed (Background Sync Complete)");
      // No longer updating contextText here to keep interview notes clean
    }));

    subs.push(window.electron?.ipcRenderer.on('context-fetched-received', (p: any) => {
      console.log("UI: Context Fetched Received (Length:", p.text?.length, ")");
      setContextText(p.text);
    }));

    subs.push(window.electron?.ipcRenderer.on('ai-response-received', (p: any) => {
      console.log("UI: AI Response Received (Length:", p.text?.length, ")");
      setAiResponse(p.text);
      setIsThinking(false);

      // Update History Stack FIRST (v20.0 Persistent Buttons)
      if (p.text && p.trigger_question) {
        setHistory(prev => {
          // Prevent exact duplicate questions stacking
          if (prev.length > 0 && prev[prev.length - 1].q === p.trigger_question) return prev;
          const newHistory = [...prev, { id: Date.now(), q: p.trigger_question, a: p.text, strategy: p.strategy || "Standard" }];
          console.log("UI: History Stack Updated. Size:", newHistory.length);
          return newHistory.slice(-50); // Keep maximum 50 pills
        });
      }

      // Clear transcript LAST to ensure seamless hand-off
      setTranscript("");

      if (p.strategy) {
        setDetectedStrategy(p.strategy);
        if (p.provider) setStatus(`AI：${p.provider} 已完成`);
      }
      setDrawerMode('response');
      setDrawerOpen(true);
    }));

    subs.push(window.electron?.ipcRenderer.on('ai-chunk-received', (p: any) => {
      console.log("UI: AI Chunk Received:", p.text, "IsStart:", p.is_start);
      if (p.is_start) {
        setAiResponse(""); 
        setIsThinking(true);
      } else if (p.text) {
        setAiResponse(prev => prev + p.text);
        setIsThinking(false);
      }
      if (p.strategy) setDetectedStrategy(p.strategy);
      setDrawerOpen(true);
      setDrawerMode('response');
    }));



    // Global Debug Helper for User
    (window as any).doudouTestAI = () => {
      console.log("UI: Executing Global console test...");
      window.electron?.ipcRenderer.send('send-to-sidecar', {
        action: 'fake-transcript',
        payload: 'Global Console Test: Respond with "HELLO FROM BRAIN".'
      });
    };
    subs.push(window.electron?.ipcRenderer.on('audio-devices-data-received', (p: any) => setAudioDevices(p)));
    subs.push(window.electron?.ipcRenderer.on('output-devices-data-received', (p: any) => setOutputDevices(p)));
    subs.push(window.electron?.ipcRenderer.on('output-device-updated-received', (p: any) => {
      console.log('Output device updated:', p?.name);
    }));
    subs.push(window.electron?.ipcRenderer.on('settings-data-received', (p: any) => {
      setSettings(p);
      // Extract model selections from settings
      const models: { [key: string]: string } = {};
      for (const key of Object.keys(p)) {
        if (key.startsWith('model_')) {
          models[key.replace('model_', '')] = p[key];
        }
      }
      if (Object.keys(models).length > 0) {
        setModelSelections(prev => ({ ...prev, ...models }));
      }
      // Load provider priority from settings
      if (p.provider_priority) {
        const priority = p.provider_priority.split(',').filter((s: string) => s.trim());
        if (priority.length > 0) {
          setProviderPriority(priority);
        }
      }
      window.electron?.ipcRenderer.send('update-stealth', p.stealth_mode);
      window.electron?.ipcRenderer.send('set-opacity', p.opacity);
      window.electron?.ipcRenderer.send('re-register-hotkey', p);

      // Boot state sync for interview mode (Task 2)
      if (p.interview_mode === true) {
        setIsLive(prev => {
          if (!prev) {
            window.electron?.ipcRenderer.send('toggle-listening', true);
            setStatus("正在聆听…");
            return true;
          }
          return prev;
        });
      }

      // First-run guide auto-open (Task 4)
      if (p.show_guide_startup === true && isFirstLoadRef.current) {
        isFirstLoadRef.current = false;
        setTimeout(() => {
          setDrawerMode('guide');
          setDrawerOpen(true);
        }, 600);
      }
    }));
    subs.push(window.electron?.ipcRenderer.on('api-keys-updated-received', () => {
      showToast("API 密钥已保存", 'success');
    }));
    subs.push(window.electron?.ipcRenderer.on('api-keys-received', (p: any) => {
      // Sidecar returns masked keys (e.g. "gsk_...abcd") under *_key names.
      // Use them only for the "configured" status chip; never refill the input
      // with a masked value, or the next edit would corrupt the real key.
      const masked = {
        groq: p.groq_key || '', openai: p.openai_key || '',
        gemini: p.gemini_key || '', anthropic: p.anthropic_key || '',
        deepseek: p.deepseek_key || '', openrouter: p.openrouter_key || ''
      };
      setSettings((prev: any) => ({
        ...prev,
        groq_api_key: masked.groq, openai_api_key: masked.openai,
        gemini_api_key: masked.gemini, anthropic_api_key: masked.anthropic,
        deepseek_api_key: masked.deepseek, openrouter_api_key: masked.openrouter
      }));
      if (Object.values(masked).every(v => !v)) {
        setApiKeys({ groq: '', openai: '', gemini: '', anthropic: '', deepseek: '', openrouter: '' });
      }
    }));
    // Listen for API keys response from backend
    subs.push(window.electron?.ipcRenderer.on('api-keys', (p: any) => {
      setApiKeys({
        groq: p.groq_key || '',
        openai: p.openai_key || '',
        gemini: p.gemini_key || '',
        anthropic: p.anthropic_key || '',
        deepseek: p.deepseek_key || '',
        openrouter: p.openrouter_key || ''
      });
    }));
    subs.push(window.electron?.ipcRenderer.on('available-models-received', (p: any) => {
      console.log('Received available-models-received:', p); // Debug log
      console.log('availableModels state before update:', availableModels); // Debug log
      if (p.models) {
        setAvailableModels(p.models);
        console.log('Set availableModels:', p.models); // Debug log
      }
      if (p.defaults) {
        setModelDefaults(p.defaults);
        console.log('Set modelDefaults:', p.defaults); // Debug log
        // Also initialize modelSelections from defaults if not already set
        setModelSelections(prev => {
          const next = { ...prev };
          for (const [prov, model] of Object.entries(p.defaults) as [string, string][]) {
            if (!next[prov]) next[prov] = model;
          }
          console.log('Updated modelSelections:', next); // Debug log
          return next;
        });
      }
    }));
    subs.push(window.electron?.ipcRenderer.on('hotkey-triggered', () => {
      console.log("UI: [IPC] hotkey-triggered received");
      setIsLive(prev => {
        const ns = !prev;
        window.electron?.ipcRenderer.send('toggle-listening', ns);
        // Visual feedback on status
        setStatus(ns ? "正在聆听…" : "待机中");
        return ns;
      });
    }));

    subs.push(window.electron?.ipcRenderer.on('registration-report', (reports: any[]) => {
      console.log("UI: [DIAGNOSTIC] Hotkey Registration Report:", reports);
      const failed = reports.filter(r => !r.success);
      if (failed.length > 0) {
        console.error("UI: Failed hotkeys:", failed);
        setStatus(`快捷键注册失败：${failed[0].key}`);
        setIsError(true);
      } else {
        console.log("UI: All hotkeys registered successfully");
        setStatus("快捷键已同步");
        setIsError(false);
      }
    }));

    window.electron?.ipcRenderer.send('send-to-sidecar', { action: 'get-settings' });
    window.electron?.ipcRenderer.send('send-to-sidecar', { action: 'get-audio-devices' });
    window.electron?.ipcRenderer.send('send-to-sidecar', { action: 'get-output-devices' });
    window.electron?.ipcRenderer.send('send-to-sidecar', { action: 'get-api-keys' });
    window.electron?.ipcRenderer.send('send-to-sidecar', { action: 'get-available-models' });
    console.log('UI: Sent get-available-models request to sidecar'); // Debug log

    // Auto-update audio devices whenever OS recognizes hardware device changes (v51.92)
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      const handleDeviceChange = () => {
        console.log("UI: OS audio device configuration changed, refreshing sidecar list...");
        window.electron?.ipcRenderer.send('send-to-sidecar', { action: 'get-audio-devices' });
        window.electron?.ipcRenderer.send('send-to-sidecar', { action: 'get-output-devices' });
      };
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
      subs.push(() => {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      });
    }

    // Set initial ignore state: Pass transparency but keep tracking
    window.electron?.ipcRenderer.send('set-ignore-mouse-events', true, { forward: true });

    // Sidecar health check — poll every 5 seconds (v1.3.0)
    let healthCheckCount = 0;
    const checkHealth = async () => {
      let cancelled = false;
      try {
        const health = await window.electron?.ipcRenderer.invoke('check-sidecar-health');
        if (cancelled) return;
        if (health && !health.alive) {
          setSidecarConnected(false);
          sidecarConnectedRef.current = false;
        } else if (health && health.alive) {
          if (!sidecarConnectedRef.current) {
            showToast("后台引擎已重新连接", 'success');
          }
          setSidecarConnected(true);
          sidecarConnectedRef.current = true;
        }
        healthCheckCount = 0;
      } catch (e) {
        healthCheckCount++;
        if (healthCheckCount >= 3) {
          setSidecarConnected(false);
          sidecarConnectedRef.current = false;
        }
      }
    };
    healthCheckRef.current = setInterval(checkHealth, 5000);
    checkHealth(); // initial check
    // Also check on any status or error received
    subs.push(() => {
      if (healthCheckRef.current) clearInterval(healthCheckRef.current);
    });

    subs.push(window.electron?.ipcRenderer.on('toggle-stealth', (enabled: boolean) => {
      setSettings((prev: any) => ({ ...prev, stealth_mode: enabled }));
    }));

    // Audio volume VU meter listener
    subs.push(window.electron?.ipcRenderer.on('volume-received', (data: any) => {
      setVolume(typeof data?.level === 'number' ? data.level : 0);
    }));

    // Meeting Notes IPC listeners
    const handleSessionStatus = (s: any) => {
      console.log("UI: Session status:", s);
      setSessionStatus(s);
    };
    subs.push(window.electron?.ipcRenderer.on('session-status-received', handleSessionStatus));
    subs.push(window.electron?.ipcRenderer.on('session-status', handleSessionStatus));

    const handleSavedNotes = (notes: any[]) => {
      console.log("UI: Saved notes:", notes?.length || 0);
      setSavedNotes(notes || []);
    };
    subs.push(window.electron?.ipcRenderer.on('saved-notes-received', handleSavedNotes));
    subs.push(window.electron?.ipcRenderer.on('saved-notes', handleSavedNotes));

    const handleNotesReady = (result: any) => {
      console.log("UI: Meeting notes ready:", result);
      if (result?.path) {
        setStatus(`记录已保存：${result.path.split(/[/\\]/).pop()}`);
      }
      window.electron?.ipcRenderer.send('send-to-sidecar', { action: 'get-saved-notes' });
    };
    subs.push(window.electron?.ipcRenderer.on('notes-ready-received', handleNotesReady));
    subs.push(window.electron?.ipcRenderer.on('notes-ready', handleNotesReady));

    subs.push(window.electron?.ipcRenderer.on('hotkey-action', (action: string) => {
      console.log(`UI: [IPC] hotkey-action received: ${action}`);
      switch (action) {
        case 'trigger-manual':
          toggleDrawer('response'); // Open to show response
          window.electron?.ipcRenderer.send('send-to-sidecar', { action: 'trigger-ai' });
          setStatus("正在手动生成回答…");
          break;
        case 'toggle-chat':
          toggleDrawer('chat');
          break;
        case 'toggle-strategy':
          toggleDrawer('strategy');
          break;
        case 'toggle-settings':
          toggleDrawer('settings');
          break;
        case 'toggle-history':
          toggleDrawer('history');
          break;
        case 'trigger-retry':
          window.electron?.ipcRenderer.send('send-to-sidecar', { action: 'trigger-ai' });
          setStatus("正在重新生成…");
          toggleDrawer('response');
          break;
        case 'trigger-scan':
          handleScreenAnalysis();
          break;
        case 'trigger-close-drawer':
          setDrawerOpen(false);
          break;
      }
    }));

    // Local Escape listener for drawers
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false);
      }
      // Ctrl+C: copy last response when drawer is open
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && drawerOpen && aiResponse) {
        navigator.clipboard.writeText(aiResponse).catch(() => {});
      }
      if (e.altKey && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
        handleScreenAnalysis();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      subs.forEach(s => s()); // Cleanup all IPC listeners v1.1.14
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.altKey) {
        e.preventDefault();
        setSettings((prev: any) => {
          const step = 15;
          let newOpacity = (prev.opacity || 255) - Math.sign(e.deltaY) * step;
          newOpacity = Math.max(25, Math.min(255, newOpacity));
          window.electron?.ipcRenderer.send('set-opacity', newOpacity);
          window.electron?.ipcRenderer.send('send-to-sidecar', {
            action: 'update-setting',
            payload: { key: 'opacity', val: newOpacity }
          });
          return { ...prev, opacity: newOpacity };
        });
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const updateSetting = (key: string, val: any) => {
    setSettings((prev: any) => {
      const next = { ...prev, [key]: val };
      window.electron?.ipcRenderer.send('send-to-sidecar', { action: 'update-setting', payload: { key, val } });
      if (key === 'stealth_mode') window.electron?.ipcRenderer.send('update-stealth', val);
      if (key === 'opacity') window.electron?.ipcRenderer.send('set-opacity', val);
      if (key.startsWith('hotkey')) {
        console.log(`UI: Re-registering hotkeys with updated ${key}=${val}`);
        window.electron?.ipcRenderer.send('re-register-hotkey', next);
      }
      return next;
    });
  };

  const toggleProviderPriority = (provider: string) => {
    setProviderPriority(prev => {
      const currentIndex = prev.indexOf(provider);
      let newPriority: string[];
      if (currentIndex === 0) {
        // Already at top, move to bottom
        newPriority = [...prev.slice(1), provider];
      } else {
        // Move to top
        newPriority = [provider, ...prev.filter(p => p !== provider)];
      }
      // Save to backend
      window.electron?.ipcRenderer.send('send-to-sidecar', {
        action: 'update-setting',
        payload: { key: 'provider_priority', val: newPriority.join(',') }
      });
      return newPriority;
    });
  };
  const toggleDrawer = (mode: DrawerMode) => {
    if (drawerOpen && drawerMode === mode) {
      setDrawerOpen(false);
    } else {
      setDrawerMode(mode);
      setDrawerOpen(true);
    }
  };

  const handleManualTrigger = () => {
    if (!isAuthorized || !isLive || !transcript.trim()) return;
    window.electron?.ipcRenderer.send('send-to-sidecar', { action: 'trigger-ai' });
    setStatus("正在手动生成回答…");
  };

  const handleScreenAnalysis = () => {
    if (!isAuthorized) {
      toggleDrawer('account');
      return;
    }
    // Open response drawer to show vision results
    setDrawerMode('response');
    setDrawerOpen(true);
    setIsThinking(true);
    setAiResponse('');
    window.electron?.ipcRenderer.send('send-to-sidecar', {
      action: 'analyze-screen',
      payload: { question: "扫描提供的屏幕截图，识别其中的编程或技术问题。请用中文提供完整的实现方案、详细的解释和复杂度分析。" }
    });
    setStatus("正在分析屏幕…");
  };


  const handleClearSnapshots = () => {
    window.electron?.ipcRenderer.send('send-to-sidecar', { action: 'clear-snapshots' });
    setStatus("屏幕截图已清空");
  };

  const handleMicClick = () => {
    const ns = !isLive;
    setIsLive(ns);
    window.electron?.ipcRenderer.send('toggle-listening', ns);
  };

  const toggleInterviewMode = () => {
    const nextState = !settings.interview_mode;
    const newSettings = { ...settings, interview_mode: nextState };
    setSettings(newSettings);
    window.electron?.ipcRenderer.send('send-to-sidecar', {
      action: 'update-setting',
      payload: { key: 'interview_mode', val: nextState }
    });
    if (nextState) {
      if (!isLive) {
        setIsLive(true);
        window.electron?.ipcRenderer.send('toggle-listening', true);
      }
      setDrawerOpen(true);
      setDrawerMode('response');
      showToast("面试模式已开启（系统音频录制 + STAR 回答）", 'success');
      setStatus("面试模式已开启");
    } else {
      showToast("面试模式已关闭", 'info');
      setStatus("doudou 已就绪");
    }
  };

  const handlePracticeQuestion = (q: any) => {
    setAiResponse('');
    setDrawerMode('response');
    setDrawerOpen(true);
    setStatus(`练习：${q.topic}`);
    setIsThinking(true);
    window.electron?.ipcRenderer.send('send-to-sidecar', {
      action: 'fake-transcript',
      payload: q.question
    });
    window.electron?.ipcRenderer.send('send-to-sidecar', { action: 'trigger-ai' });
    showToast(`已加载「${q.topic}」练习题`, 'success');
  };

  const handleLockedClick = (mode: DrawerMode) => {
    toggleDrawer(mode);
  };

  useEffect(() => {
    window.electron?.ipcRenderer.send('set-drawer-status', drawerOpen);
    // Explicitly report resize when drawer toggles — ensures the Electron
    // window resizes reliably even before the ResizeObserver fires the first time.
    requestAnimationFrame(() => {
      if (containerRef.current) {
        const h = Math.ceil(containerRef.current.getBoundingClientRect().height) + 120;
        window.electron?.ipcRenderer.send('resize-window', { height: h });
      }
    });
  }, [drawerOpen]);

  useEffect(() => {
    const isActive = !!(transcript || liveTranscript || history.length > 0);
    window.electron?.ipcRenderer.send('set-subpill-status', isActive);
  }, [transcript, liveTranscript, history]);

  // Dynamic Resizing Logic (v1.2.0)
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        // We add much larger buffer room (120px) for tooltips and safety (v1.2.7)
        const height = Math.ceil(entry.contentRect.height) + 120;
        window.electron?.ipcRenderer.send('resize-window', { height });
        window.electron?.ipcRenderer.send('sync-hit-zones', { height: entry.contentRect.height });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [drawerOpen]);

  return (
    <div 
      ref={containerRef}
      className={`app-container platform-${platform === 'darwin' ? 'mac' : 'win'} ${settings.light_mode ? 'light-mode' : ''} ${settings.stealth_mode ? 'stealth-active' : ''}`}
    >

      <button
        className="ui-scale-handle no-drag"
        aria-label="拖动调整界面和字体大小，双击恢复默认"
        title="左右拖动缩放界面和字体 · 双击恢复默认"
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            window.electron?.ipcRenderer.send('resize-ui', event.key === 'ArrowLeft' ? 'smaller' : 'larger');
          }
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          window.electron?.ipcRenderer.send('resize-ui', 'start');
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            window.electron?.ipcRenderer.send('resize-ui', 'move');
          }
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          window.electron?.ipcRenderer.send('resize-ui', 'end');
        }}
        onLostPointerCapture={() => window.electron?.ipcRenderer.send('resize-ui', 'end')}
        onPointerCancel={() => window.electron?.ipcRenderer.send('resize-ui', 'end')}
        onDoubleClick={() => window.electron?.ipcRenderer.send('resize-ui', 'reset')}
      >↔</button>
      {/* Sidecar disconnect banner (v1.3.0) */}
      <AnimatePresence>
        {!sidecarConnected && (
          <motion.div
            className="disconnect-banner"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="disconnect-banner-dot" />
            <span>后台连接已断开，请重启 doudou 或检查后台引擎</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast notification container (v1.3.0) */}
      <div className="toast-container">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              className={`toast-item toast-${t.type}`}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className={`toast-icon ${t.type}`}>
                {t.type === 'error' ? '!' : t.type === 'success' ? '✓' : 'i'}
              </div>
              {t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Main Pill — always centered */}
      <motion.div
        layout
        className={`floating-pill pill-active ${drawerOpen ? 'pill-compact' : ''}`}
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={springGentle}
      >
        <div className="pill-content">
          <div className="pill-left">
            <div className={`status-indicator ${isError ? 'error' : (isLive ? 'pulse' : '')}`} />
            {isLive && !settings.stealth_mode && (
              <>
                <span className="recording-dot" />
                <div className="vu-meter" title={`音量：${volume}%`}>
                  <span className={`vu-bar ${volume > 5 ? 'active' : ''}`} />
                  <span className={`vu-bar ${volume > 25 ? 'active' : ''}`} />
                  <span className={`vu-bar ${volume > 50 ? 'active' : ''}`} />
                  <span className={`vu-bar ${volume > 75 ? 'active' : ''}`} />
                </div>
              </>
            )}
            <div className="brand-title">
              <span className="brand-name">doudou</span>
              <span className={`brand-status ${isError ? 'error-text' : (isLive && !settings.stealth_mode ? 'status-live' : '')}`}>// {status}</span>
            </div>
          </div>

          <div className="pill-right">

            {/* One-Click Interview Mode Toggle */}
            <Tooltip disabled={!settings.show_tooltips} label="面试模式" description={settings.interview_mode ? "面试模式已开启：聆听系统音频并使用 STAR 回答结构。点击关闭。" : "一键开启面试模式：聆听系统音频并使用 STAR 回答结构。"} position="bottom" delay={0.2}>
              <button
                className={`icon-circle no-drag ${settings.interview_mode ? 'btn-accent glow-subtle' : ''}`}
                onClick={toggleInterviewMode}
              >
                <Zap size={18} />
              </button>
            </Tooltip>

            {/* Indian Placement Question Bank */}
            <Tooltip disabled={!settings.show_tooltips} label="面试题库" description="52 道印度校招与技术面试练习题，涵盖 TCS、Infosys、SDE1 和 STAR。" position="bottom" delay={0.2}>
              <button
                className={`icon-circle no-drag ${drawerMode === 'practice' && drawerOpen ? 'btn-accent' : ''}`}
                onClick={() => toggleDrawer('practice')}
              >
                <BookOpen size={18} />
              </button>
            </Tooltip>

            {/* Direct Chat */}
              <button
                className={`icon-circle no-drag ${drawerMode === 'chat' && drawerOpen ? 'btn-accent' : ''}`}
                onClick={() => handleLockedClick('chat')}
              >
                <MessageSquare size={18} />
              </button>

            <div className="pill-divider" />

            {/* Zone 2: Live Action (Primary Execution) */}
            <div className="snapshot-group no-drag">
              <Tooltip 
                disabled={!settings.show_tooltips} 
                label={snapshotsCount > 0 ? `智能分析（${snapshotsCount}）` : "屏幕分析"} 
                description={snapshotsCount > 0 ? "结合多次截图分析屏幕内容，点击继续完善。" : "截取并分析当前屏幕内容。"} 
                position="bottom" 
                delay={0.2} 
                shortcut={settings.hotkey_screen}
              >
                <button
                  className={`icon-circle ${snapshotsCount > 0 ? 'btn-accent' : ''}`}
                  onClick={handleScreenAnalysis}
                >
                  <div style={{ position: 'relative' }}>
                    <Monitor size={18} />
                    {snapshotsCount > 0 && <div className="snapshot-badge">{snapshotsCount}</div>}
                  </div>
                </button>
              </Tooltip>

              {snapshotsCount > 0 && (
                <Tooltip disabled={!settings.show_tooltips} label="重置" description="清空累计截图，重新开始分析。" position="bottom" delay={0.2}>
                  <button className="icon-circle btn-clear" onClick={handleClearSnapshots}>
                    <X size={14} />
                  </button>
                </Tooltip>
              )}
            </div>

            <Tooltip disabled={!settings.show_tooltips} label={isLive ? "暂停" : "开始"} description={isLive ? "停止聆听并暂停 doudou。" : "启动 doudou，开始聆听和分析。"} position="bottom" delay={0.2} shortcut={settings.hotkey}>
              <button
                className={`icon-circle no-drag btn-master ${!isLive ? 'pulse-ready' : ''} ${isLive ? 'btn-accent' : ''}`}
                onClick={handleMicClick}
              >
                {isLive ? (
                  <Pause size={18} fill="currentColor" />
                ) : (
                  <Play size={18} fill="currentColor" />
                )}
              </button>
            </Tooltip>

            <Tooltip disabled={!settings.show_tooltips} label="立即回答" description="立即根据当前上下文生成回答。" position="bottom" delay={0.2} shortcut={settings.hotkey_manual}>
              <button
                className="icon-circle no-drag answer-icon-btn"
                onClick={handleManualTrigger}
              >
                <Zap size={18} fill="currentColor" />
              </button>
            </Tooltip>

            <div className="pill-divider" />

            {/* Zone 3: App & System (Meta) */}
            <Tooltip disabled={!settings.show_tooltips} label="设置" description="配置屏幕保护、快捷键和显示偏好。" position="bottom" delay={0.2} shortcut={settings.hotkey_settings}>
              <button
                className={`icon-circle no-drag ${drawerMode === 'settings' && drawerOpen ? 'btn-accent' : ''}`}
                onClick={() => toggleDrawer('settings')}
              >
                <Settings size={18} />
              </button>
            </Tooltip>

            <Tooltip disabled={!settings.show_tooltips} label="隐藏" description="将 doudou 最小化到系统托盘，继续在后台运行。" position="bottom" delay={0.6}>
              <button className="icon-circle no-drag" onClick={() => window.electron?.ipcRenderer.send('minimize-window')}>
                <Minimize2 size={18} />
              </button>
            </Tooltip>
          </div>
        </div>
      </motion.div>

      {/* Multi-Pill Breadcrumbs (v19.0) */}
      <AnimatePresence>
        {(transcript || history.length > 0) && (
          <motion.div
            key="pill-stack-root"
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="sub-pill-stack"
            style={{ zIndex: 10 }}
          >
            {liveTranscript && (
              <motion.div
                key="live-transcript"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="sub-pill-item live-transcript-pill no-drag"
              >
                <div className="live-transcript-dot" />
                <span className="sub-pill-label">正在聆听</span>
                <span className="sub-pill-text">{liveTranscript}</span>
              </motion.div>
            )}
            {history.slice(-1).map((item) => {
              // Extract core question for display (concise v20.9)
              const extractCoreQuestion = (text: string) => {
                if (!text) return "";
                // Filter out common filler words and keep only the core command/question
                let clean = text.replace(/NEW\s+/i, '').replace(/[?*]/g, '').trim();

                // For the button, show up to 5 words for better context v26.2
                const words = clean.split(/\s+/);
                if (words.length <= 5) return clean;
                return words.slice(0, 5).join(' ') + '...';
              };

              return (
                <motion.div
                    layout="position"
                    key={`hist-${item.id}`}
                  className="sub-pill-item breadcrumb no-drag"
                  style={{ cursor: 'default' }}
                  variants={pillVariants}
                  onClick={() => {
                    console.log("UI: History Pill Clicked. Opening Drawer.");
                    if (!isAuthorized) {
                      toggleDrawer('account');
                      return;
                    }
                    setAiResponse(item.a);
                    setDetectedStrategy(item.strategy);
                    setDrawerMode('response');
                    setDrawerOpen(true);
                  }}
                >
                  <div className="sub-pill-text">{extractCoreQuestion(item.q)}</div>
                </motion.div>
              );
            })}

            {transcript && (
              <motion.div
                layout
                key="active-transcript-pill"
                className="sub-pill-item active-transcript no-drag"
                style={{ cursor: 'default' }}
                variants={pillVariants}
                whileHover={{ scale: 1.02, backgroundColor: 'rgba(60, 60, 60, 0.5)', borderColor: 'var(--accent-primary)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  console.log("UI: Active Pill Clicked. Opening Drawer.");
                  if (!isAuthorized) {
                    toggleDrawer('account');
                    return;
                  }
                  setDrawerMode('response');
                  setDrawerOpen(true);
                }}
              >
                <div className="sub-pill-text">{transcript}</div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            key="drawer-panel-root"
            layout="position" /* 'position' only — prevents height animation jank during streaming */
            className="drawer-container"
            initial={{ y: -20, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0, scale: 0.98 }}
            transition={springGentle}
          >
            <Tooltip disabled={!settings.show_tooltips} label="收起面板" shortcut={settings.hotkey_close} position="bottom">
              <button
                className="drawer-close-btn no-drag"
                onClick={() => setDrawerOpen(false)}
              >
                <ChevronUp size={20} />
              </button>
            </Tooltip>

            {/* Secondary views live here when the drawer is open (pill stays decluttered) */}
            <div className="drawer-nav no-drag">
              <Tooltip disabled={!settings.show_tooltips} label="关于" description="doudou AI 面试助手开源版，无需注册应用账户。" position="bottom" delay={0.6}>
                <button className={`drawer-nav-btn ${drawerMode === 'account' ? 'active' : ''}`} onClick={() => toggleDrawer('account')}>
                  <User size={15} />
                </button>
              </Tooltip>
              <Tooltip disabled={!settings.show_tooltips} label="回答" position="bottom" delay={0.3}>
                <button className={`drawer-nav-btn ${drawerMode === 'response' ? 'active' : ''}`} onClick={() => toggleDrawer('response')}>
                  <Sparkles size={15} />
                </button>
              </Tooltip>
              <Tooltip disabled={!settings.show_tooltips} label="回答策略" description="调整回答风格、上传简历或补充岗位背景。" position="bottom" delay={0.3} shortcut={settings.hotkey_strategy}>
                <button className={`drawer-nav-btn ${drawerMode === 'strategy' ? 'active' : ''}`} onClick={() => handleLockedClick('strategy')}>
                  <Terminal size={15} />
                </button>
              </Tooltip>
              <Tooltip disabled={!settings.show_tooltips} label="历史记录" description="查看之前的问题和回答。" position="bottom" delay={0.3} shortcut={settings.hotkey_history}>
                <button className={`drawer-nav-btn ${drawerMode === 'history' ? 'active' : ''}`} onClick={() => handleLockedClick('history')}>
                  <History size={15} />
                </button>
              </Tooltip>
              <Tooltip disabled={!settings.show_tooltips} label="会议记录" description="查看转写内容、保存会话并生成 AI 会议摘要。" position="bottom" delay={0.3}>
                <button className={`drawer-nav-btn ${drawerMode === 'notes' ? 'active' : ''}`} onClick={() => {
                  window.electron?.ipcRenderer.send('send-to-sidecar', { action: 'get-session-status' });
                  window.electron?.ipcRenderer.send('send-to-sidecar', { action: 'get-saved-notes' });
                  toggleDrawer('notes');
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <line x1="10" y1="9" x2="8" y2="9"/>
                  </svg>
                </button>
              </Tooltip>
              <Tooltip disabled={!settings.show_tooltips} label="使用指南" description="了解如何使用 doudou。" position="bottom" delay={0.3}>
                <button className={`drawer-nav-btn ${drawerMode === 'guide' ? 'active' : ''}`} onClick={() => toggleDrawer('guide')}>
                  <BookOpen size={15} />
                </button>
              </Tooltip>
            </div>
            <AnimatePresence mode="wait">
              {/* Account / Diagnostics Splash */}
              {drawerMode === 'account' && (
                <motion.div
                  key="account-view"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="view-content"
                >
                  <div className="view-header">
                    <h2><span className="header-slash">//</span> 系统状态与关于</h2>
                  </div>

                  {/* Startup Status Diagnostic Splash */}
                  <div className="diagnostic-splash">
                    <div className="diagnostic-item">
                      <span className="diagnostic-label">AI 引擎</span>
                      <span className="diagnostic-value">支持 6 家服务商，失败时自动切换</span>
                    </div>
                    <div className="diagnostic-item">
                      <span className="diagnostic-label">音频状态</span>
                      <span className="diagnostic-value">{isLive ? "正在录制" : "系统音频待机"}</span>
                    </div>
                    <div className="diagnostic-item">
                      <span className="diagnostic-label">面试题库</span>
                      <span className="diagnostic-value">{questionBank.length} 道校招题</span>
                    </div>
                  </div>

                  <div className="auth-panel" style={{ padding: '20px', textAlign: 'center' }}>
                    <p style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>
                      doudou AI 面试助手 · 开源版
                    </p>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      v1.3.0 开源版 · MIT 许可证
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-dim)', lineHeight: 1.5, marginBottom: '16px' }}>
                      使用你自己的 API 密钥连接 AI 服务，本地管理设置与面试记录。
                    </p>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button 
                        className="btn-premium btn-accent" 
                        onClick={() => toggleDrawer('practice')}
                      >
                        打开题库（{questionBank.length}）
                      </button>
                      <button 
                        className="btn-premium" 
                        onClick={() => toggleDrawer('settings')}
                      >
                        配置 API 密钥
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Practice Kit / Question Bank Drawer */}
              {drawerMode === 'practice' && (
                <motion.div
                  key="practice-view"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="view-content"
                  style={{ maxHeight: '600px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                >
                  <div className="view-header">
                    <h2><span className="header-slash">//</span> 印度校招与技术面试题库</h2>
                    <span className="practice-badge">{questionBank.length} 道精选题</span>
                  </div>

                  <div className="practice-container">
                    <input
                      type="text"
                      className="practice-search-input no-drag"
                      placeholder="按主题、公司（TCS、Infosys、Flipkart）或知识点搜索…"
                      value={practiceSearch}
                      onChange={(e) => setPracticeSearch(e.target.value)}
                    />

                    <div className="practice-categories no-drag">
                      {['All', 'Core CS & OOPS', 'DSA & Algorithms', 'System Design', 'Behavioral (STAR)'].map((cat) => (
                        <button
                          key={zhLabel(cat)}
                          className={`practice-cat-btn ${practiceCategory === cat ? 'active' : ''}`}
                          onClick={() => setPracticeCategory(cat)}
                        >
                          {zhLabel(cat)}
                        </button>
                      ))}
                    </div>

                    <div className="practice-list">
                      {questionBank
                        .filter((q: any) => {
                          const matchesCat = practiceCategory === 'All' || q.category === practiceCategory;
                          const matchesSearch = !practiceSearch || 
                            q.question.toLowerCase().includes(practiceSearch.toLowerCase()) || 
                            q.topic.toLowerCase().includes(practiceSearch.toLowerCase()) ||
                            q.company.toLowerCase().includes(practiceSearch.toLowerCase());
                          return matchesCat && matchesSearch;
                        })
                        .map((q: any) => (
                          <div key={q.id} className="practice-card no-drag">
                            <div className="practice-card-header">
                              <span className="practice-badge">{q.company}</span>
                              <span className="practice-topic-badge">{q.topic}</span>
                            </div>
                            <p className="practice-question-text">{q.question}</p>
                            {q.hint && (
                              <div className="practice-hint-text">
                                <strong>答题要点：</strong> {q.hint}
                              </div>
                            )}
                            <div className="practice-action-row">
                              <button
                                className="practice-trigger-btn"
                                onClick={() => handlePracticeQuestion(q)}
                              >
                                <Zap size={14} /> 生成回答（STAR）
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Strategy — gated */}
              {drawerMode === 'strategy' && (
                <motion.div
                  key="strategy-view"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="view-content"
                  style={{ maxHeight: '600px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                >
                  <div className="view-header">
                    <h2><span className="header-slash">//</span> 回答策略</h2>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Tooltip disabled={!settings.show_tooltips} label="上传简历" description="解析 PDF 或 Word 简历，让 AI 了解你的专业背景。" position="bottom" delay={0.3}>
                        <button className="btn-strategy-action" onClick={async () => {
                          const results = await window.electron?.ipcRenderer.invoke('open-file-dialog');
                          if (results && Array.isArray(results)) {
                            results.forEach(res => {
                              window.electron?.ipcRenderer.send('send-to-sidecar', { action: 'parse-file', payload: res.path });
                            });
                          }
                        }}>
                          <Upload size={14} /> <span>简历 {linkedFilesCount > 0 ? `(${linkedFilesCount})` : ""}</span>
                        </button>
                      </Tooltip>
                      <Tooltip disabled={!settings.show_tooltips} label="读取网页" description="提供岗位描述或公司网页地址供 doudou 分析。" position="bottom" delay={0.3}>
                        <button className="btn-strategy-action" onClick={() => {
                          console.log("UI: Strategy URL Button clicked");
                          const url = prompt("请输入网页地址：");
                          console.log("UI: Prompt URL received:", url);
                          if (url) {
                            window.electron?.ipcRenderer.send('send-to-sidecar', { action: 'fetch-context', payload: url });
                          }
                        }}>
                          <Globe size={14} /> <span>网页地址</span>
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '0 8px' }}>
                    <div>
                      <span className="card-label">回答风格</span>
                      <SegmentedControl
                        options={['Auto', 'Standard', 'Coding', 'Systems', 'Behavioral']}
                        value={
                          settings.expert_mode === 'Auto' ? 'Auto' :
                            settings.expert_mode === 'Standard assistant' ? 'Standard' :
                              settings.expert_mode === 'Coding interview' ? 'Coding' :
                                settings.expert_mode === 'System design' ? 'Systems' : 'Behavioral'
                        }
                        onChange={(v) => {
                          const mapping: Record<string, string> = {
                            'Auto': 'Auto',
                            'Standard': 'Standard assistant',
                            'Coding': 'Coding interview',
                            'Systems': 'System design',
                            'Behavioral': 'Behavioral (Soft skills)'
                          };
                          updateSetting('expert_mode', mapping[v]);
                          if (v !== 'Auto') setDetectedStrategy(null);
                        }}
                      />
                      {settings.expert_mode === 'Auto' && detectedStrategy && (
                        <div className="auto-strategy-badge">
                          <span className="auto-strategy-dot" />
                          自动选择： <strong>{zhLabel(detectedStrategy)}</strong>
                        </div>
                      )}
                    </div>
                    <textarea
                      className="context-textarea no-drag"
                      placeholder="在这里粘贴岗位描述、公司信息或面试笔记，doudou 将优先参考这些内容回答。"
                      value={contextText}
                      onChange={(e) => setContextText(e.target.value)}
                    />
                    <Tooltip disabled={!settings.show_tooltips} label="同步背景资料" description="将粘贴的文字或上传的文件用于当前 AI 会话。" position="bottom" delay={0.1}>
                      <button className="btn-strategy-sync no-drag" onClick={() => {
                        window.electron?.ipcRenderer.send('send-to-sidecar', { action: 'update-context', payload: contextText });
                        setDrawerOpen(false); // Fix: Dismiss drawer on manual sync v30.5
                      }}>
                        同步面试背景资料
                      </button>
                    </Tooltip>
                  </div>
                </motion.div>
              )}

              {/* Settings */}
              {drawerMode === 'history' && (
                <motion.div
                  key="history-view"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="view-content"
                  style={{ maxHeight: '500px', display: 'flex', flexDirection: 'column' }}
                >
                  <div className="view-header">
                    <h2><span className="header-slash">//</span> 历史记录</h2>
                  </div>
                  <div style={{ padding: '0 8px', flex: 1, overflowY: 'auto' }}>
                    {history.length === 0 ? (
                      <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0', fontSize: '13px' }}>
                        暂无对话记录，问题和回答将显示在这里。
                      </div>
                    ) : (
                      [...history].reverse().map((item) => (
                        <div
                          key={item.id}
                          className="sub-pill-item breadcrumb no-drag"
                          style={{ cursor: 'pointer', marginBottom: '8px', padding: '12px' }}
                          onClick={() => {
                            setAiResponse(item.a);
                            setDetectedStrategy(item.strategy);
                            setDrawerMode('response');
                          }}
                        >
                          <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--accent-primary)' }}>
                            问题： {item.q.length > 80 ? item.q.slice(0, 80) + '...' : item.q}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', opacity: 0.8 }}>
                            {item.a.length > 120 ? item.a.slice(0, 120) + '...' : item.a}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', opacity: 0.5, marginTop: '4px' }}>
                            {zhLabel(item.strategy)} · {new Date(item.id).toLocaleTimeString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}

              {/* Meeting Notes */}
              {drawerMode === 'notes' && (
                <motion.div
                  key="notes-view"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="view-content"
                  style={{ maxHeight: '500px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                >
                  <div className="view-header">
                    <h2><span className="header-slash">//</span> 会议记录</h2>
                  </div>

                  <div className="scroll-y" style={{ flex: 1, padding: '0 8px' }}>
                    {/* Session status bar */}
                    <div className="setting-card" style={{ marginBottom: '12px', padding: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>当前会话</span>
                        <span style={{ fontSize: '12px', color: sessionStatus.is_active ? 'var(--accent-primary)' : 'var(--text-dim)' }}>
                          {sessionStatus.is_active ? "进行中" : "未开始"}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                        <span><strong>{sessionStatus.entries}</strong> 段发言</span>
                        <span><strong>{sessionStatus.questions}</strong> 个问题</span>
                        <span><strong>{Math.floor(sessionStatus.duration_seconds / 60)} 分 {sessionStatus.duration_seconds % 60} 秒</strong></span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                      <button className="btn-strategy-action" style={{ flex: 1, justifyContent: 'center' }}
                        onClick={() => window.electron?.ipcRenderer.send('send-to-sidecar', { action: 'start-session', payload: "实时会话" })}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '4px' }}><circle cx="12" cy="12" r="8"/></svg> 开始
                      </button>
                      <button className="btn-strategy-action" style={{ flex: 1, justifyContent: 'center' }}
                        onClick={() => window.electron?.ipcRenderer.send('send-to-sidecar', { action: 'save-session' })}
                        disabled={!sessionStatus.entries}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> 保存
                      </button>
                      <button className="btn-strategy-action" style={{ flex: 1, justifyContent: 'center' }}
                        onClick={() => {
                          const title = prompt("会话标题：", "面试");
                          window.electron?.ipcRenderer.send('send-to-sidecar', { action: 'generate-meeting-notes', payload: title || "会话" });
                        }}
                        disabled={!sessionStatus.entries}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> 生成记录
                      </button>
                    </div>

                    {/* Utility buttons */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                      <button className="btn-strategy-action" style={{ flex: 1, justifyContent: 'center', opacity: 0.6 }}
                        onClick={() => { if (confirm("确定清空当前转写内容吗？")) window.electron?.ipcRenderer.send('send-to-sidecar', { action: 'clear-transcript' }); }}
                        disabled={!sessionStatus.entries}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> 清空
                      </button>
                      <button className="btn-strategy-action" style={{ flex: 1, justifyContent: 'center' }}
                        onClick={() => window.electron?.ipcRenderer.send('send-to-sidecar', { action: 'get-saved-notes' })}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> 刷新
                      </button>
                    </div>

                    {/* Saved notes list */}
                    <div className="settings-section">
                      <h3>已保存的记录</h3>
                      <div className="setting-card">
                        {savedNotes.length === 0 ? (
                          <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-dim)' }}>
                            暂无记录，请先开始会话并保存。
                          </div>
                        ) : (
                          savedNotes.slice(0, 10).map((note: any, idx: number) => (
                            <div key={idx} className="setting-row"
                              style={{ cursor: 'pointer', borderBottom: idx < savedNotes.length - 1 ? '1px solid var(--border-color)' : 'none' }}
                              onClick={() => setStatus(`记录：${note.filename}`)}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                                <span style={{ fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {note.filename}
                                </span>
                                <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                                  {new Date(note.modified).toLocaleString()} · {(note.size / 1024).toFixed(1)}KB
                                </span>
                              </div>
                              {(note.filename.includes('summary') || note.filename.includes('enhanced')) && (
                                <span style={{ fontSize: '12px', color: 'var(--accent-primary)', marginLeft: '8px' }}>AI</span>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {drawerMode === 'settings' && (
                <motion.div
                  key="settings-view"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="view-content"
                  style={{ maxHeight: '500px', display: 'flex', flexDirection: 'column' }}
                >
                  <div className="view-header">
                    <h2><span className="header-slash">//</span> 设置</h2>
                  </div>

                  <div style={{ padding: '0 8px 16px 8px' }}>
                    <SegmentedControl
                      options={['General', 'Display', 'Hotkeys', 'API Keys']}
                      value={settingsTab}
                      onChange={(v) => setSettingsTab(v)}
                    />
                  </div>

                  <div className="scroll-y" style={{ flex: 1, padding: '0 8px' }}>
                    <AnimatePresence mode="wait">
                      {settingsTab === 'General' && (
                        <motion.div
                          key="tab-general"
                          initial={{ opacity: 0, x: 5 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -5 }}
                          transition={{ duration: 0.15 }}
                        >
                          <div className="settings-section">
                            <h3>常规</h3>
                            <div className="setting-card" style={{ marginBottom: '16px' }}>
                              <Tooltip disabled={!settings.show_tooltips} label="自动回答" description="检测到问题后，doudou 会自动生成回答。" position="bottom" delay={0.3}>
                                <div className="setting-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }} onClick={() => updateSetting('auto_answer', settings.auto_answer !== false ? false : true)}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                    <span>自动回答</span>
                                    <Toggle checked={settings.auto_answer !== false} onChange={(v) => updateSetting('auto_answer', v)} />
                                  </div>
                                  <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>检测到问题后，doudou 会自动生成回答。</span>
                                </div>
                              </Tooltip>
                            </div>
                          </div>

                          <div className="settings-section">
                            <h3>隐私与会话</h3>
                            <div className="setting-card">
                              <Tooltip disabled={!settings.show_tooltips} label="面试模式" description="启动时自动聆听系统音频，并启用 STAR 回答结构。" position="bottom" delay={0.3}>
                                <div className="setting-row" onClick={() => updateSetting('interview_mode', !settings.interview_mode)}>
                                  <span>面试模式（自动聆听 + STAR）</span>
                                  <Toggle checked={settings.interview_mode} onChange={(v) => updateSetting('interview_mode', v)} />
                                </div>
                              </Tooltip>
                              <Tooltip disabled={!settings.show_tooltips} label="屏幕保护" description="在截图和屏幕共享中隐藏 doudou 窗口，保护隐私。" position="bottom" delay={0.3}>
                                <div className="setting-row" onClick={() => updateSetting('stealth_mode', !settings.stealth_mode)}>
                                  <span>屏幕保护</span>
                                  <Toggle checked={settings.stealth_mode} onChange={(v) => updateSetting('stealth_mode', v)} />
                                </div>
                              </Tooltip>
                              <Tooltip disabled={!settings.show_tooltips} label="保存转写记录" description="将面试转写内容保存在本地，方便回顾和查阅。" position="bottom" delay={0.3}>
                                <div className="setting-row" onClick={() => updateSetting('save_transcripts', !settings.save_transcripts)}>
                                  <span>保存转写记录</span>
                                  <Toggle checked={settings.save_transcripts} onChange={(v) => updateSetting('save_transcripts', v)} />
                                </div>
                              </Tooltip>
                              <Tooltip disabled={!settings.show_tooltips} label="余额不足提醒" description="可用时长不足 2 小时时提醒。" position="bottom" delay={0.3}>
                                <div className="setting-row" onClick={() => updateSetting('low_credit_alert', !settings.low_credit_alert)}>
                                  <span>余额不足提醒</span>
                                  <Toggle checked={settings.low_credit_alert} onChange={(v) => updateSetting('low_credit_alert', v)} />
                                </div>
                              </Tooltip>
                              <Tooltip disabled={!settings.show_tooltips} label="会话结束提醒" description="会话到期前 5 分钟提醒。" position="bottom" delay={0.3}>
                                <div className="setting-row" onClick={() => updateSetting('session_end_warning', !settings.session_end_warning)}>
                                  <span>会话结束提醒</span>
                                  <Toggle checked={settings.session_end_warning} onChange={(v) => updateSetting('session_end_warning', v)} />
                                </div>
                              </Tooltip>
                            </div>
                          </div>
                          

                          <div className="settings-section">
                            <h3>音频</h3>
                            <div className="setting-card">
                              <div className="setting-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                                <span>聆听设备</span>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 4px 0', fontWeight: 600 }}>选择 doudou 要聆听的音频设备。</p>
                                <PremiumDropdown
                                  options={audioDevices}
                                  value={settings.audio_device_id}
                                  onChange={(v) => updateSetting('audio_device_id', v)}
                                  placeholder="默认（自动检测系统音频）"
                                />
                              </div>
                              <div className="setting-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                                <span>转写语言</span>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 4px 0', fontWeight: 600 }}>选择音频转写（Whisper）使用的语言。</p>
                                <select
                                  className="api-model-select no-drag"
                                  value={settings.transcript_language || 'auto'}
                                  onChange={(e) => updateSetting('transcript_language', e.target.value)}
                                >
                                  <option value="auto">自动检测（推荐，支持中英混用）</option>
                                  <option value="zh">简体中文</option>
                                  <option value="zh-TW">繁体中文</option>
                                  <option value="en">English</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {settingsTab === 'Display' && (
                        <motion.div
                          key="tab-display"
                          initial={{ opacity: 0, x: 5 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -5 }}
                          transition={{ duration: 0.15 }}
                        >
                          <div className="settings-section">
                            <h3>界面显示</h3>
                            <div className="setting-card">
                              <Tooltip disabled={!settings.show_tooltips} label="不透明度" description="调整 doudou 界面的透明程度。" position="bottom" delay={0.3}>
                                <div className="setting-row">
                                  <span>不透明度</span>
                                  <input
                                    type="range"
                                    className="no-drag"
                                    min="50" max="255"
                                    value={settings.opacity}
                                    onChange={(e) => updateSetting('opacity', parseInt(e.target.value))}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                              </Tooltip>
                              <Tooltip disabled={!settings.show_tooltips} label="浅色模式" description="切换深色或浅色界面主题。" position="bottom" delay={0.3}>
                                <div className="setting-row" onClick={() => updateSetting('light_mode', !settings.light_mode)}>
                                  <span>浅色模式</span>
                                  <Toggle checked={settings.light_mode} onChange={(v) => updateSetting('light_mode', v)} />
                                </div>
                              </Tooltip>
                              <Tooltip disabled={!settings.show_tooltips} label="显示操作提示" description="开启或关闭应用中的帮助提示。" position="bottom" delay={0.3}>
                                <div className="setting-row" onClick={() => updateSetting('show_tooltips', !settings.show_tooltips)}>
                                  <span>显示操作提示</span>
                                  <Toggle checked={settings.show_tooltips} onChange={(v) => updateSetting('show_tooltips', v)} />
                                </div>
                              </Tooltip>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {settingsTab === 'Hotkeys' && (
                        <motion.div
                          key="tab-hotkeys"
                          initial={{ opacity: 0, x: 5 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -5 }}
                          transition={{ duration: 0.15 }}
                        >
                          <div className="settings-section">
                            <h3>快捷键</h3>
                            <div className="setting-card">
                              <div className="setting-row">
                                <span>启动 / 暂停</span>
                                <HotkeyRecorder
                                  value={settings.hotkey}
                                  onChange={(v) => updateSetting('hotkey', v)}
                                />
                              </div>
                              <div className="setting-row">
                                <span>手动分析</span>
                                <HotkeyRecorder
                                  value={settings.hotkey_manual}
                                  onChange={(v) => updateSetting('hotkey_manual', v)}
                                />
                              </div>
                              <div className="setting-row">
                                <span>打开 / 收起聊天</span>
                                <HotkeyRecorder
                                  value={settings.hotkey_chat}
                                  onChange={(v) => updateSetting('hotkey_chat', v)}
                                />
                              </div>
                              <div className="setting-row">
                                <span>打开 / 收起回答策略</span>
                                <HotkeyRecorder
                                  value={settings.hotkey_strategy}
                                  onChange={(v) => updateSetting('hotkey_strategy', v)}
                                />
                              </div>
                              <div className="setting-row">
                                <span>分析屏幕</span>
                                <HotkeyRecorder
                                  value={settings.hotkey_screen}
                                  onChange={(v) => updateSetting('hotkey_screen', v)}
                                />
                              </div>
                              <div className="setting-row">
                                <span>打开 / 收起设置</span>
                                <HotkeyRecorder
                                  value={settings.hotkey_settings}
                                  onChange={(v) => updateSetting('hotkey_settings', v)}
                                />
                              </div>
                              <div className="setting-row">
                                <span>收起面板</span>
                                <HotkeyRecorder
                                  value={settings.hotkey_close}
                                  onChange={(v) => updateSetting('hotkey_close', v)}
                                />
                              </div>
                              <div className="setting-row">
                                <span>打开 / 收起历史记录</span>
                                <HotkeyRecorder
                                  value={settings.hotkey_history}
                                  onChange={(v) => updateSetting('hotkey_history', v)}
                                />
                              </div>
                              <div className="setting-row">
                                <span>重新生成回答</span>
                                <HotkeyRecorder
                                  value={settings.hotkey_retry}
                                  onChange={(v) => updateSetting('hotkey_retry', v)}
                                />
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}


                      {settingsTab === 'API Keys' && (
                        <motion.div
                          key="tab-api-keys"
                          initial={{ opacity: 0, x: 5 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -5 }}
                          transition={{ duration: 0.15 }}
                        >
                          <div className="settings-section">
                            <SegmentedControl
                              options={['实时转写', '回答']}
                              value={apiPurpose}
                              onChange={(value) => setApiPurpose(value)}
                            />
                            <h3 style={{ marginTop: '16px' }}>{apiPurpose}</h3>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '12px' }}>
                              {apiPurpose === '实时转写'
                                ? '将听到的语音转换为文字。配置 Groq 或 OpenAI 密钥即可，优先使用 Groq，失败后尝试 OpenAI。'
                                : '根据问题生成回答。配置至少一家服务商，并选择回答模型及调用优先级。'}
                              {' Groq 和 OpenAI 的密钥在两个部分共用，修改后会同步生效。'}
                            </p>

                            {apiPurpose === '回答' && (
                            <div className="setting-card" style={{ marginBottom: '16px', padding: '12px' }}>
                              <div style={{ marginBottom: '8px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>服务商优先级顺序</span>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                                  点击服务商可将其移到最前面（#1），再次点击移到最后。当主服务商失败时，系统将按此顺序自动切换。
                                </p>
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                                {providerPriority.map((prov, idx) => {
                                  const provLabels: {[key: string]: string} = {
                                    groq: 'Groq',
                                    gemini: 'Gemini',
                                    openai: 'OpenAI',
                                    anthropic: 'Anthropic',
                                    deepseek: 'DeepSeek',
                                    openrouter: 'OpenRouter'
                                  };
                                  const hasKey = !!(apiKeys[prov as keyof typeof apiKeys]?.trim() || settings[`${prov}_api_key`]?.trim());
                                  const isTopPriority = idx === 0;
                                  return (
                                    <div
                                      key={prov}
                                      className="no-drag"
                                      onClick={() => toggleProviderPriority(prov)}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '6px 12px',
                                        background: isTopPriority ? 'rgba(var(--accent-primary-rgb, 0, 200, 150), 0.15)' : hasKey ? 'rgba(var(--accent-primary-rgb, 0, 200, 150), 0.05)' : 'rgba(128, 128, 128, 0.05)',
                                        border: `2px solid ${isTopPriority ? 'var(--accent-primary)' : hasKey ? 'rgba(var(--accent-primary-rgb, 0, 200, 150), 0.3)' : 'var(--border-color)'}`,
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        fontWeight: isTopPriority ? 700 : 600,
                                        color: isTopPriority ? 'var(--accent-primary)' : hasKey ? 'var(--text-primary)' : 'var(--text-dim)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        boxShadow: isTopPriority ? '0 2px 8px rgba(var(--accent-primary-rgb, 0, 200, 150), 0.2)' : 'none'
                                      }}
                                    >
                                      <span style={{ fontSize: '11px', opacity: 0.6, fontWeight: 700 }}>#{idx + 1}</span>
                                      <span>{provLabels[prov]}</span>
                                      {hasKey && <span style={{ fontSize: '10px' }}>✓</span>}
                                      {isTopPriority && <span style={{ fontSize: '10px', marginLeft: '2px' }}>⭐</span>}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            )}

                            <div className="provider-links-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginBottom: '12px', fontSize: '12px', color: 'var(--text-dim)' }}>
                              <span>密钥申请入口：</span>
                              {[
                                { label: 'Groq', url: 'https://console.groq.com/keys' },
                                { label: 'OpenAI', url: 'https://platform.openai.com/api-keys' },
                                { label: 'Gemini', url: 'https://aistudio.google.com/app/apikey' },
                                { label: 'Anthropic', url: 'https://console.anthropic.com/settings/keys' },
                                { label: 'DeepSeek', url: 'https://platform.deepseek.com/api_keys' },
                                { label: 'OpenRouter', url: 'https://openrouter.ai/settings/keys' },
                              ].filter(p => apiPurpose === '回答' || ['Groq', 'OpenAI'].includes(p.label)).map(p => (
                                <button
                                  key={p.label}
                                  type="button"
                                  className="provider-link-btn no-drag"
                                  onClick={() => window.electron?.ipcRenderer.send('open-external-url', p.url)}
                                >
                                  {p.label}
                                </button>
                              ))}
                            </div>
                            <div className="setting-card">
                              {([
                                { key: 'groq', label: 'Groq', placeholder: 'gsk_...' },
                                { key: 'openai', label: 'OpenAI', placeholder: 'sk-...' },
                                { key: 'gemini', label: 'Gemini', placeholder: 'AI...' },
                                { key: 'anthropic', label: 'Anthropic', placeholder: 'sk-ant-...' },
                                { key: 'deepseek', label: 'DeepSeek', placeholder: 'sk-...' },
                                { key: 'openrouter', label: 'OpenRouter', placeholder: 'sk-or-...' },
                              ] as const).filter(prov => apiPurpose === '回答' || prov.key === 'groq' || prov.key === 'openai').map(prov => {
                                const currentKeyVal = apiKeys[prov.key] || settings[`${prov.key}_api_key`] || '';
                                return (
                                  <div key={prov.key}>
                                    <div className="setting-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                        <span>{prov.label} API 密钥{apiPurpose === '实时转写' ? (prov.key === 'groq' ? ' · 优先' : ' · 备用') : ''}</span>
                                        {currentKeyVal?.trim() ? (
                                          <span className="key-status-chip configured">
                                            已配置 {currentKeyVal.length > 4 ? `...${currentKeyVal.slice(-4)}` : currentKeyVal}
                                          </span>
                                        ) : (
                                          <span className="key-status-chip not-set">未设置</span>
                                        )}
                                      </div>
                                      <div style={{ display: 'flex', width: '100%', gap: '8px', alignItems: 'center' }}>
                                        <input
                                          type={visibleApiKeys[prov.key] ? 'text' : 'password'}
                                          className="api-key-input no-drag"
                                          placeholder={prov.placeholder}
                                          value={apiKeys[prov.key]}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            setApiKeys(prev => ({ ...prev, [prov.key]: val }));
                                            // Debounce IPC send to avoid per-keystroke transmission (v1.3.0)
                                            if (apiKeyTimers.current[prov.key]) clearTimeout(apiKeyTimers.current[prov.key]);
                                            apiKeyTimers.current[prov.key] = setTimeout(() => {
                                              window.electron?.ipcRenderer.send('send-to-sidecar', { action: 'update-api-keys', payload: { [`${prov.key}_key`]: val } });
                                            }, 400);
                                          }}
                                        />
                                        <button
                                          className="icon-circle no-drag"
                                          onClick={() => setVisibleApiKeys(prev => ({ ...prev, [prov.key]: !prev[prov.key] }))}
                                          style={{ flexShrink: 0 }}
                                          type="button"
                                        >
                                          {visibleApiKeys[prov.key] ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                        {apiPurpose === '回答' && (
                                        <select
                                          className="api-model-select no-drag"
                                          style={{ flexShrink: 0, minWidth: '140px', maxWidth: '180px' }}
                                          value={(modelSelections as any)[prov.key] || (modelDefaults as any)[prov.key] || ''}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            if (val) {
                                              setModelSelections(prev => ({ ...prev, [prov.key]: val }));
                                              window.electron?.ipcRenderer.send('send-to-sidecar', { action: 'update-model', payload: { provider: prov.key, model: val } });
                                            }
                                          }}
                                        >
                                          {(() => {
                                            const models = (availableModels as any)[prov.key];
                                            const hasModels = models && Array.isArray(models) && models.length > 0;
                                            const currentModel = (modelSelections as any)[prov.key] || (modelDefaults as any)[prov.key];

                                            if (!hasModels) {
                                              return currentModel ? <option value={currentModel}>{currentModel}</option> : <option value="">模型列表加载中...</option>;
                                            }

                                            return (
                                              <>
                                                {!currentModel && <option value="">选择模型</option>}
                                                {models.map((m: string) => (
                                                  <option key={m} value={m}>{m}</option>
                                                ))}
                                              </>
                                            );
                                          })()}
                                        </select>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="settings-section" style={{ padding: '0 8px 8px 8px', marginTop: 'auto' }}>
                    <div className="setting-card">
                      <div
                        className="setting-row"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setDrawerMode('guide')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <HelpCircle size={16} color="var(--accent-primary)" />
                          <span>打开使用指南</span>
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>查看教程</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Direct Chat Input View (v1.1.7) */}
              {drawerMode === 'chat' && (
                <motion.div
                  key="chat-view"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="drawer-view-mask"
                >
                  <div className="view-content chat-drawer-content">
                    <div className="view-header">
                      <h2><span className="header-slash">//</span> doudou 对话</h2>
                    </div>

                    <div className="chat-prompt-area centered-chat">
                      <div className="chat-luxury-header">
                        <h1>有什么可以帮你？</h1>
                        <p>由 doudou 驱动的 AI 助手</p>
                      </div>
                    </div>

                    <div className={`chat-input-wrapper no-drag ${!isAuthorized ? 'locked' : ''}`}>
                      <input
                        type="text"
                        ref={chatInputRef}
                        className="chat-input"
                        placeholder="输入你的问题…"
                        value={chatInput}
                        disabled={!isAuthorized}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && chatInput.trim() && isAuthorized) {
                            setAiResponse('');
                            setDrawerMode('response'); // Transition to response view v1.1.7
                            window.electron?.ipcRenderer.send('send-to-sidecar', {
                              action: 'fake-transcript',
                              payload: chatInput.trim()
                            });
                            // v51.6: Manually trigger AI for Chat Enter even if auto_answer is off
                            window.electron?.ipcRenderer.send('send-to-sidecar', { action: 'trigger-ai' });
                            setIsThinking(true);
                            setChatInput('');
                          }
                        }}
                      />
                      <button
                        className="chat-send-btn"
                        disabled={!isAuthorized || !chatInput.trim()}
                        onClick={() => {
                          if (chatInput.trim() && isAuthorized) {
                            setAiResponse('');
                            setDrawerMode('response'); // Transition to response view v1.1.7
                            window.electron?.ipcRenderer.send('send-to-sidecar', {
                              action: 'fake-transcript',
                              payload: chatInput.trim()
                            });
                            setIsThinking(true);
                            setChatInput('');
                          }
                        }}
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* First-Run Guide View (Task 4) */}
              {drawerMode === 'guide' && (
                <motion.div
                  key="guide-view"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="view-content guide-drawer-view"
                  style={{ maxHeight: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '16px' }}
                >
                  <div className="view-header" style={{ width: '100%', textAlign: 'left' }}>
                    <h2><span className="header-slash">//</span> 快速入门</h2>
                  </div>

                  <img src="./logo.png" alt="doudou 标志" style={{ width: '72px', height: '72px', marginBottom: '12px', filter: 'drop-shadow(0 0 16px var(--accent-primary))' }} />
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 800 }}>欢迎使用 doudou</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>实时 AI 面试助手。</p>

                  <div className="guide-grid" style={{ marginTop: '8px', marginBottom: '24px' }}>
                    <div className="guide-item">
                      <Terminal size={28} color="var(--accent-primary)" />
                      <strong>回答策略</strong>
                      <span style={{ fontSize: '12px', opacity: 0.7 }}>设置背景资料，获得更贴合你的回答。</span>
                    </div>
                    <div className="guide-item">
                      <Mic size={28} color="var(--accent-primary)" />
                      <strong>聆听</strong>
                      <span style={{ fontSize: '12px', opacity: 0.7 }}>点击麦克风或按快捷键开始。</span>
                    </div>
                    <div className="guide-item">
                      <Zap size={28} color="var(--accent-primary)" />
                      <strong>回答</strong>
                      <span style={{ fontSize: '12px', opacity: 0.7 }}>doudou 实时生成回答。</span>
                    </div>
                  </div>

                  <button
                    className="btn-accent no-drag guide-got-it-btn"
                    type="button"
                    style={{
                      padding: '8px 24px',
                      fontSize: '13px',
                      fontWeight: 700,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      marginTop: 'auto'
                    }}
                    onClick={() => {
                      updateSetting('show_guide_startup', false);
                      setDrawerOpen(false);
                    }}
                  >
                    知道了
                  </button>
                </motion.div>
              )}

              {/* Response Stream (Answers Only v18.0) */}
              {drawerMode === 'response' && (
                <motion.div
                  key="response-view"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="drawer-view-mask"
                >
                  <div
                    className="view-content response-drawer-content"
                    ref={responseScrollRef}
                    onScroll={(event) => {
                      const panel = event.currentTarget;
                      followResponseRef.current = panel.scrollHeight - panel.scrollTop - panel.clientHeight < 32;
                    }}
                  >
                    {/* Connect Your AI Empty State Card (Task 6) */}
                    {!hasAnyKey && !aiResponse && (
                      <div className="connect-ai-card">
                        <div className="connect-ai-header">
                          <Sparkles size={18} color="var(--accent-primary)" />
                          <h4>连接你的 AI 服务</h4>
                        </div>
                        <p className="connect-ai-text">
                          配置你自己的 API 密钥，即可使用 doudou 生成回答。
                        </p>
                        <div className="connect-ai-buttons">
                          <button
                            type="button"
                            className="connect-ai-btn no-drag"
                            onClick={() => window.electron?.ipcRenderer.send('open-external-url', 'https://console.groq.com/keys')}
                          >
                            <span>Groq</span> <span className="btn-badge">快速响应 · 免费额度</span>
                          </button>
                          <button
                            type="button"
                            className="connect-ai-btn no-drag"
                            onClick={() => window.electron?.ipcRenderer.send('open-external-url', 'https://aistudio.google.com/app/apikey')}
                          >
                            <span>Gemini</span> <span className="btn-badge">免费额度</span>
                          </button>
                          <button
                            type="button"
                            className="connect-ai-btn no-drag"
                            onClick={() => window.electron?.ipcRenderer.send('open-external-url', 'https://platform.openai.com/api-keys')}
                          >
                            <span>OpenAI</span> <span className="btn-badge">热门选择</span>
                          </button>
                          <button
                            type="button"
                            className="connect-ai-btn-secondary no-drag"
                            onClick={() => {
                              setDrawerMode('settings');
                              setSettingsTab('API Keys');
                            }}
                          >
                            已有密钥，前往设置
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Content Area */}
                    <div className="response-content-area">
                      {aiResponse ? (
                        <>
                          {detectedStrategy === 'Behavioral (Soft skills)' ? (
                            <BehavioralStarPanel text={aiResponse} />
                          ) : detectedStrategy === 'Coding interview' ? (
                            <CodingAssistantPanel responseText={aiResponse} />
                          ) : (
                            <ResponseRenderer text={aiResponse} />
                          )}
                          {/* Copy button at bottom of response — no clip with close button */}
                          <ResponseCopyActions text={aiResponse} />
                        </>
                      ) : isThinking ? (
                        <div className="thinking-placeholder">
                          <div className="thinking-dots">
                            <div className="thinking-dot" />
                            <div className="thinking-dot" />
                            <div className="thinking-dot" />
                          </div>
                          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.3px' }}>doudou 正在回答…</span>
                        </div>
                      ) : (
                        <div className="thinking-placeholder" style={{ opacity: 0.5 }}>
                          <MessageSquare size={18} />
                          <span style={{ fontSize: '14px', fontWeight: 500 }}>向我提问吧…</span>
                        </div>
                      )}
                      <div ref={chatScrollRef} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div >
        )
        }
      </AnimatePresence >

      {/* Onboarding */}
      <AnimatePresence>
        {
          showOnboarding && (
            <motion.div
              className="onboarding-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOnboarding(false)}
            >
              <motion.div
                className="onboarding-content"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
              >
                <img src="./logo.png" alt="doudou 标志" style={{ width: '120px', height: '120px', marginBottom: '16px', filter: 'drop-shadow(0 0 20px var(--accent-primary))' }} />
                <h1>doudou</h1>
                <p style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>实时 AI 面试助手。</p>
                <div className="guide-grid">
                  <div className="guide-item">
                    <Terminal size={28} color="var(--accent-primary)" />
                    <strong>回答策略</strong>
                    <span style={{ fontSize: '12px', opacity: 0.7 }}>设置背景资料，获得更贴合你的回答。</span>
                  </div>
                  <div className="guide-item">
                    <Mic size={28} color="var(--accent-primary)" />
                    <strong>聆听</strong>
                    <span style={{ fontSize: '12px', opacity: 0.7 }}>点击麦克风或按快捷键开始。</span>
                  </div>
                  <div className="guide-item">
                    <Zap size={28} color="var(--accent-primary)" />
                    <strong>回答</strong>
                    <span style={{ fontSize: '12px', opacity: 0.7 }}>doudou 实时生成回答。</span>
                  </div>
                </div>
                <div className="dismiss-hint" style={{ marginTop: '40px' }}>点击任意位置关闭</div>
              </motion.div>
            </motion.div>
          )
        }
      </AnimatePresence >
    </div >
  )
}

// Response copy-all action bar (v1.3.0)
function ResponseCopyActions({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopyAll = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="response-actions-bar no-drag">
      <button
        className={`copy-all-btn ${copied ? 'copied' : ''}`}
        onClick={handleCopyAll}
        type="button"
      >
        {copied ? <Check size={12} /> : <ClipboardList size={12} />}
        {copied ? "已复制" : "复制回答"}
      </button>
    </div>
  );
}

function CodeBlock({ code, lang }: { code: string, lang: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block-container no-drag">
      <div className="code-header">
        <span className="code-lang">{lang || 'code'}</span>
        <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopy}>
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "已复制" : "复制代码"}
        </button>
      </div>
      <pre className="code-content">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function ResponseRenderer({ text }: { text: string }) {
  // Split by code blocks first
  const blocks = text.split(/(```[\s\S]*?```)/g);

  const renderFormattedText = (line: string) => {
    // Bold parsing: **text**
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ color: 'var(--accent-primary)', fontWeight: 900 }}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const renderLine = (line: string, index: number) => {
    const trimmed = line.trim();
    if (!trimmed) return null;

    // 1. Headers (### Section)
    if (trimmed.startsWith('###')) {
      return (
        <h3 key={index} className="response-section-header">
          {renderFormattedText(trimmed.replace(/^###\s*/, ''))}
        </h3>
      );
    }

    // 2. Complexity Cards (detecting Time Complexity: O(N))
    if (trimmed.toLowerCase().includes('complexity:') || (trimmed.toLowerCase().includes('complexity') && trimmed.includes('O('))) {
      const title = trimmed.split(':')[0] || 'Complexity';
      const value = trimmed.split(':')[1] || trimmed;
      return (
        <div key={index} className="complexity-card">
          <span className="complexity-title">{title}</span>
          <span className="complexity-value">{renderFormattedText(value)}</span>
        </div>
      );
    }

    // 3. Lists (Bullets - item)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      return (
        <div key={index} className="response-list-item">
          <span className="list-bullet">•</span>
          <span className="list-content">{renderFormattedText(trimmed.substring(2))}</span>
        </div>
      );
    }

    // 4. Numbered Lists (1. Item)
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      return (
        <div key={index} className="response-list-item">
          <span className="list-number">{numMatch[1]}</span>
          <span className="list-content">{renderFormattedText(numMatch[2])}</span>
        </div>
      );
    }

    // 5. Default Paragraph
    return (
      <p key={index} className="response-paragraph">
        {renderFormattedText(line)}
      </p>
    );
  };

  return (
    <div className="response-renderer">
      {blocks.map((block, i) => {
        if (block.startsWith('```')) {
          const match = block.match(/```(\w*)\n?([\s\S]*?)```/);
          if (match) {
            return <CodeBlock key={i} lang={match[1]} code={match[2].trim()} />;
          }
        }

        // Process non-code lines
        return (
          <div key={i} className="text-block">
            {block.split('\n').map((line, j) => renderLine(line, j))}
          </div>
        );
      })}
    </div>
  );
}

function PremiumStepper({ value, onChange, min, max, step = 1, unit = "" }: { value: number, onChange: (v: number) => void, min: number, max: number, step?: number, unit?: string }) {
  return (
    <div className="premium-stepper no-drag">
      <button 
        className="stepper-btn" 
        disabled={value <= min}
        onClick={(e) => { e.stopPropagation(); onChange(Math.max(min, value - step)); }}
      >
        <ChevronLeft size={16} />
      </button>
      <div className="stepper-value">
        {value}<span className="stepper-unit">{unit}</span>
      </div>
      <button 
        className="stepper-btn" 
        disabled={value >= max}
        onClick={(e) => { e.stopPropagation(); onChange(Math.min(max, value + step)); }}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

function SegmentedControl({ options, value, onChange, className = "" }: { options: string[], value: any, onChange: (v: any) => void, className?: string }) {
  return (
    <div className={`segmented-control no-drag ${className}`}>
      {options.map(opt => (
        <div
          key={zhLabel(opt)}
          className={`segment-item ${value === opt ? 'active' : ''}`}
          onClick={(e) => { e.stopPropagation(); onChange(opt); }}
        >
          {zhLabel(opt)}
        </div>
      ))}
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean, onChange: (v: boolean) => void }) {
  return (
    <div className={`switch ${checked ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); onChange(!checked); }}>
      <motion.div
        className="handle"
        layout
        transition={{ type: "spring", stiffness: 700, damping: 40 }}
      />
    </div>
  )
}

function HotkeyRecorder({ value, onChange }: { value: string, onChange: (v: string) => void }) {
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    if (!isRecording) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Skip lone modifiers
      if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;

      const parts = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      if (e.metaKey) parts.push('CmdOrCtrl');

      // Map special keys to Electron format
      let key = e.key;
      if (key.length === 1) {
        key = key.toUpperCase();
      } else {
        // Special mapping for Electron accelerators
        if (key === ' ') key = 'Space';
        else if (key === 'ArrowUp') key = 'Up';
        else if (key === 'ArrowDown') key = 'Down';
        else if (key === 'ArrowLeft') key = 'Left';
        else if (key === 'ArrowRight') key = 'Right';
        else if (key === 'Escape') {
          setIsRecording(false);
          return;
        } else if (key === 'Delete') key = 'Delete';
        else if (key === 'Backspace') key = 'Backspace';
      }

      parts.push(key);
      const accelerator = parts.join('+');
      console.log(`HotkeyRecorder: Result=${accelerator}`);
      onChange(accelerator);
      setIsRecording(false);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isRecording, onChange]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
      <div
        className={`hotkey-recorder no-drag ${isRecording ? 'recording' : ''}`}
        onClick={() => setIsRecording(!isRecording)}
      >
        {isRecording ? "请按下快捷键…" : (value || "未设置")}
      </div>
      {isRecording && <span className="recording-hint">按下组合键，或按 Esc 取消</span>}
    </div>
  );
}

function PremiumDropdown({ options, value, onChange, placeholder }: { options: { id: string, name: string }[], value: any, onChange: (v: any) => void, placeholder: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find(o => o.id === value);

  return (
    <div className="premium-dropdown-container no-drag">
      <div className={`premium-dropdown-header ${isOpen ? 'open' : ''}`} 
           style={{ padding: '10px 14px', minHeight: '42px' }}
           onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}>
        <span className="dropdown-label" style={{ fontSize: '12px', fontWeight: 600 }}>{selected ? selected.name : placeholder}</span>
        <ChevronUp
          style={{
            transform: isOpen ? 'rotate(0deg)' : 'rotate(180deg)',
            transition: 'transform 0.08s cubic-bezier(0.23, 1, 0.32, 1)',
            opacity: 0.6
          }}
          size={16}
        />
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="premium-dropdown-list"
          >
            <div
              className={`premium-dropdown-item ${!value ? 'active' : ''}`}
              onClick={() => { onChange(null); setIsOpen(false); }}
            >
              默认（自动）
            </div>
            {options.map(opt => (
              <div
                key={opt.id}
                className={`premium-dropdown-item ${value === opt.id ? 'active' : ''}`}
                onClick={() => { onChange(opt.id); setIsOpen(false); }}
              >
                {opt.name}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App
