import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Phone, User } from 'lucide-react';
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
  const dog = data.dogs.find(d => d.id === walk?.dogId);

  const isOwner = currentUser?.role === 'owner';
  const otherPerson = isOwner ? walker : owner;

  // Load messages
  useEffect(() => {
    if (!walkId) return;
    supabase
      .from('messages')
      .select('*, users(name)')
      .eq('walk_id', walkId)
      .order('created_at')
      .then(({ data: rows }) => {
        if (rows) {
          setMessages(rows.map((r: any) => ({
            ...r,
            sender_name: r.users?.name,
          })));
        }
        setLoading(false);
      });
  }, [walkId]);

  // Realtime subscribe
  useEffect(() => {
    if (!walkId) return;
    const channel = supabase
      .channel(`chat-${walkId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `walk_id=eq.${walkId}` },
        async (payload) => {
          const sender = data.users.find(u => u.id === payload.new.sender_id);
          setMessages(prev => [...prev, { ...payload.new as Message, sender_name: sender?.name }]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [walkId, data.users]);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!text.trim() || !walkId || !currentUser) return;
    const msg = text.trim();
    setText('');
    await supabase.from('messages').insert({
      walk_id: walkId,
      sender_id: currentUser.id,
      text: msg,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="flex flex-col h-screen bg-surface-secondary">
      {/* Header */}
      <div className="bg-white border-b border-surface-border px-4 py-3 flex items-center gap-3 shrink-0 shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-hover text-ink-secondary"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Avatar */}
        <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
          <User className="w-5 h-5 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-ink truncate">
            {otherPerson?.name || (isOwner ? 'Walker' : 'Owner')}
          </p>
          {dog && (
            <p className="text-xs text-ink-muted truncate">
              {dog.name}'s walk · {walk?.status}
            </p>
          )}
        </div>

        {/* Call button */}
        {otherPerson?.phone && (
          <a
            href={`tel:${otherPerson.phone}`}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors shrink-0"
          >
            <Phone className="w-4 h-4" />
          </a>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center pb-8">
            <div className="w-14 h-14 rounded-2xl bg-white border border-surface-border flex items-center justify-center">
              <span className="text-2xl">💬</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-ink mb-1">No messages yet</p>
              <p className="text-xs text-ink-muted">
                Start the conversation with {otherPerson?.name || (isOwner ? 'your walker' : 'the owner')}
              </p>
            </div>
          </div>
        ) : (
          messages.map(msg => {
            const isMine = msg.sender_id === currentUser?.id;
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  {!isMine && (
                    <span className="text-[10px] text-ink-muted px-1">{msg.sender_name}</span>
                  )}
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isMine
                        ? 'bg-primary text-white rounded-br-sm'
                        : 'bg-white border border-surface-border text-ink rounded-bl-sm'
                    }`}
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

      {/* Input */}
      <div className="bg-white border-t border-surface-border px-4 py-3 shrink-0">
        <div className="flex items-end gap-3 max-w-2xl mx-auto">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${otherPerson?.name || (isOwner ? 'walker' : 'owner')}…`}
            rows={1}
            className="flex-1 resize-none border border-surface-border rounded-xl px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 max-h-24 overflow-y-auto"
            style={{ lineHeight: '1.5' }}
          />
          <button
            onClick={sendMessage}
            disabled={!text.trim()}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
