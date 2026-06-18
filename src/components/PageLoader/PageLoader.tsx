import { Logo } from '../Logo/Logo';
import styles from './PageLoader.module.css';

interface PageLoaderProps {
  fullScreen?: boolean;
  message?: string;
}

export function PageLoader({ fullScreen = false, message }: PageLoaderProps) {
  return (
    <div
      className={`${styles.loader} ${fullScreen ? styles.fullScreen : ''}`}
      role="status"
      aria-live="polite"
      aria-label="Загрузка"
    >
      <div className={styles.content}>
        <div className={styles.waves} aria-hidden="true">
          <svg className={styles.waveSvg} viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path
              className={styles.wave1}
              d="M0,60 C150,100 350,20 600,60 C850,100 1050,20 1200,60 L1200,120 L0,120 Z"
            />
            <path
              className={styles.wave2}
              d="M0,75 C200,110 400,40 600,75 C800,110 1000,40 1200,75 L1200,120 L0,120 Z"
            />
            <path
              className={styles.wave3}
              d="M0,88 C250,115 450,65 600,88 C750,115 950,65 1200,88 L1200,120 L0,120 Z"
            />
          </svg>
        </div>

        <div className={styles.brandBlock}>
          <Logo variant="large" align="center" className={styles.brand} />
          <p className={styles.tagline}>
            {message || 'Парковка и аренда на юге России'}
          </p>
          <div className={styles.dots} aria-hidden="true">
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
          </div>
        </div>
      </div>
    </div>
  );
}
