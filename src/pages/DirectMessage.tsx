import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Mic, MicOff, Trash2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import { format } from 'date-fns';

interface DM {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string;
  created_at: string;
  sender_name?: string;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: Event) => void) | null;
  onend: (() => void) | null;
}
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

const SETUP_SQL = `-- Run this ONCE in your Supabase SQL editor:
CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dm_conv ON direct_messages(conversation_id);
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own DMs" ON direct_messages FOR SELECT
  USING (conversation_id LIKE '%' || auth.uid()::text || '%');
CREATE POLICY "Send DMs" ON direct_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Delete own DMs" ON direct_messages FOR DELETE
  USING (sender_id = auth.uid());`;

function convId(a: string, b: string) {
  return [a, b].sort().join('_');
}

export default function DirectMessage() {
  const { userId: otherUserId } = useParams<{ userId: string }>();
  const { data, currentUser, sendNotification } = useApp();
  const navigate = useNavigate();
  // Read users through a ref so a walker's live position updates never tear down the chat subscription.
  const usersRef = useRef(data.users);
  usersRef.current = data.users;
  const notifiedRef = useRef(false);
  const [loadError, setLoadError] = useState('');

  const [messages, setMessages] = useState<DM[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [dbMissing, setDbMissing] = useState(false);
  const [sendError, setSendError] = useState('');
  const [listening, setListening] = useState(false);
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const otherUser = data.users.find(u => u.id === otherUserId);
  const otherName = otherUser?.name || 'User';
  const cid = currentUser && otherUserId ? convId(currentUser.id, otherUserId) : '';

  const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
  const speechSupported = !!SpeechRecognitionAPI;

  useEffect(() => {
    if (!cid) return;
    supabase
      .from('direct_messages')
      .select('*, users(name)')
      .eq('conversation_id', cid)
      .order('created_at')
      .then(({ data: rows, error }) => {
        if (error?.code === '42P01') { setDbMissing(true); setLoading(false); return; }
        if (error) setLoadError('Could not load this conversation. Check your connection and try again.');
        if (rows) {
          setMessages(rows.map((r: any) => ({ ...r, sender_name: r.users?.name })));
        }
        setLoading(false);
      });
  }, [cid]);

  useEffect(() => {
    if (!cid || dbMissing) return;
    const channel = supabase
      .channel(`dm-${cid}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `conversation_id=eq.${cid}` },
        (payload) => {
          const newMsg = payload.new as DM;
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            const sender = usersRef.current.find(u => u.id === newMsg.sender_id);
            return [...prev, { ...newMsg, sender_name: sender?.name }];
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [cid, dbMissing]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => () => { recognitionRef.current?.stop(); }, []);

  const toggleMic = () => {
    if (!SpeechRecognitionAPI) return;
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'en-ZM';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      const t = e.results[0][0].transcript;
      setText(prev => prev ? prev + ' ' + t : t);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const sendMessage = async () => {
    if (!text.trim() || !cid || !currentUser) return;
    const msg = text.trim();
    const tempId = crypto.randomUUID();
    setText('');
    setMessages(prev => [...prev, {
      id: tempId, conversation_id: cid,
      sender_id: currentUser.id, text: msg,
      created_at: new Date().toISOString(),
      sender_name: currentUser.name,
    }]);
    const fail = (why: string) => {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setText(msg);
      setSendError(why);
      setTimeout(() => setSendError(''), 9000);
    };
    // Demo/expired logins have no real session, so the database would silently refuse the message.
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) { fail('Your login session has expired. Please log out and log back in to send messages.'); return; }
    const { error } = await supabase.from('direct_messages').insert({
      id: tempId, conversation_id: cid, sender_id: currentUser.id, text: msg,
    });
    if (error) {
      if (error.code === '42P01') {
        setMessages(prev => prev.filter(m => m.id !== tempId));
        setText(msg);
        setDbMissing(true);
      } else if (error.code === '42501') {
        fail('Messaging is not switched on for your account yet. Ask an admin to run the chat setup SQL.');
      } else if (error.code === '23503') {
        fail('This person could not be found. They may not have finished creating their account.');
      } else {
        fail(`Message not sent: ${error.message}`);
      }
      return;
    }
    // Let the other person know once per conversation visit so they do not have to be looking at this screen.
    if (otherUserId && !notifiedRef.current) {
      notifiedRef.current = true;
      sendNotification(otherUserId, 'chat_message', `New message from ${currentUser.name}`, msg.slice(0, 80), { fromUserId: currentUser.id });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const startLongPress = (id: string) => {
    pressTimerRef.current = setTimeout(() => setSelectedMsgId(id), 500);
  };
  const cancelLongPress = () => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
  };

  const deleteMessage = async (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
    setSelectedMsgId(null);
    await supabase.from('direct_messages').delete().eq('id', id);
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-surface-border shrink-0">
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-hover text-ink-secondary">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center font-bold text-white shrink-0"
          style={{ background: '#1B4332' }}>
          {otherUser?.imageUrl
            ? <img src={otherUser.imageUrl} alt={otherName} className="w-full h-full object-cover" />
            : <span className="text-base">{otherName[0]?.toUpperCase()}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-ink text-sm">{otherName}</p>
          {otherUser?.role && (
            <p className="text-xs text-ink-muted capitalize">{otherUser.role}</p>
          )}
        </div>
      </div>

      {loadError && (
        <div className="mx-3 mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{loadError}</div>
      )}

      {/* DB missing banner */}
      {dbMissing && (
        <div className="mx-3 mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3 mb-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-900 text-sm">Direct Messages table needed</p>
              <p className="text-xs text-amber-700 mt-0.5">Ask your admin to run the SQL below once in Supabase:</p>
            </div>
          </div>
          <button onClick={() => setShowSetup(v => !v)}
            className="text-xs font-bold text-amber-700 underline mb-2">
            {showSetup ? 'Hide SQL' : 'Show SQL'}
          </button>
          {showSetup && (
            <pre className="text-[10px] text-amber-900 bg-amber-100 rounded-xl p-3 overflow-x-auto whitespace-pre-wrap">
              {SETUP_SQL}
            </pre>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4" style={{ background: '#F9FAFB' }}
        onClick={() => { if (selectedMsgId) setSelectedMsgId(null); }}>
        {loading && !dbMissing ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : !dbMissing && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center pb-8">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center text-3xl" style={{ background: '#EBF5EF' }}>💬</div>
            <div>
              <p className="font-bold text-ink mb-1">No messages yet</p>
              <p className="text-sm text-ink-muted">Start a conversation with {otherName}</p>
            </div>
          </div>
        ) : !dbMissing ? (
          messages.map(msg => {
            const isMine = msg.sender_id === currentUser?.id;
            const isSelected = selectedMsgId === msg.id;
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[78%] flex flex-col ${isMine ? 'items-end' : 'items-start'} gap-1`}>
                  <div
                    className={`px-4 py-3 text-sm leading-relaxed select-none transition-all ${
                      isMine
                        ? 'text-white rounded-3xl rounded-br-lg'
                        : 'text-ink bg-white border border-surface-border rounded-3xl rounded-bl-lg shadow-sm'
                    } ${isSelected ? 'opacity-70 scale-95' : ''}`}
                    style={isMine ? { background: isSelected ? '#0F2D20' : '#1B4332' } : {}}
                    onTouchStart={() => isMine && startLongPress(msg.id)}
                    onTouchEnd={cancelLongPress}
                    onTouchMove={cancelLongPress}
                    onMouseDown={() => isMine && startLongPress(msg.id)}
                    onMouseUp={cancelLongPress}
                    onMouseLeave={cancelLongPress}
                  >
                    {msg.text}
                  </div>
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-[10px] text-ink-muted">
                      {format(new Date(msg.created_at), 'h:mm a')}
                    </span>
                    {isSelected && isMine && (
                      <button onClick={() => deleteMessage(msg.id)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold active:scale-95 transition-transform">
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    )}
                    {isSelected && isMine && (
                      <button onClick={() => setSelectedMsgId(null)} className="text-[10px] text-ink-muted font-semibold">
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : null}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      {!dbMissing && (
        <div className="bg-white border-t border-surface-border px-4 py-3 shrink-0">
          {listening && (
            <div className="flex items-center gap-2 mb-2 px-4 py-2 bg-danger/5 border border-danger/20 rounded-2xl">
              <span className="w-2 h-2 bg-danger rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-danger">Listening… speak now</span>
            </div>
          )}
          {sendError && (
            <div className="mb-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-xs font-semibold text-amber-800">{sendError}</p>
            </div>
          )}
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={listening ? 'Listening…' : 'Type a message…'}
                rows={1}
                className="w-full resize-none border border-surface-border rounded-3xl px-4 py-3 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary bg-surface-secondary max-h-28 overflow-y-auto"
                style={{ lineHeight: '1.5' }}
              />
            </div>
            {speechSupported && (
              <button onClick={toggleMic}
                className={`w-11 h-11 flex items-center justify-center rounded-full shrink-0 transition-all active:scale-95 ${
                  listening ? 'bg-danger text-white animate-pulse' : 'bg-surface-secondary text-ink-secondary border border-surface-border'
                }`}>
                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}
            <button onClick={sendMessage} disabled={!text.trim()}
              className="w-11 h-11 flex items-center justify-center rounded-full text-white disabled:opacity-40 shrink-0 transition-all active:scale-95"
              style={{ background: '#1B4332' }}>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
