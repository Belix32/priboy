import styles from './Logo.module.css';

interface LogoProps {
  variant?: 'default' | 'hero' | 'large';
  className?: string;
  align?: 'left' | 'center';
}

export function Logo({
  variant = 'default',
  className = '',
  align = 'left',
}: LogoProps) {
  return (
    <span
      className={[
        styles.brand,
        styles[variant],
        align === 'center' ? styles.center : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className={styles.title}>Прибой</span>
      <span className={styles.waveLine} aria-hidden="true">
        <span className={styles.waveShimmer} />
      </span>
    </span>
  );
}
