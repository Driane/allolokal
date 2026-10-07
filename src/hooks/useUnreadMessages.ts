import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// Partagé entre Navbar (web + natif) et BottomTabBar (natif uniquement)
export function useUnreadMessages(userId: string | undefined): number {
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!userId) { setUnread(0); return; }
    const fetchUnread = async () => {
      try {
        const { data: convs, error: convErr } = await supabase
          .from('conversations')
          .select('id')
          .or(`client_id.eq.${userId},pro_id.eq.${userId}`);
        if (convErr || !convs?.length) { setUnread(0); return; }
        const { count, error: msgErr } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .in('conversation_id', convs.map(c => c.id))
          .neq('sender_id', userId)
          .is('read_at', null);
        if (!msgErr) setUnread(count ?? 0);
      } catch {
        setUnread(0);
      }
    };
    fetchUnread();
  }, [userId, location.pathname]);

  return unread;
}
