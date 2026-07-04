import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Phone, Mic, MicOff, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import { format } from 'date-fns';

interface Message {
  id: string;
  walk_id: string;
  sender_id: string;
  text: string;
  created_at: string;
  sender_name?: string;
}

// Web Speech API types
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

export default function Chat() {
  const { walkId } = useParams<{ walkId: string }>();
  const { data, currentUser } = useApp();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [listening, setListening] = useState(false);
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const walk = data.walks.find(w => w.id === walkId);
  const walker = data.users.find(u => u.id === walk?.walkerId);
  const owner = data.users.find(u => u.id === walk?.ownerId);

  const isOwner = currentUser?.role === 'owner';
  const otherPerson = isOwner ? walker : owner;
  const otherName = otherPerson?.name || (isOwner ? 'Walker' : 'Owner');

  const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
  const speechSupported = !!SpeechRecognitionAPI;

  useEffect(() => {
    if (!walkId) return;
    supabase
      .from('messages')
      .select('*, users(name)')
      .eq('walk_id', walkId)
      .order('created_at')
      .then(({ data: rows }) => {
        if (rows) {
          setMessages(rows.map((r: any) => ({ ...r, sender_name: r.users?.name })));
        }
        setLoading(false);
      });
  }, [walkId]);

  useEffect(() => {
    if (!walkId) return;
    const channel = supabase
      .channel(`chat-${walkId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `walk_id=eq.${walkId}` },
        async (payload) => {
          const newMsg = payload.new as Message;
          // Skip if already added optimistically by current user
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            const sender = data.users.find(u => u.id === newMsg.sender_id);
            return [...prev, { ...newMsg, sender_name: sender?.name }];
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [walkId, data.users]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clean up recognition on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const toggleMic = () => {
    if (!SpeechRecognitionAPI) return;

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'en-ZM';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0][0].transcript;
      setText(prev => prev ? prev + ' ' + transcript : transcript);
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const sendMessage = async () => {
    if (!text.trim() || !walkId || !currentUser) return;
    const msg = text.trim();
    const tempId = crypto.randomUUID();
    setText('');

    // Optimistic update — message appears immediately for sender
    setMessages(prev => [...prev, {
      id: tempId,
      walk_id: walkId,
      sender_id: currentUser.id,
      text: msg,
      created_at: new Date().toISOString(),
      sender_name: currentUser.name,
    }]);

    const { error } = await supabase.from('messages').insert({
      id: tempId, walk_id: walkId, sender_id: currentUser.id, text: msg,
    });
    if (error) console.warn('Message send failed (run SQL fix):', error.message);
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
    await supabase.from('messages').delete().eq('id', id);
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-surface-border shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-hover text-ink-secondary"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center font-bold text-white shrink-0"
          style={{ background: '#1B4332' }}>
          {otherPerson?.imageUrl
            ? <img src={otherPerson.imageUrl} alt={otherName} className="w-full h-full object-cover" />
            : <span className="text-base">{otherName[0]}</span>}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-ink text-sm">{otherName}</p>
          <div className="flex items-center gap-1 text-xs text-ink-secondary">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            <span>Online</span>
          </div>
        </div>

        {otherPerson?.phone && (
          <a
            href={`tel:${otherPerson.phone}`}
            className="w-10 h-10 flex items-center justify-center rounded-full text-white shrink-0"
            style={{ background: '#1B4332' }}
          >
            <Phone className="w-4 h-4" />
          </a>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4" style={{ background: '#F9FAFB' }}
        onClick={() => { if (selectedMsgId) setSelectedMsgId(null); }}>
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center pb-8">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center text-3xl"
              style={{ background: '#EBF5EF' }}>
              💬
            </div>
            <div>
              <p className="font-bold text-ink mb-1">No messages yet</p>
              <p className="text-sm text-ink-muted">Start chatting with {otherName}</p>
            </div>
          </div>
        ) : (
          messages.map(msg => {
            const isMine = msg.sender_id === currentUser?.id;
            const isSelected = selectedMsgId === msg.id;
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[78%] flex flex-col ${isMine ? 'items-end' : 'items-start'} gap-1`}>
                  {msg.text.startsWith('data:image') ? (
                    <div
                      className={`overflow-hidden transition-all ${isSelected ? 'opacity-70 scale-95' : ''} ${isMine ? 'rounded-3xl rounded-br-lg' : 'rounded-3xl rounded-bl-lg'}`}
                      style={{ maxWidth: 240, border: '2px solid rgba(0,0,0,0.07)' }}
                      onTouchStart={() => isMine && startLongPress(msg.id)}
                      onTouchEnd={cancelLongPress}
                      onTouchMove={cancelLongPress}
                      onMouseDown={() => isMine && startLongPress(msg.id)}
                      onMouseUp={cancelLongPress}
                      onMouseLeave={cancelLongPress}
                    >
                      <img src={msg.text} alt="Walk photo" className="w-full object-cover" style={{ maxHeight: 240 }} />
                      <div className="px-3 py-1.5 text-[10px] font-semibold"
                        style={{ background: isMine ? '#1B4332' : '#F9FAFB', color: isMine ? 'rgba(255,255,255,0.7)' : '#6B7280' }}>
                        📸 Walk photo
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`px-4 py-3 text-sm leading-relaxed select-none transition-all ${
                        isMine
                          ? 'text-white rounded-3xl rounded-br-lg'
                          : 'text-ink bg-white border border-surface-border rounded-3xl rounded-bl-lg shadow-sm'
                      } ${isSelected ? 'opacity-70 scale-95' : ''}`}
                      style={isMine ? { background: isSelected ? '#0F2D20' : '#1B4332', transform: isSelected ? 'scale(0.95)' : undefined } : {}}
                      onTouchStart={() => isMine && startLongPress(msg.id)}
                      onTouchEnd={cancelLongPress}
                      onTouchMove={cancelLongPress}
                      onMouseDown={() => isMine && startLongPress(msg.id)}
                      onMouseUp={cancelLongPress}
                      onMouseLeave={cancelLongPress}
                    >
                      {msg.text}
                    </div>
                  )}
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-[10px] text-ink-muted">
                      {format(new Date(msg.created_at), 'h:mm a')}
                    </span>
                    {isSelected && isMine && (
                      <button
                        onClick={() => deleteMessage(msg.id)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold active:scale-95 transition-transform"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    )}
                    {isSelected && isMine && (
                      <button
                        onClick={() => setSelectedMsgId(null)}
                        className="text-[10px] text-ink-muted font-semibold"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="bg-white border-t border-surface-border px-4 py-3 shrink-0">
        {listening && (
          <div className="flex items-center gap-2 mb-2 px-4 py-2 bg-danger/5 border border-danger/20 rounded-2xl">
            <span className="w-2 h-2 bg-danger rounded-full animate-pulse" />
            <span className="text-xs font-semibold text-danger">Listening… speak now</span>
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

          {/* Mic button — only shown if browser supports speech */}
          {speechSupported && (
            <button
              onClick={toggleMic}
              title={listening ? 'Stop listening' : 'Speak to type'}
              className={`w-11 h-11 flex items-center justify-center rounded-full shrink-0 transition-all active:scale-95 ${
                listening
                  ? 'bg-danger text-white animate-pulse'
                  : 'bg-surface-secondary text-ink-secondary hover:bg-surface-hover border border-surface-border'
              }`}
            >
              {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={sendMessage}
            disabled={!text.trim()}
            className="w-11 h-11 flex items-center justify-center rounded-full text-white disabled:opacity-40 shrink-0 transition-all active:scale-95"
            style={{ background: '#1B4332' }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
