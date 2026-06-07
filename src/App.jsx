import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import Landing from './pages/Landing.jsx';
import Apply from './pages/Apply.jsx';
import Process from './pages/Process.jsx';
import FAQ from './pages/FAQ.jsx';
import NotFound from './pages/NotFound.jsx';
import MockPay from './pages/MockPay.jsx';
import Login from './pages/Login.jsx';
import SetPassword from './pages/SetPassword.jsx';
import Account from './pages/Account.jsx';
import ReviewEvaluation from './pages/ReviewEvaluation.jsx';
import ReviewView from './pages/ReviewView.jsx';
import AppResults from './pages/AppResults.jsx';

// Прокрутка наверх при смене страницы
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Header />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/apply" element={<Apply />} />
        <Route path="/process" element={<Process />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/mock-pay" element={<MockPay />} />
        <Route path="/login" element={<Login />} />
        <Route path="/set-password" element={<SetPassword />} />
        <Route path="/account" element={<Account />} />
        <Route path="/account/review/:id" element={<ReviewEvaluation />} />
        <Route path="/account/review/:id/:reviewerId" element={<ReviewView />} />
        <Route path="/account/results/:id/:tour" element={<AppResults />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
    </>
  );
}
