import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import { Send, ArrowLeft, MessageSquare, Search, Loader2, User, Lock, CalendarPlus, MoreVertical, Ban, Flag, ShieldAlert } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';
import { confirmNative } from '../lib/nativeConfirm';
import { useModalBackButton } from '../hooks/useModalBackButton';

// ── Types ─────────────────────────────────────────────────────────────────────
interface OtherUser { id: string; full_name: string | null; avatar_url: string | null; }

interface Conversation {
  id: string;
  client_id: string;
  pro_id: string;
  last_message: string | null;
  last_message_at: string;
  created_at: string;
  client: OtherUser;
  pro: OtherUser;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7)  return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { day: '2-digit', month: 'short' });
}

function Avatar({ user, size = 10 }: { user: OtherUser; size?: number }) {
  const s = `w-${size} h-${size}`;
  return user.avatar_url
    ? <img src={user.avatar_url} className={`${s} rounded-full object-cover shrink-0`} alt="" />
    : (
      <div className={`${s} rounded-full bg-[var(--color-accent)] flex items-center justify-center text-white font-black text-sm shrink-0`}>
        {user.full_name?.charAt(0) ?? '?'}
      </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────────
const MessagesPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const withUserId = searchParams.get('with'); // auto-open conversation with this user

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [searchConv, setSearchConv] = useState('');
  const [mobileView, setMobileView]     = useState<'list' | 'chat'>('list');
  const [hasActiveBooking, setHasActiveBooking] = useState(true); // optimiste, vérifié à l'ouverture
  const [blockedByMe, setBlockedByMe] = useState<Set<string>>(new Set());
  const [blockedMe, setBlockedMe]     = useState<Set<string>>(new Set());
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // ── Fetch current user ────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { navigate('/auth'); return; }
      setCurrentUserId(user.id);
    });
  }, [navigate]);

  // ── Blocages (moi → autres, et autres → moi) ──────────────────────────────
  const fetchBlocks = useCallback(async () => {
    if (!currentUserId) return;
    const [{ data: mine }, { data: theirs }] = await Promise.all([
      supabase.from('blocked_users').select('blocked_id').eq('blocker_id', currentUserId),
      supabase.from('blocked_users').select('blocker_id').eq('blocked_id', currentUserId),
    ]);
    setBlockedByMe(new Set((mine ?? []).map(r => r.blocked_id)));
    setBlockedMe(new Set((theirs ?? []).map(r => r.blocker_id)));
  }, [currentUserId]);

  useEffect(() => { fetchBlocks(); }, [fetchBlocks]);

  // ── Fetch conversations ───────────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    if (!currentUserId) return;
    setLoadingConvs(true);
    const { data } = await supabase
      .from('conversations')
      .select(`*, client:client_id(id, full_name, avatar_url), pro:pro_id(id, full_name, avatar_url)`)
      .or(`client_id.eq.${currentUserId},pro_id.eq.${currentUserId}`)
      .order('last_message_at', { ascending: false });

    // Masque les conversations avec des utilisateurs que j'ai bloqués (mon propre choix) ;
    // celles où JE suis bloqué restent visibles, juste en lecture seule (cf. zone de saisie).
    const allConvs = (data ?? []) as unknown as Conversation[];
    const convs = allConvs.filter(c => {
      const otherId = c.client_id === currentUserId ? c.pro_id : c.client_id;
      return !blockedByMe.has(otherId);
    });
    setConversations(convs);
    setLoadingConvs(false);

    // Fetch unread counts
    if (convs.length > 0) {
      const ids = convs.map(c => c.id);
      const { data: unreadData } = await supabase
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', ids)
        .is('read_at', null)
        .neq('sender_id', currentUserId);

      const counts: Record<string, number> = {};
      for (const row of (unreadData ?? [])) {
        counts[row.conversation_id] = (counts[row.conversation_id] ?? 0) + 1;
      }
      setUnreadCounts(counts);
    }

    // Auto-open with ?with= param
    if (withUserId && convs.length > 0) {
      const target = convs.find(c => c.client_id === withUserId || c.pro_id === withUserId);
      if (target) openConversation(target);
    }
  }, [currentUserId, withUserId, blockedByMe]); // eslint-disable-line

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // ── Auto-start conversation with ?with= user ──────────────────────────────
  useEffect(() => {
    if (!withUserId || !currentUserId) return;
    const existing = conversations.find(c => c.client_id === withUserId || c.pro_id === withUserId);
    if (!existing) {
      // Need to figure out roles to create the conversation
      supabase.from('profiles').select('id, role:user_metadata->>role').eq('id', withUserId).single().then(({ data }) => {
        // Try to create conversation (upsert on unique constraint)
        const isProTarget = data?.role === 'pro' || true; // fallback: assume pro
        supabase.from('conversations')
          .upsert([isProTarget
            ? { client_id: currentUserId, pro_id: withUserId }
            : { client_id: withUserId, pro_id: currentUserId }
          ], { onConflict: 'client_id,pro_id', ignoreDuplicates: false })
          .select(`*, client:client_id(id, full_name, avatar_url), pro:pro_id(id, full_name, avatar_url)`)
          .single()
          .then(({ data: newConv }) => {
            if (newConv) {
              const conv = newConv as unknown as Conversation;
              setConversations(prev => [conv, ...prev.filter(c => c.id !== conv.id)]);
              openConversation(conv);
            }
          });
      });
    }
  }, [withUserId, currentUserId, conversations.length]); // eslint-disable-line

  // ── Check active booking between two users ────────────────────────────────
  const checkActiveBooking = useCallback(async (conv: Conversation): Promise<boolean> => {
    const { data } = await supabase
      .from('bookings')
      .select('id')
      .eq('client_id', conv.client_id)
      .eq('pro_id', conv.pro_id)
      .neq('status', 'cancelled')
      .limit(1);
    return (data?.length ?? 0) > 0;
  }, []);

  // ── Open a conversation ───────────────────────────────────────────────────
  const openConversation = useCallback(async (conv: Conversation) => {
    setActiveConv(conv);
    setMobileView('chat');
    setLoadingMsgs(true);
    setMessages([]);
    setHasActiveBooking(true); // reset optimiste

    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true });

    setMessages((data ?? []) as Message[]);
    setLoadingMsgs(false);

    // Vérifier si une réservation active existe
    const active = await checkActiveBooking(conv);
    setHasActiveBooking(active);

    // Mark unread as read
    if (currentUserId) {
      await supabase.from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conv.id)
        .neq('sender_id', currentUserId)
        .is('read_at', null);
      setUnreadCounts(prev => ({ ...prev, [conv.id]: 0 }));
    }

    inputRef.current?.focus();
  }, [currentUserId]);

  // ── Realtime : new messages ───────────────────────────────────────────────
  useEffect(() => {
    if (!activeConv) return;

    const channel = supabase
      .channel(`msgs-${activeConv.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${activeConv.id}`,
      }, async (payload) => {
        const newMsg = payload.new as Message;
        setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        // Auto-mark as read if we're looking at this conversation
        if (currentUserId && newMsg.sender_id !== currentUserId) {
          await supabase.from('messages')
            .update({ read_at: new Date().toISOString() })
            .eq('id', newMsg.id);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConv?.id, currentUserId]); // eslint-disable-line

  // Realtime : new conversations or updates
  useEffect(() => {
    if (!currentUserId) return;
    const channel = supabase
      .channel(`convs-${currentUserId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        fetchConversations();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUserId, fetchConversations]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!input.trim() || !activeConv || !currentUserId || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);

    const optimisticMsg: Message = {
      id: `opt-${Date.now()}`, conversation_id: activeConv.id,
      sender_id: currentUserId, content, read_at: null,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);

    const { data, error } = await supabase.from('messages').insert([{
      conversation_id: activeConv.id,
      sender_id: currentUserId,
      content,
    }]).select().single();

    if (!error && data) {
      setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? data as Message : m));
    } else {
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const getOther = (conv: Conversation): OtherUser =>
    conv.client_id === currentUserId ? conv.pro : conv.client;

  const isBlocked = activeConv
    ? (blockedByMe.has(getOther(activeConv).id) || blockedMe.has(getOther(activeConv).id))
    : false;

  const blockUser = async () => {
    if (!activeConv || !currentUserId) return;
    const other = getOther(activeConv);
    if (!await confirmNative({
      message: t('messages.block_confirm', 'Bloquer cet utilisateur ? Vous ne verrez plus ses messages et il ne pourra plus vous en envoyer.'),
      danger: true,
    })) return;
    await supabase.from('blocked_users').insert({ blocker_id: currentUserId, blocked_id: other.id });
    setBlockedByMe(prev => new Set(prev).add(other.id));
    setUserMenuOpen(false);
    setActiveConv(null);
    setMobileView('list');
  };

  const filtered = conversations.filter(c => {
    const other = getOther(c);
    return !searchConv.trim() || other.full_name?.toLowerCase().includes(searchConv.toLowerCase());
  });

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-4rem)] xl:h-[calc(100vh-6rem)] flex bg-[var(--color-bg-primary)]">

      {/* ══ CONVERSATION LIST ══════════════════════════════════════════════ */}
      <aside className={`
        flex flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)]
        ${activeConv ? 'hidden lg:flex lg:w-80 xl:w-96 shrink-0' : 'flex w-full lg:w-80 xl:w-96 shrink-0'}
        ${mobileView === 'chat' ? 'hidden lg:flex' : 'flex'}
      `}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--color-border)] shrink-0">
          <h1 className="text-xl font-black italic uppercase tracking-tighter text-[var(--color-text-main)] flex items-center gap-3">
            <MessageSquare size={20} className="text-[var(--color-accent)]" />
            {t('messages.title', 'Messages')}
            {totalUnread > 0 && (
              <span className="text-[9px] font-black bg-[var(--color-accent)] text-white px-2 py-0.5 rounded-full">
                {totalUnread}
              </span>
            )}
          </h1>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-[var(--color-border)] shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input value={searchConv} onChange={e => setSearchConv(e.target.value)}
              placeholder={t('messages.search', 'Rechercher...')}
              className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl py-2.5 pl-9 pr-4 text-sm text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent)]/50 transition-colors" />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-[var(--color-accent)]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <MessageSquare size={36} className="text-[var(--color-text-muted)] mb-3 opacity-40" />
              <p className="text-sm font-black text-[var(--color-text-muted)] uppercase tracking-widest">
                {searchConv ? t('messages.no_results', 'Aucun résultat') : t('messages.empty', 'Aucune conversation')}
              </p>
              {!searchConv && (
                <p className="text-xs text-[var(--color-text-muted)] mt-2 italic leading-relaxed">
                  {t('messages.empty_hint', 'Visitez le profil d\'un pro pour démarrer une conversation.')}
                </p>
              )}
            </div>
          ) : filtered.map(conv => {
            const other = getOther(conv);
            const unread = unreadCounts[conv.id] ?? 0;
            const isActive = activeConv?.id === conv.id;

            return (
              <button key={conv.id} onClick={() => openConversation(conv)}
                className={`w-full flex items-center gap-4 px-5 py-4 text-left border-b border-[var(--color-border)] transition-colors cursor-pointer border-l-2 ${
                  isActive
                    ? 'bg-[var(--color-accent-light)] border-l-[var(--color-accent)]'
                    : 'bg-transparent border-l-transparent hover:bg-[var(--color-bg-tertiary)]'
                }`}>
                <div className="relative shrink-0">
                  <Avatar user={other} size={10} />
                  {unread > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--color-accent)] text-white text-[8px] font-black rounded-full flex items-center justify-center">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <span className={`text-sm font-black truncate ${isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-main)]'}`}>
                      {other.full_name ?? t('messages.unknown', 'Utilisateur')}
                    </span>
                    <span className="text-[9px] text-[var(--color-text-muted)] shrink-0 ml-2">
                      {formatTime(conv.last_message_at)}
                    </span>
                  </div>
                  <p className={`text-xs truncate ${unread > 0 ? 'font-bold text-[var(--color-text-main)]' : 'text-[var(--color-text-muted)]'}`}>
                    {conv.last_message ?? t('messages.no_message', 'Démarrer la conversation')}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ══ CHAT WINDOW ════════════════════════════════════════════════════ */}
      <main className={`flex-1 flex flex-col min-w-0 ${mobileView === 'list' ? 'hidden lg:flex' : 'flex'}`}>

        {!activeConv ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <MessageSquare size={48} className="text-[var(--color-text-muted)] mb-4 opacity-30" />
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-[var(--color-text-muted)] mb-2">
              {t('messages.select_conv', 'Sélectionnez une conversation')}
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] max-w-xs italic">
              {t('messages.select_hint', 'Choisissez une conversation dans la liste ou visitez le profil d\'un pro pour en démarrer une.')}
            </p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-4 px-5 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] shrink-0">
              <button onClick={() => { setMobileView('list'); setActiveConv(null); }}
                className="lg:hidden p-2 rounded-xl bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] border-none cursor-pointer">
                <ArrowLeft size={18} />
              </button>
              <Link to={`/profile/${getOther(activeConv).id}`} className="flex items-center gap-3 no-underline group flex-1 min-w-0">
                <Avatar user={getOther(activeConv)} size={10} />
                <div className="min-w-0">
                  <p className="text-sm font-black text-[var(--color-text-main)] group-hover:text-[var(--color-accent)] transition-colors truncate">
                    {getOther(activeConv).full_name ?? '—'}
                  </p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                    {t('messages.view_profile', 'Voir le profil →')}
                  </p>
                </div>
              </Link>

              {/* Menu options — signaler / bloquer */}
              <div className="relative shrink-0">
                <button onClick={() => setUserMenuOpen(o => !o)}
                  className="p-2 rounded-xl bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] border-none cursor-pointer">
                  <MoreVertical size={18} />
                </button>
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-52 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden z-20">
                      <button onClick={() => { setUserMenuOpen(false); setReportModalOpen(true); }}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-main)] border-none bg-transparent cursor-pointer">
                        <Flag size={14} /> {t('messages.report_user', 'Signaler')}
                      </button>
                      {!blockedByMe.has(getOther(activeConv).id) && (
                        <button onClick={blockUser}
                          className="w-full flex items-center gap-3 px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 border-none bg-transparent cursor-pointer">
                          <Ban size={14} /> {t('messages.block_user', 'Bloquer')}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {isBlocked && (
              <div className="flex items-center gap-3 px-5 py-3 bg-red-500/10 border-b border-red-500/20 shrink-0">
                <ShieldAlert size={16} className="text-red-500 shrink-0" />
                <p className="text-[11px] font-bold text-red-500">
                  {blockedByMe.has(getOther(activeConv).id)
                    ? t('messages.you_blocked', 'Vous avez bloqué cet utilisateur.')
                    : t('messages.blocked_you', 'Cet utilisateur vous a bloqué.')}
                </p>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-3">
              {loadingMsgs ? (
                <div className="flex justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-[var(--color-accent)]" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] flex items-center justify-center mb-4">
                    <MessageSquare size={24} className="text-[var(--color-text-muted)] opacity-50" />
                  </div>
                  <p className="text-sm text-[var(--color-text-muted)] font-bold">
                    {t('messages.start_conversation', 'Envoyez un message pour commencer')}
                  </p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {messages.map(msg => {
                    const isMine = msg.sender_id === currentUserId;
                    return (
                      <m.div key={msg.id}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        {!isMine && (
                          <div className="w-7 h-7 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-white font-black text-xs mr-2 shrink-0 mt-auto">
                            {getOther(activeConv).full_name?.charAt(0) ?? <User size={12} />}
                          </div>
                        )}
                        <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                          <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                            isMine
                              ? 'bg-[var(--color-accent)] text-white rounded-br-md'
                              : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-main)] border border-[var(--color-border)] rounded-bl-md'
                          }`}>
                            {msg.content}
                          </div>
                          <span className="text-[9px] text-[var(--color-text-muted)] px-1">
                            {formatTime(msg.created_at)}
                            {isMine && msg.read_at && <span className="ml-1">· {t('messages.read', 'Lu')}</span>}
                          </span>
                        </div>
                      </m.div>
                    );
                  })}
                </AnimatePresence>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input — verrouillé si pas de réservation active */}
            <div className="px-4 sm:px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] shrink-0">
              {isBlocked ? (
                <div className="flex items-center gap-4 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-2xl px-5 py-4">
                  <Ban size={18} className="text-red-500 shrink-0" />
                  <p className="text-xs font-black text-[var(--color-text-muted)] uppercase tracking-widest">
                    {t('messages.cannot_send_blocked', 'Envoi de message désactivé')}
                  </p>
                </div>
              ) : !hasActiveBooking ? (
                <div className="flex items-center gap-4 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-2xl px-5 py-4">
                  <Lock size={18} className="text-[var(--color-text-muted)] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-0.5">
                      {t('messages.locked_title', 'Messagerie réservée aux réservations actives')}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-muted)] italic">
                      {t('messages.locked_hint', 'Réservez ce prestataire pour échanger des messages.')}
                    </p>
                  </div>
                  <Link to="/findpro"
                    className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-[var(--color-accent)] text-white font-black text-[9px] uppercase tracking-widest rounded-xl no-underline hover:bg-[var(--color-accent-hover)] transition-colors">
                    <CalendarPlus size={12} />
                    {t('messages.locked_cta', 'Réserver')}
                  </Link>
                </div>
              ) : (
                <>
                  <div className="flex items-end gap-3 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-2xl px-4 py-3 focus-within:border-[var(--color-accent)]/50 transition-colors">
                    <input ref={inputRef} value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={t('messages.placeholder', 'Écrivez un message...')}
                      className="flex-1 bg-transparent text-sm text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] outline-none resize-none"
                      maxLength={2000}
                    />
                    <button onClick={sendMessage}
                      disabled={!input.trim() || sending}
                      className={`p-2 rounded-xl transition-all border-none cursor-pointer shrink-0 ${
                        input.trim() && !sending
                          ? 'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]'
                          : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] cursor-not-allowed'
                      }`}>
                      {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    </button>
                  </div>
                  <p className="text-[9px] text-[var(--color-text-muted)] mt-1.5 text-right">
                    {t('messages.enter_hint', 'Entrée pour envoyer')}
                  </p>
                </>
              )}
            </div>
          </>
        )}
      </main>

      {reportModalOpen && activeConv && currentUserId && (
        <ReportUserModal
          reporterId={currentUserId}
          reportedId={getOther(activeConv).id}
          conversationId={activeConv.id}
          onClose={() => setReportModalOpen(false)}
        />
      )}
    </div>
  );
};

// ── Signaler un utilisateur ───────────────────────────────────────────────────
const REPORT_REASONS = [
  'Comportement inapproprié',
  'Contenu offensant ou injurieux',
  'Spam ou arnaque',
  'Harcèlement',
  'Autre',
];

interface ReportUserModalProps {
  reporterId: string;
  reportedId: string;
  conversationId: string;
  onClose: () => void;
}

const ReportUserModal: React.FC<ReportUserModalProps> = ({ reporterId, reportedId, conversationId, onClose }) => {
  const { t } = useTranslation();
  useModalBackButton(true, onClose);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!reason) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('user_reports').insert({
        reporter_id: reporterId,
        reported_id: reportedId,
        conversation_id: conversationId,
        reason,
        details: details.trim() || null,
      });
      if (error) throw error;
      setDone(true);
    } catch (err) {
      console.error(err);
      alert(t('messages.report_error', "Erreur lors de l'envoi du signalement."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-20 xl:pt-28 pb-8 bg-black/90 backdrop-blur-md overflow-y-auto">
      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-7 right-7 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] bg-transparent border-none cursor-pointer">
          <Flag size={20} />
        </button>

        {done ? (
          <div className="text-center py-6">
            <ShieldAlert size={32} className="text-[var(--color-accent)] mx-auto mb-4" />
            <h3 className="text-lg font-black uppercase tracking-tight text-[var(--color-text-main)] mb-2">
              {t('messages.report_sent_title', 'Signalement envoyé')}
            </h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-6">
              {t('messages.report_sent_desc', 'Notre équipe va examiner ce signalement.')}
            </p>
            <button onClick={onClose} className="px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-[var(--color-accent)] text-white border-none cursor-pointer">
              {t('common.close', 'Fermer')}
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-xl font-black italic uppercase tracking-tighter text-[var(--color-text-main)] mb-1">
              {t('messages.report_title', 'Signaler cet utilisateur')}
            </h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-6">
              {t('messages.report_subtitle', 'Notre équipe examinera ce signalement.')}
            </p>

            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-accent)] mb-2">
              {t('messages.report_reason_label', 'Motif')}
            </label>
            <select value={reason} onChange={e => setReason(e.target.value)}
              className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-2xl p-4 text-[var(--color-text-main)] text-sm outline-none mb-4 cursor-pointer">
              <option value="" disabled>{t('messages.report_reason_placeholder', 'Sélectionnez un motif')}</option>
              {REPORT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>

            <textarea
              value={details}
              onChange={e => setDetails(e.target.value)}
              placeholder={t('messages.report_details_placeholder', 'Détails (optionnel)...')}
              className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-2xl p-4 text-[var(--color-text-main)] text-sm outline-none resize-none mb-6 min-h-[100px]"
            />

            <button
              onClick={submit}
              disabled={!reason || submitting}
              className="w-full bg-red-600 hover:bg-red-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all disabled:opacity-30 flex items-center justify-center gap-3 border-none cursor-pointer"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : t('messages.report_submit', 'Envoyer le signalement')}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;
