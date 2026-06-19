import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button/Button';
import { SectionHeader } from '../../components/SectionHeader/SectionHeader';
import { StepCard } from '../../components/StepCard/StepCard';
import { DestinationCard } from '../../components/DestinationCard/DestinationCard';
import { FeatureItem } from '../../components/FeatureItem/FeatureItem';
import { Footer } from '../../components/Footer/Footer';
import { useDestinations } from '../../hooks/useDestinations';
import { HERO_IMAGE, HOW_IT_WORKS_STEPS, FEATURES } from '../../lib/travel/seed';
import styles from './TravelHome.module.css';

export function TravelHome() {
  const navigate = useNavigate();
  const { destinations, loading } = useDestinations();

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div
          className={styles.heroBg}
          style={{ backgroundImage: `url(${HERO_IMAGE})` }}
          role="img"
          aria-label="Побережье юга России"
        />
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <span className={styles.overline}>Парковка и аренда авто на юге России</span>
          <h1 className={styles.heroTitle}>Паркуйте своё авто. Арендуйте на месте</h1>
          <p className={styles.heroSubtitle}>
            Оставьте свой автомобиль в надёжном месте и наслаждайтесь поездкой на юге
          </p>
          <div className={styles.heroActions}>
            <Button
              variant="primary"
              size="large"
              className={styles.heroCta}
              onClick={() => navigate('/search?mode=storage')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18M3 9h6M3 15h6" />
              </svg>
              Парковка моего авто
            </Button>
            <Button
              variant="secondary"
              size="large"
              className={`${styles.heroCta} ${styles.heroCtaSecondary}`}
              onClick={() => navigate('/search?mode=rental')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 17h14M5 17a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l2-3h8l2 3h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2" />
              </svg>
              Аренда авто на месте
            </Button>
          </div>
          <div className={styles.trustBadges}>
            <div className={styles.trustBadge}>
              <span className={styles.trustIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </span>
              Надёжная парковка под охраной 24/7
            </div>
            <div className={styles.trustBadge}>
              <span className={styles.trustIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 17h14" />
                </svg>
              </span>
              Чистые и новые авто для аренды
            </div>
            <div className={styles.trustBadge}>
              <span className={styles.trustIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
              </span>
              Удобные локации на популярных курортах
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section} id="how-it-works">
        <div className={styles.container}>
          <SectionHeader
            title="Как это работает"
            subtitle="Четыре простых шага для комфортного отдыха на юге"
            centered
          />
          <div className={styles.stepsGrid}>
            {HOW_IT_WORKS_STEPS.map((step) => (
              <StepCard key={step.number} {...step} />
            ))}
          </div>
          <div className={styles.guideLinkWrap}>
            <Button variant="secondary" onClick={() => navigate('/guide')}>
              Подробнее о сервисе →
            </Button>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.container}>
          <SectionHeader
            title="Популярные направления"
            subtitle="Выберите курорт для вашей поездки"
            linkText="Смотреть все"
            linkTo="/search?mode=rental"
          />
          {loading ? (
            <div className={styles.loading}>
              <div className={styles.spinner} />
              <p>Загрузка направлений...</p>
            </div>
          ) : (
            <div className={styles.destinationsGrid}>
              {destinations.slice(0, 5).map((dest) => (
                <DestinationCard key={dest.id} destination={dest} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.container}>
          <SectionHeader
            title="Почему выбирают Прибой"
            subtitle="Преимущества сервиса парковки и аренды авто"
            centered
          />
          <div className={styles.featuresGrid}>
            {FEATURES.map((feature) => (
              <FeatureItem key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
