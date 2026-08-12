import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation.jsx';

export default function Footer() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  // Прокрутить к секции на главной - работает с любого роута
  const goToSection = (id) => {
    if (location.pathname !== '/') {
      navigate('/', { state: { scrollTo: id } });
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <Link
              to="/"
              className="logo"
              onClick={() => {
                if (location.pathname === '/') window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <em>Eurasia</em> Art Platform
            </Link>
            <p>{t('footer.brandDesc')}</p>
          </div>

          <div className="footer-col">
            <h5>{t('team.teamLabel')}</h5>
            <ul>
              <li className="founder">
                <span className="fname">{t('team.member2Name')}</span>
                <span className="frole">{t('team.role2')}</span>
              </li>
              <li className="founder">
                <span className="fname">{t('team.member1Name')}</span>
                <span className="frole">{t('team.role1')}</span>
              </li>
              <li className="founder">
                <span className="fname">{t('team.member4Name')}</span>
                <span className="frole">{t('team.role4')}</span>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h5>{t('footer.platformHead')}</h5>
            <ul>
              <li><Link to="/process">{t('nav.process')}</Link></li>
              <li><a onClick={() => goToSection('team')}>{t('nav.team')}</a></li>
              <li><Link to="/faq">{t('nav.faq')}</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h5>{t('footer.connectHead')}</h5>
            <ul>
              <li><a onClick={() => goToSection('contact')}>{t('nav.contact')}</a></li>
              <li><a href="mailto:info@eap.art">info@eap.art</a></li>
              <li><a href="https://www.instagram.com/eurasia_art_platform/" target="_blank" rel="noreferrer">Instagram</a></li>
            </ul>
          </div>
        </div>

        <div className="partners-row">
          <div className="label">{t('footer.partners')}</div>
          <div className="partners-logos">
            <div className="partner-logo">Partner I</div>
            <div className="partner-logo">Partner II</div>
            <div className="partner-logo">Partner III</div>
            <div className="partner-logo">Partner IV</div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>{t('footer.copyright')}</span>
          <span>{t('footer.version')}</span>
        </div>
      </div>
    </footer>
  );
}
