import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useLayoutEffect } from 'react';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import VersionWatcher from './components/VersionWatcher.jsx';
import Landing from './pages/Landing.jsx';
import Apply from './pages/Apply.jsx';
import Process from './pages/Process.jsx';
import Prizes from './pages/Prizes.jsx';
import FAQ from './pages/FAQ.jsx';
import NotFound from './pages/NotFound.jsx';
import MockPay from './pages/MockPay.jsx';
import Login from './pages/Login.jsx';
import SetPassword from './pages/SetPassword.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import Account from './pages/Account.jsx';
import ReviewEvaluation from './pages/ReviewEvaluation.jsx';
import ReviewView from './pages/ReviewView.jsx';
import AppResults from './pages/AppResults.jsx';
import ApplicationDetail from './pages/ApplicationDetail.jsx';
import Jurors from './pages/Jurors.jsx';
import { takeAuthCallbackRoute } from './lib/authCallback.js';
import { supabase } from './lib/supabase.js';

// The light scheme covers the whole product now, cabinet included: signing in
// used to drop you into the old dark theme mid-session, which read as a
// different site. The cabinet carries its own class for the places where a
// dense working surface wants tighter treatment than an editorial page.
const CABINET = /^\/account(\/|$)/;

function PaperScheme() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    const paper = true;
    document.documentElement.classList.toggle('cabinet', CABINET.test(pathname));
    document.documentElement.classList.toggle('paper', paper);
    // The landing drops the wordmark, since you are already there. Every other
    // page needs it - it is the way back.
    document.documentElement.classList.toggle('paper-home', paper && pathname === '/');
    return () => {
      document.documentElement.classList.remove('paper');
      document.documentElement.classList.remove('paper-home');
      document.documentElement.classList.remove('cabinet');
    };
  }, [pathname]);
  return null;
}

// On route change, jump to the top of the new page INSTANTLY. The global
// `scroll-behavior: smooth` is for in-page anchor links — for page navigation it
// would animate the reset (landing you mid-page), so we override it to 'auto'
// here. useLayoutEffect runs before paint, so there's no flash of the old scroll.
function ScrollToTop() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    if (window.location.hash) return; // let anchor targets handle their own scroll
    const html = document.documentElement;
    const prev = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    html.style.scrollBehavior = prev;
  }, [pathname]);
  return null;
}

// An invite or reset link that Supabase redirected to the wrong page still
// carries its session; send it on to the page that can use it, so a juror who
// was invited can actually set a password instead of landing on the home page.
//
// The move has to wait for the session. Supabase delivers it in the URL
// fragment and reads that fragment asynchronously, so navigating on mount
// rewrote the URL without it and the session was destroyed before it existed -
// which is what "Auth session missing!" was, on the password form. We move only
// once the session is really there, and carry the fragment along if it is not.
function AuthCallbackRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    const route = takeAuthCallbackRoute();
    if (!route || !supabase) return;

    let moved = false;
    const go = () => {
      if (moved || window.location.pathname === route) return;
      moved = true;
      navigate({ pathname: route, hash: window.location.hash }, { replace: true });
    };

    // getSession resolves after the client has finished reading the fragment.
    supabase.auth.getSession().then(({ data }) => { if (data?.session) go(); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { if (session) go(); });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);
  return null;
}

export default function App() {
  return (
    <>
      <AuthCallbackRedirect />
      <PaperScheme />
      <ScrollToTop />
      <VersionWatcher />
      <Header />
      <div className="page-body">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/apply" element={<Apply />} />
        <Route path="/process" element={<Process />} />
        <Route path="/prizes" element={<Prizes />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/mock-pay" element={<MockPay />} />
        <Route path="/login" element={<Login />} />
        <Route path="/set-password" element={<SetPassword />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/account" element={<Account />} />
        <Route path="/account/review/:id" element={<ReviewEvaluation />} />
        <Route path="/account/review/:id/:reviewerId" element={<ReviewView />} />
        <Route path="/account/review/:id/:reviewerId/:tour" element={<ReviewView />} />
        <Route path="/account/results/:id/:tour" element={<AppResults />} />
        <Route path="/account/application/:id" element={<ApplicationDetail />} />
        <Route path="/account/jurors" element={<Jurors />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </div>
      <Footer />
    </>
  );
}
