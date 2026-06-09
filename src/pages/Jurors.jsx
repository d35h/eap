import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { isSupabaseConfigured } from '../lib/supabase.js';
import JuryManager from '../components/JuryManager.jsx';

// Admin-only juror management as a standalone page (deep-linkable).
// The cabinet renders <JuryManager> inline; this is the routed fallback.
export default function Jurors() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const isAdmin = user?.app_metadata?.role === 'admin';

  useEffect(() => {
    if (loading || !isSupabaseConfigured()) return;
    if (!user) navigate('/login');
    else if (!isAdmin) navigate('/account');
  }, [user, loading, isAdmin, navigate]);

  if (!isSupabaseConfigured() || loading || !user || !isAdmin) return null;

  return (
    <main className="apply-page account-page">
      <div className="container">
        <Link to="/account" className="review-back">← Панель управления</Link>
        <JuryManager />
      </div>
    </main>
  );
}
