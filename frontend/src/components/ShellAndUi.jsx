import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useSpring } from 'motion/react';
import {
  ShieldCheck,
  Sparkles,
  LogOut,
  MessageSquare,
  X,
  Send,
  Mic,
  Square,
  Volume2,
  AlertCircle,
  LayoutDashboard,
  FileCheck2,
  UserCheck,
  Newspaper,
  Users,
} from 'lucide-react';
import { apiRequest, sanitizeField, useAuth } from '../lib/core';

/* ---------- Animated Spring Counter ---------- */
export function AnimatedNumber({ value = 0, prefix = '', suffix = '' }) {
  const numeric = Number(value) || 0;
  const spring = useSpring(0, { stiffness: 110, damping: 20 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    spring.set(numeric);
  }, [numeric, spring]);

  useEffect(() => {
    const unsub = spring.on('change', (latest) => {
      setDisplay(Math.round(latest));
    });
    return () => unsub();
  }, [spring]);

  return (
    <span className="tabular-nums">
      {prefix}
      {display.toLocaleString('en-IN')}
      {suffix}
    </span>
  );
}

/* ---------- Live KPI Card ---------- */
export function KpiCard({ label, value, prefix = '', suffix = '', subtext, icon: Icon, accent = 'zinc' }) {
  const badgeStyles = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    zinc: 'bg-zinc-100 text-zinc-800 border-zinc-200/80',
    amber: 'bg-amber-50 text-amber-700 border-amber-200/80',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl bg-white border border-zinc-200/90 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.05)] transition-shadow"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</span>
        {Icon && (
          <div className={`p-2 rounded-xl border ${badgeStyles[accent] || badgeStyles.zinc}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <div className="text-3xl font-semibold tracking-tight text-zinc-950">
        <AnimatedNumber value={value} prefix={prefix} suffix={suffix} />
      </div>
      {subtext && <p className="mt-1.5 text-xs text-zinc-500">{subtext}</p>}
    </motion.div>
  );
}

/* ---------- Animated SVG Progress Ring ---------- */
export function ProgressRing({ percent = 0, size = 84, stroke = 7, label = 'Complete' }) {
  const clamped = Math.max(0, Math.min(100, Number(percent) || 0));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="flex items-center gap-3.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#e4e4e7"
            strokeWidth={stroke}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#10b981"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ type: 'spring', stiffness: 90, damping: 18 }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-zinc-950 tabular-nums">
          {Math.round(clamped)}%
        </div>
      </div>
      <div>
        <div className="text-xs font-medium uppercase tracking-wider text-zinc-400">Status</div>
        <div className="text-sm font-semibold text-zinc-900">{label}</div>
      </div>
    </div>
  );
}

/* ---------- Strict Vault Input ---------- */
export function VaultInput({
  label,
  name,
  value,
  onChange,
  placeholder,
  maxDigits,
  verified = false,
  error,
  type = 'text',
  hint,
}) {
  const handleInput = (e) => {
    const cleaned = sanitizeField(name, e.target.value);
    onChange(name, cleaned);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-medium text-zinc-700">{label}</label>
        {verified ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
            <ShieldCheck className="w-3 h-3" /> AES-256-GCM Verified
          </span>
        ) : maxDigits ? (
          <span className="text-[11px] font-medium text-zinc-400 tabular-nums">
            {(value || '').length}/{maxDigits} {name === 'ifscCode' ? 'chars' : 'digits'}
          </span>
        ) : null}
      </div>
      <input
        type={type}
        name={name}
        value={value || ''}
        onChange={handleInput}
        inputMode={['nationalId', 'phone', 'payoutAccount', 'uanNumber'].includes(name) ? 'numeric' : 'text'}
        maxLength={maxDigits}
        placeholder={verified ? 'Encrypted in Vault (enter new to replace)' : placeholder}
        className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-all tabular-nums ${
          error
            ? 'border-rose-400 focus:ring-2 focus:ring-rose-500/20'
            : 'border-zinc-200 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10'
        }`}
      />
      {error ? (
        <p className="mt-1 text-xs text-rose-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[11px] text-zinc-400">{hint}</p>
      ) : null}
    </div>
  );
}

/* ---------- Safe React Markdown Renderer (No dangerouslySetInnerHTML) ---------- */
export function MarkdownRenderer({ content = '' }) {
  const lines = String(content).split('\n');

  const renderInline = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-zinc-950">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <React.Fragment key={i}>{part}</React.Fragment>;
    });
  };

  return (
    <div className="space-y-1.5 text-sm leading-relaxed text-zinc-700">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              <span>{renderInline(trimmed.slice(2))}</span>
            </div>
          );
        }
        return <p key={idx}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

/* ---------- Navigation Shell ---------- */
export function AppShell({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems =
    user?.role === 'contractor'
      ? [
          { to: '/contractor', label: 'Workforce Hub', icon: Users },
          { to: '/news', label: 'Policy News', icon: Newspaper },
        ]
      : [
          { to: '/laborer', label: 'Command Center', icon: LayoutDashboard },
          { to: '/laborer/schemes', label: 'Schemes', icon: FileCheck2 },
          { to: '/laborer/profile', label: 'Identity Vault', icon: UserCheck },
          { to: '/news', label: 'Policy News', icon: Newspaper },
        ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen mesh-bg flex flex-col">
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link to={user?.role === 'contractor' ? '/contractor' : '/laborer'} className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-950 text-white shadow-sm">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <span className="text-base font-semibold tracking-tight text-zinc-950">SchemeSetu</span>
                <span className="ml-2 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                  {user?.role || 'Vault'}
                </span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1 rounded-xl bg-zinc-100/80 p-1 border border-zinc-200/60">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`relative flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
                      active ? 'text-zinc-950' : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="activeNavPill"
                        transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                        className="absolute inset-0 rounded-lg bg-white shadow-xs border border-zinc-200/70"
                      />
                    )}
                    <Icon className="relative z-10 w-3.5 h-3.5" />
                    <span className="relative z-10">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-semibold text-zinc-900">{user?.name}</span>
              <span className="text-[11px] text-zinc-500 tabular-nums">+91 {user?.phone}</span>
            </div>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </motion.button>
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="flex md:hidden overflow-x-auto border-t border-zinc-100 px-4 py-2 gap-2 bg-white">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium ${
                  active ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-600'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

/* ---------- 16kHz Mono WAV Encoder ---------- */
function encodeMonoWav16k(audioBuffer) {
  const targetRate = 16000;
  const raw = audioBuffer.getChannelData(0);
  const ratio = audioBuffer.sampleRate / targetRate;
  const newLength = Math.max(1, Math.round(raw.length / ratio));
  const samples = new Int16Array(newLength);
  let peak = 0;

  for (let i = 0; i < newLength; i++) {
    const srcIdx = Math.min(raw.length - 1, Math.floor(i * ratio));
    const s = Math.max(-1, Math.min(1, raw[srcIdx]));
    const intSample = s < 0 ? s * 0x8000 : s * 0x7fff;
    samples[i] = intSample;
    const abs = Math.abs(intSample);
    if (abs > peak) peak = abs;
  }

  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, targetRate, true);
  view.setUint32(28, targetRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    view.setInt16(offset, samples[i], true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return { base64: btoa(binary), peak };
}

/* ---------- SchemeMitra Floating AI Chat & Voice Assistant ---------- */
export function SchemeMitra() {
  const { user, chatOpen, setChatOpen, queuedPrompt, setQueuedPrompt } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `Namaste **${user?.name || 'Worker'}**! Ask me anything about welfare scheme eligibility, document checklists, or recent labour policy updates in Hindi, Hinglish, or English.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [language, setLanguage] = useState('hi');
  const [voiceError, setVoiceError] = useState('');
  const [lastAudioUrl, setLastAudioUrl] = useState('');

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const bottomRef = useRef(null);

  const sendTextMessage = async (textToSend) => {
    const clean = textToSend.trim();
    if (!clean || sending) return;
    setVoiceError('');
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: clean }]);
    setSending(true);

    try {
      const res = await apiRequest('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: clean }),
      });
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: res.reply || res.message || 'No response received.' },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `Unable to reach SchemeMitra: ${err.message}` },
      ]);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (chatOpen && queuedPrompt) {
      const prompt = queuedPrompt;
      setQueuedPrompt('');
      sendTextMessage(prompt);
    }
  }, [chatOpen, queuedPrompt]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const startRecording = async () => {
    setVoiceError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        try {
          setSending(true);
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          const arrayBuf = await blob.arrayBuffer();
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          const audioCtx = new AudioCtx();
          await audioCtx.resume();
          const decoded = await audioCtx.decodeAudioData(arrayBuf);
          const { base64, peak } = encodeMonoWav16k(decoded);

          if (peak === 0) {
            setVoiceError('No microphone audio detected. Check your mic input and try speaking again.');
            setSending(false);
            return;
          }

          setMessages((prev) => [...prev, { role: 'user', text: 'Transcribing voice query...' }]);

          const res = await apiRequest('/ai/voice', {
            method: 'POST',
            body: JSON.stringify({ audio_base64: base64, language, tts: true }),
          });

          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = {
              role: 'user',
              text: res.transcript ? `"${res.transcript}"` : 'Voice query sent',
            };
            return [...copy, { role: 'assistant', text: res.reply || 'Processed voice request.' }];
          });

          if (res.audio_base64) {
            const url = `data:${res.audio_mime || 'audio/wav'};base64,${res.audio_base64}`;
            setLastAudioUrl(url);
            const audio = new Audio(url);
            audio.play().catch(() => {
              // Browser blocked autoplay; manual Play Reply button remains visible
            });
          }
        } catch (err) {
          setVoiceError(err.message || 'Voice processing failed');
        } finally {
          setSending(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setVoiceError('Microphone permission denied or unavailable.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="mb-3 flex h-[490px] w-[360px] sm:w-[400px] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-950 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="text-sm font-semibold">SchemeMitra AI</div>
                  <div className="text-[11px] text-zinc-400">Sarvam + Gnani Voice Assistant</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="rounded-lg bg-zinc-800 px-2 py-1 text-[11px] text-zinc-200 outline-none"
                >
                  <option value="hi">Hindi</option>
                  <option value="en">English</option>
                  <option value="mr">Marathi</option>
                  <option value="ta">Tamil</option>
                  <option value="bn">Bengali</option>
                </select>
                <button
                  onClick={() => setChatOpen(false)}
                  className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50/60">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                      m.role === 'user'
                        ? 'bg-zinc-950 text-white'
                        : 'bg-white border border-zinc-200/90 text-zinc-800 shadow-2xs'
                    }`}
                  >
                    {m.role === 'user' ? m.text : <MarkdownRenderer content={m.text} />}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex items-center gap-2 text-xs text-zinc-500 px-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>SchemeMitra is thinking...</span>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Voice Error / Replay Bar */}
            {(voiceError || lastAudioUrl) && (
              <div className="border-t border-zinc-100 bg-zinc-50 px-3 py-2 flex items-center justify-between gap-2">
                {voiceError ? (
                  <span className="flex items-center gap-1.5 text-[11px] text-rose-600">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {voiceError}
                  </span>
                ) : (
                  <span className="text-[11px] text-zinc-500">Voice reply ready</span>
                )}
                {lastAudioUrl && (
                  <button
                    onClick={() => new Audio(lastAudioUrl).play().catch(() => {})}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-emerald-700 cursor-pointer"
                  >
                    <Volume2 className="w-3 h-3" /> Play Reply
                  </button>
                )}
              </div>
            )}

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendTextMessage(input);
              }}
              className="border-t border-zinc-200 bg-white p-2.5 flex items-center gap-2"
            >
              <button
                type="button"
                onClick={recording ? stopRecording : startRecording}
                title={recording ? 'Stop recording' : 'Speak to SchemeMitra'}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors cursor-pointer ${
                  recording
                    ? 'border-rose-500 bg-rose-50 text-rose-600 animate-pulse'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                {recording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about schemes or eligibility..."
                className="flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-900"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-white disabled:opacity-40 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => setChatOpen((prev) => !prev)}
        className="ml-auto flex items-center gap-2 rounded-full bg-zinc-950 px-4 py-3 text-xs font-semibold text-white shadow-xl border border-zinc-800 cursor-pointer"
      >
        <MessageSquare className="w-4 h-4 text-emerald-400" />
        <span>SchemeMitra AI</span>
      </motion.button>
    </div>
  );
}