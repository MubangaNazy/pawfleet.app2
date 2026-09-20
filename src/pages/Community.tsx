import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Heart, Camera, X, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';

interface PostComment {
  id: string;
  author_id: string;
  author_name: string;
  text: string;
  created_at: string;
}

interface CommunityPost {
  id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  author_image?: string;
  content: string;
  image_url?: string;
  likes: number;
  liked_by?: string[];
  comments?: PostComment[];
  created_at: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function roleLabel(role: string) {
  if (role === 'walker')    return '🦮 Walker';
  if (role === 'owner')     return '🐾 Owner';
  if (role === 'admin')     return '⚡ Admin';
  if (role === 'shopowner') return '🛍 Shop';
  if (role === 'vet')       return '🩺 Vet';
  return role;
}

const initials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

export default function Community() {
  const { currentUser } = useApp();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [dbReady, setDbReady] = useState<boolean | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    const main = document.querySelector('main');
    if (main) main.scrollTop = 0;
  }, []);

  useEffect(() => {
    supabase
      .from('community_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data: rows, error }) => {
        if (error) { setDbReady(false); return; }
        setDbReady(true);
        if (rows) setPosts(rows as CommunityPost[]);
      });

    const channel = supabase
      .channel('community-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_posts' }, payload => {
        setPosts(prev => [payload.new as CommunityPost, ...prev]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'community_posts' }, payload => {
        const updated = payload.new as CommunityPost;
        setPosts(prev => prev.map(p => p.id === updated.id
          ? { ...p, ...updated, image_url: updated.image_url ?? p.image_url }
          : p));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'community_posts' }, payload => {
        setPosts(prev => prev.filter(p => p.id !== (payload.old as { id: string }).id));
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, []);

  const base64ToBlob = (b64: string): Blob => {
    const [, data] = b64.split(',');
    const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
    return new Blob([bytes], { type: 'image/jpeg' });
  };

  const uploadPostImage = async (b64: string): Promise<string | null> => {
    try {
      const blob = base64ToBlob(b64);
      const path = `posts/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      const { data, error } = await supabase.storage.from('community-images').upload(path, blob, {
        contentType: 'image/jpeg', cacheControl: '3600', upsert: false,
      });
      if (error) return null;
      return supabase.storage.from('community-images').getPublicUrl(data.path).data.publicUrl;
    } catch { return null; }
  };

  const compressImage = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX = 800;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = reject;
      img.src = url;
    });

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setPreviewImg(compressed);
    } catch { setPostError('Could not load image. Please try a different photo.'); }
  };

  const submitPost = async () => {
    if (!draft.trim() && !previewImg) return;
    if (!currentUser) return;
    setPosting(true);
    setPostError('');

    // Upload image to Supabase Storage to avoid large payloads in the DB row
    let finalImageUrl: string | undefined;
    if (previewImg) {
      const uploaded = await uploadPostImage(previewImg);
      finalImageUrl = uploaded ?? previewImg; // fall back to base64 if bucket not set up yet
    }

    const optimisticId = crypto.randomUUID();
    const row: CommunityPost = {
      id: optimisticId,
      author_id: currentUser.id,
      author_name: currentUser.name,
      author_role: currentUser.role,
      author_image: currentUser.imageUrl || undefined,
      content: draft.trim(),
      image_url: finalImageUrl,
      likes: 0,
      liked_by: [],
      comments: [],
      created_at: new Date().toISOString(),
    };
    setPosts(prev => [row, ...prev]);
    const savedDraft = draft;
    setDraft('');
    setPreviewImg(null);
    setPosting(false);

    const { error } = await supabase.from('community_posts').insert({ ...row, id: undefined });
    if (error) {
      setPosts(prev => prev.filter(p => p.id !== optimisticId));
      setDraft(savedDraft);
      if (error.code === '42501' || error.message?.includes('policy')) {
        setPostError('Permission denied. Ask admin to run: ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY; CREATE POLICY "cp_all" ON community_posts FOR ALL TO authenticated USING (true) WITH CHECK (true);');
      } else {
        setPostError(`Post failed: ${error.message}`);
      }
    }
  };

  const deletePost = async (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    await supabase.from('community_posts').delete().eq('id', postId);
  };

  const toggleComments = (postId: string) => {
    setExpandedComments(prev => {
      const next = new Set(prev);
      next.has(postId) ? next.delete(postId) : next.add(postId);
      return next;
    });
  };

  const submitComment = async (post: CommunityPost) => {
    const text = (commentDrafts[post.id] || '').trim();
    if (!text || !currentUser) return;
    setSubmittingComment(post.id);
    const newComment: PostComment = {
      id: crypto.randomUUID(),
      author_id: currentUser.id,
      author_name: currentUser.name,
      text,
      created_at: new Date().toISOString(),
    };
    const updated = [...(post.comments || []), newComment];
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, comments: updated } : p));
    setCommentDrafts(prev => ({ ...prev, [post.id]: '' }));
    await supabase.from('community_posts').update({ comments: updated }).eq('id', post.id);
    setSubmittingComment(null);
  };

  const toggleLike = async (post: CommunityPost) => {
    if (!currentUser) return;
    const likedBy: string[] = post.liked_by || [];
    const already = likedBy.includes(currentUser.id);
    const newLikedBy = already ? likedBy.filter(id => id !== currentUser.id) : [...likedBy, currentUser.id];
    const newLikes = already ? post.likes - 1 : post.likes + 1;
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes: newLikes, liked_by: newLikedBy } : p));
    await supabase.from('community_posts').update({ likes: newLikes, liked_by: newLikedBy }).eq('id', post.id);
  };

  return (
    <div className="max-w-lg mx-auto pb-24">

      {/* Header */}
      <div className="px-5 pt-6 pb-4" style={{ background: 'linear-gradient(135deg, #071a0e 0%, #1B4332 60%, #2B8A50 100%)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.18)' }}>
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-white">Community</h1>
            <p className="text-white/55 text-[11px]">Share updates, tips &amp; photos</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">

        {/* DB not ready banner */}
        {dbReady === false && (
          <div className="px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200">
            <p className="text-xs font-bold text-amber-800 mb-1">Community table not set up</p>
            <p className="text-xs text-amber-700">Ask admin to run this in Supabase SQL editor:</p>
            <code className="block mt-1 text-[10px] bg-amber-100 rounded p-2 break-all text-amber-900">
              CREATE TABLE IF NOT EXISTS community_posts (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, author_id text, author_name text, author_role text, author_image text, content text, image_url text, likes int DEFAULT 0, liked_by text[] DEFAULT ARRAY[]::text[], comments jsonb DEFAULT '[]', created_at timestamptz DEFAULT now()); ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY; CREATE POLICY "cp_all" ON community_posts FOR ALL TO authenticated USING (true) WITH CHECK (true);
            </code>
          </div>
        )}

        {/* Compose */}
        {currentUser && (
          <div className="bg-white rounded-2xl border border-surface-border p-4">
            <div className="flex gap-3 items-start">
              <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                {currentUser.imageUrl
                  ? <img src={currentUser.imageUrl} alt="" className="w-full h-full object-cover" />
                  : initials(currentUser.name)}
              </div>
              <div className="flex-1">
                <textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  placeholder="Share a tip, photo, or update…"
                  rows={2}
                  className="w-full text-sm text-ink resize-none bg-[#F4F9F6] rounded-xl px-3 py-2.5 placeholder:text-ink-muted/60 focus:outline-none"
                />
                {previewImg && (
                  <div className="relative mt-2 rounded-xl overflow-hidden">
                    <img src={previewImg} alt="preview" className="w-full object-cover max-h-48" />
                    <button onClick={() => setPreviewImg(null)}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center">
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-between mt-2">
                  <button onClick={() => { setPostError(''); photoRef.current?.click(); }}
                    className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-[#EBF5EF]">
                    <Camera className="w-3.5 h-3.5" /> Photo
                  </button>
                  <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                  <button onClick={submitPost} disabled={posting || (!draft.trim() && !previewImg)}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white disabled:opacity-40"
                    style={{ background: '#2B8A50' }}>
                    <Send className="w-3 h-3" />
                    {posting ? 'Posting…' : 'Post'}
                  </button>
                </div>
                {postError && (
                  <p className="text-xs text-red-600 mt-1.5 px-1 leading-relaxed">{postError}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Feed */}
        {posts.length === 0 && dbReady !== false ? (
          <div className="py-16 text-center">
            <MessageCircle className="w-10 h-10 text-ink-muted mx-auto mb-3 opacity-30" />
            <p className="text-sm font-bold text-ink mb-1">Be the first to post</p>
            <p className="text-xs text-ink-muted">Share a walk photo, tip, or hello</p>
          </div>
        ) : (
          posts.map(post => {
            const liked = currentUser && (post.liked_by || []).includes(currentUser.id);
            return (
              <div key={post.id} className="bg-white rounded-2xl border border-surface-border overflow-hidden">
                {/* Author row */}
                <div className="flex items-start gap-3 p-3.5 pb-2">
                  <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                    {post.author_image
                      ? <img src={post.author_image} alt="" className="w-full h-full object-cover" />
                      : initials(post.author_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-bold text-ink truncate">{post.author_name}</span>
                      <span className="text-[10px] text-ink-muted shrink-0">{roleLabel(post.author_role)}</span>
                    </div>
                    <p className="text-[10px] text-ink-muted">{timeAgo(post.created_at)}</p>
                  </div>
                  {currentUser?.id === post.author_id && (
                    <button onClick={() => deletePost(post.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-xl text-red-400 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {post.content && (
                  <p className="px-3.5 pb-2.5 text-sm text-ink leading-relaxed">{post.content}</p>
                )}
                {post.image_url && (
                  <div className="overflow-hidden">
                    <img src={post.image_url} alt="post" className="w-full object-cover max-h-72"
                      style={{ imageRendering: 'auto' }} />
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 px-3.5 py-2 border-t border-surface-border">
                  <button onClick={() => toggleLike(post)}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors ${liked ? 'text-red-500 bg-red-50' : 'text-ink-muted hover:bg-surface-secondary'}`}>
                    <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
                    {post.likes > 0 ? post.likes : 'Like'}
                  </button>
                  <button onClick={() => toggleComments(post.id)}
                    className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg text-ink-muted hover:bg-surface-secondary transition-colors">
                    <MessageCircle className="w-3.5 h-3.5" />
                    {(post.comments?.length || 0) > 0 ? post.comments!.length : 'Comment'}
                    {expandedComments.has(post.id) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                {/* Comments */}
                {expandedComments.has(post.id) && (
                  <div className="px-3.5 pb-3 space-y-2 border-t border-surface-border pt-2">
                    {(post.comments || []).map(c => (
                      <div key={c.id} className="flex gap-2 items-start">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                          style={{ background: 'linear-gradient(135deg,#1B4332,#2B8A50)' }}>
                          {c.author_name[0]}
                        </div>
                        <div className="flex-1 bg-[#F4F9F6] rounded-xl px-3 py-2">
                          <p className="text-[10px] font-bold text-ink">{c.author_name}</p>
                          <p className="text-xs text-ink-secondary leading-relaxed">{c.text}</p>
                        </div>
                      </div>
                    ))}
                    {currentUser && (
                      <div className="flex gap-2 items-center pt-1">
                        <input
                          value={commentDrafts[post.id] || ''}
                          onChange={e => setCommentDrafts(prev => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(post); } }}
                          placeholder="Write a comment…"
                          className="flex-1 text-xs bg-[#F4F9F6] rounded-xl px-3 py-2 focus:outline-none"
                        />
                        <button onClick={() => submitComment(post)}
                          disabled={submittingComment === post.id || !commentDrafts[post.id]?.trim()}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white disabled:opacity-40 shrink-0"
                          style={{ background: '#2B8A50' }}>
                          <Send className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
