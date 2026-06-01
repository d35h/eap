import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation.jsx';

export default function Footer() {
  const { t } = useTranslation();
  const location = useLocation();

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
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
              <em>Eurasian</em> Art Platform
            </Link>
            <p>{t('footer.brandDesc')}</p>
          </div>

          <div className="footer-col">
            <h5>{t('team.teamLabel')}</h5>
            <ul>
              <li className="founder">
                <span className="fname">{t('team.member1Name')}</span>
                <span className="frole">{t('team.role1')}</span>
              </li>
              <li className="founder">
                <span className="fname">{t('team.member2Name')}</span>
                <span className="frole">{t('team.role2')}</span>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h5>{t('footer.platformHead')}</h5>
            <ul>
              <li><a onClick={() => scrollTo('opencall')}>{t('nav.opencall')}</a></li>
              <li><Link to="/process">{t('nav.process')}</Link></li>
              <li><a onClick={() => scrollTo('team')}>{t('nav.team')}</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h5>{t('footer.connectHead')}</h5>
            <ul>
              <li><a onClick={() => scrollTo('contact')}>{t('nav.contact')}</a></li>
              <li><a href="mailto:info@eap.art">info@eap.art</a></li>
              <li><a onClick={() => scrollTo('contact')}>{t('footer.subscribe')}</a></li>
              <li><Link to="/apply">{t('footer.cabinet')}</Link></li>
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
