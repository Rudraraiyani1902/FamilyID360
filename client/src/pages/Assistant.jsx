import { useState } from 'react';
import { sendAssistantMessage } from '../api/assistant.api';

const SUGGESTIONS = [
  'What schemes may be relevant for my family?',
  'Why am I not eligible for this scheme?',
  'Which documents are missing?',
  'Show my pending applications.',
  'What benefits has my family received?',
  'મારા પરિવાર માટે કઈ યોજનાઓ ઉપલબ્ધ છે?',
  'मेरा कौन सा दस्तावेज़ बाकी है?',
];

const now = () => new Date().toISOString();

const INITIAL_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  content: 'Hello. I can explain verified information about your family, government schemes, eligibility results, documents, and applications.',
  timestamp: now(),
};

const formatTime = (value) => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value));

export default function Assistant() {
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState(null);
  const [lastFailedMessage, setLastFailedMessage] = useState('');

  const submitMessage = async (message) => {
    const trimmed = message.trim();
    if (!trimmed || typing) return;
    setInput('');
    setError(null);
    setLastFailedMessage('');
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: 'user', content: trimmed, timestamp: now() }]);
    setTyping(true);
    try {
      const response = await sendAssistantMessage(trimmed);
      const data = response.data || {};
      setMessages((current) => [...current, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message || "I don't have enough verified information to answer that.",
        timestamp: now(),
        intent: data.intent,
        sources: data.sources || [],
      }]);
    } catch (requestError) {
      setError(requestError.clientMessage || requestError.response?.data?.message || 'The assistant could not reach the verified data service.');
      setLastFailedMessage(trimmed);
    } finally {
      setTyping(false);
    }
  };

  const submitForm = (event) => {
    event.preventDefault();
    submitMessage(input);
  };

  const clearChat = () => {
    setMessages([{ ...INITIAL_MESSAGE, id: `welcome-${Date.now()}`, timestamp: now() }]);
    setError(null);
    setLastFailedMessage('');
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Verified service guide</span>
          <h1 className="page-title">FamilyID Assistant</h1>
          <p className="page-subtitle">Ask about your family's government services and applications.</p>
        </div>
        <button type="button" onClick={clearChat} className="btn-secondary text-xs py-2 px-4 self-start sm:self-auto">Clear chat</button>
      </div>

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-5 items-start">
        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[620px]">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-slate-900 text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/20 border border-primary-400/30 flex items-center justify-center text-primary-200">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h.01M12 10h.01M16 10h.01M21 12a8.5 8.5 0 01-9 8.5 8.7 8.7 0 01-3.4-.7L4 21l1.2-3.5A8.5 8.5 0 1112 20.5" /></svg>
            </div>
            <div><h2 className="font-bold text-sm">FamilyID 360 help desk</h2><p className="text-xs text-slate-300">Answers are grounded in your verified portal records.</p></div>
          </div>

          <div className="flex-1 p-4 sm:p-6 space-y-5 overflow-y-auto max-h-[calc(100vh-20rem)]">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] sm:max-w-[76%] ${message.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${message.role === 'user' ? 'bg-primary-700 text-white rounded-br-md' : 'bg-gray-100 text-gray-800 rounded-bl-md'}`}>{message.content}</div>
                  <div className="flex items-center gap-2 px-1 text-[10px] text-gray-400"><span>{formatTime(message.timestamp)}</span>{message.intent && <span className="uppercase tracking-wide">{message.intent.replace(/_/g, ' ')}</span>}</div>
                  {message.sources?.length > 0 && <div className="flex flex-wrap gap-1 px-1"><span className="text-[10px] text-gray-400">Verified eligibility:</span>{message.sources.map((source) => <span key={source.schemeId} className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full px-2 py-0.5">{source.schemeCode || source.schemeId}</span>)}</div>}
                </div>
              </div>
            ))}
            {typing && <div className="flex items-center gap-2 text-xs text-gray-500"><span className="flex gap-1"><span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-bounce" /><span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-bounce [animation-delay:120ms]" /><span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-bounce [animation-delay:240ms]" /></span> Checking verified records…</div>}
            {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"><span>{error}</span>{lastFailedMessage && <button type="button" onClick={() => submitMessage(lastFailedMessage)} className="font-bold underline self-start sm:self-auto">Retry</button>}</div>}
          </div>

          <form onSubmit={submitForm} className="border-t border-gray-100 p-3 sm:p-4 bg-gray-50 flex items-end gap-2">
            <label className="sr-only" htmlFor="assistant-message">Ask FamilyID Assistant</label>
            <textarea id="assistant-message" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submitForm(event); } }} placeholder="Ask a question about your family…" rows="2" className="input resize-none text-sm flex-1" disabled={typing} />
            <button type="submit" disabled={typing || !input.trim()} aria-label="Send message" title="Send message" className="w-11 h-11 shrink-0 rounded-xl bg-primary-700 text-white flex items-center justify-center disabled:opacity-40 hover:bg-primary-800 transition"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 12h13m-6-6l6 6-6 6" /></svg></button>
          </form>
        </section>

        <aside className="card space-y-4 xl:sticky xl:top-6">
          <div><h2 className="font-bold text-gray-900 text-sm">Suggested questions</h2><p className="text-xs text-gray-500 mt-1">Choose a prompt to get started.</p></div>
          <div className="space-y-2">{SUGGESTIONS.map((suggestion) => <button key={suggestion} type="button" onClick={() => submitMessage(suggestion)} disabled={typing} className="w-full text-left text-xs leading-relaxed text-gray-700 border border-gray-200 rounded-xl px-3 py-2.5 hover:border-primary-300 hover:bg-primary-50 disabled:opacity-50 transition">{suggestion}</button>)}</div>
          <div className="pt-3 border-t border-gray-100 text-[11px] leading-relaxed text-gray-500">The assistant explains information returned by the portal. It cannot change your family profile, application status, or eligibility result.</div>
        </aside>
      </div>
    </div>
  );
}
