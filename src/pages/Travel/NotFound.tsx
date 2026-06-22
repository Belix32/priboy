import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button/Button';
import styles from './NotFound.module.css';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <p className={styles.code}>404</p>
        <h1 className={styles.title}>Страница не найдена</h1>
        <p className={styles.text}>
          Возможно, ссылка устарела или страница была перемещена.
        </p>
        <div className={styles.actions}>
          <Button variant="primary" onClick={() => navigate('/')}>
            На главную
          </Button>
          <Button variant="secondary" onClick={() => navigate('/search')}>
            Поиск авто
          </Button>
        </div>
      </div>
    </div>
  );
}

export default NotFound;
