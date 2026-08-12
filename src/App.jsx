import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, useLayoutEffect } from 'react';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import VersionWatcher from './components/VersionWatcher.jsx';
import Landing from './pages/Landing.jsx';
import Apply from './pages/Apply.jsx';
import Process from './pages/Process.jsx';
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

export default function App() {
  return (
    <>
      <PaperScheme />
      <ScrollToTop />
      <VersionWatcher />
      <Header />
      <div className="page-body">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/apply" element={<Apply />} />
        <Route path="/process" element={<Process />} />
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
