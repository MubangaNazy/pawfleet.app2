import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Phone } from 'lucide-react';
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

export default function Chat() {
  const { walkId } = useParams<{ walkId: string }>();
  const { data, currentUser } = useApp();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const walk = data.walks.find(w => w.id === walkId);
  const walker = data.users.find(u => u.id === walk?.walkerId);
  const owner = data.users.find(u => u.id === walk?.ownerId);

  const isOwner = currentUser?.role === 'owner';
  const otherPerson = isOwner ? walker : owner;
  const otherName = otherPerson?.name || (isOwner ? 'Walker' : 'Owner');

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
          const sender = data.users.find(u => u.id === payload.new.sender_id);
          setMessages(prev => [...prev, { ...payload.new as Message, sender_name: sender?.name }]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [walkId, data.users]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!text.trim() || !walkId || !currentUser) return;
    const msg = text.trim();
    setText('');
    await supabase.from('messages').insert({ walk_id: walkId, sender_id: currentUser.id, text: msg });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
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

        {/* Avatar */}
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

        {/* Call button */}
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
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4" style={{ background: '#F9FAFB' }}>
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
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[78%] flex flex-col ${isMine ? 'items-end' : 'items-start'} gap-1`}>
                  <div
                    className={`px-4 py-3 text-sm leading-relaxed ${
                      isMine
                        ? 'text-white rounded-3xl rounded-br-lg'
                        : 'text-ink bg-white border border-surface-border rounded-3xl rounded-bl-lg shadow-sm'
                    }`}
                    style={isMine ? { background: '#1B4332' } : {}}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-ink-muted px-1">
                    {format(new Date(msg.created_at), 'h:mm a')}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="bg-white border-t border-surface-border px-4 py-3 shrink-0">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="w-full resize-none border border-surface-border rounded-3xl px-4 py-3 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary bg-surface-secondary max-h-28 overflow-y-auto"
              style={{ lineHeight: '1.5' }}
            />
          </div>
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
