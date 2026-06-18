import { Link } from 'react-router-dom';
import styles from './SectionHeader.module.css';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  linkText?: string;
  linkTo?: string;
  centered?: boolean;
}

export function SectionHeader({ title, subtitle, linkText, linkTo, centered }: SectionHeaderProps) {
  return (
    <div className={`${styles.sectionHeader} ${centered ? styles.centered : ''}`}>
      <div className={styles.textBlock}>
        <h2 className={styles.title}>{title}</h2>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {linkText && linkTo && (
        <Link to={linkTo} className={styles.link}>{linkText}</Link>
      )}
    </div>
  );
}
