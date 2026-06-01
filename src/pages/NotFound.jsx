import { Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation.jsx';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="notfound">
      <div className="code">404</div>
      <h1>{t('notFound.title')}</h1>
      <p>{t('notFound.desc')}</p>
      <Link to="/" className="btn-gold">{t('notFound.back')}</Link>
    </div>
  );
}
