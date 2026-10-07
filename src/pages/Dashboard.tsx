import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const redirect = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/auth'); return; }

      const { data } = await supabase
        .from('profiles')
        .select('role, onboarding_complete')
        .eq('id', session.user.id)
        .single();

      if (data?.role === 'pro' && !data?.onboarding_complete) {
        navigate('/onboarding');
        return;
      }

      navigate(`/profile/${session.user.id}?tab=dashboard`, { replace: true });
    };
    redirect();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[var(--color-accent-light)] border-t-[var(--color-accent)] rounded-full animate-spin" />
    </div>
  );
};

export default Dashboard;
