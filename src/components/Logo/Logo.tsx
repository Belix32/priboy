import styles from './Logo.module.css';

interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
  textClassName?: string;
  variant?: 'default' | 'hero';
}

export function Logo({
  size = 36,
  showText = true,
  className = '',
  textClassName = '',
  variant = 'default',
}: LogoProps) {
  return (
    <span className={`${styles.logo} ${className}`}>
      <img
        src="/images/logo.png"
        alt=""
        width={size}
        height={size}
        className={`${styles.mark} ${variant === 'hero' ? styles.markHero : ''}`}
        aria-hidden="true"
      />
      {showText && (
        <span
          className={`${styles.text} ${variant === 'hero' ? styles.textHero : ''} ${textClassName}`}
        >
          Прибой
        </span>
      )}
    </span>
  );
}
