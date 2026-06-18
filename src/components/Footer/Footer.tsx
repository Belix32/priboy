import { Link } from 'react-router-dom';
import { Logo } from '../Logo/Logo';
import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.grid}>
          <div className={styles.brand}>
            <Logo variant="default" />
            <p className={styles.tagline}>
              Парковка и аренда авто на юге России. Оставьте свой автомобиль в надёжном месте и наслаждайтесь поездкой.
            </p>
            <a href="tel:88001234567" className={styles.phone}>8 800 123-45-67</a>
          </div>

          <div className={styles.column}>
            <h4>Услуги</h4>
            <ul>
              <li><Link to="/search?mode=storage">Парковка авто</Link></li>
              <li><Link to="/search?mode=rental">Аренда авто</Link></li>
              <li><Link to="/map">Локации</Link></li>
            </ul>
          </div>

          <div className={styles.column}>
            <h4>Компания</h4>
            <ul>
              <li><Link to="/about">О нас</Link></li>
              <li><Link to="/help">Помощь</Link></li>
              <li><Link to="/guide">Как работает система</Link></li>
              <li><Link to="/login">Войти</Link></li>
            </ul>
          </div>

          <div className={styles.column}>
            <h4>Направления</h4>
            <ul>
              <li><Link to="/search?destination=sochi">Сочи</Link></li>
              <li><Link to="/search?destination=anapa">Анапа</Link></li>
              <li><Link to="/search?destination=gelendzhik">Геленджик</Link></li>
              <li><Link to="/search?destination=crimea">Крым</Link></li>
            </ul>
          </div>
        </div>

        <div className={styles.bottom}>
          <span>© {new Date().getFullYear()} Прибой. Все права защищены.</span>
          <span>Парковка и аренда авто на юге России</span>
        </div>
      </div>
    </footer>
  );
}
