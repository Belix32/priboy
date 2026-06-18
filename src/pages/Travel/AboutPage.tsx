import { useNavigate } from 'react-router-dom';
import { Footer } from '../../components/Footer/Footer';
import { Button } from '../../components/Button/Button';
import { StepCard } from '../../components/StepCard/StepCard';
import { ABOUT_CONTENT } from '../../lib/travel/content';
import { HOW_IT_WORKS_STEPS } from '../../lib/travel/seed';
import infoStyles from './InfoPages.module.css';
import styles from './AboutPage.module.css';

export function AboutPage() {
  const navigate = useNavigate();
  const { title, subtitle, intro, mission, values, destinations } = ABOUT_CONTENT;

  return (
    <div className={infoStyles.page}>
      <section className={infoStyles.hero}>
        <div className={infoStyles.heroInner}>
          <span className={infoStyles.overline}>О компании</span>
          <h1 className={infoStyles.heroTitle}>{title}</h1>
          <p className={infoStyles.heroSubtitle}>{subtitle}</p>
        </div>
      </section>

      <div className={infoStyles.container}>
        <div className={styles.introBlock}>
          <p className={styles.intro}>{intro}</p>
          <p className={styles.mission}>{mission}</p>
        </div>

        <section className={infoStyles.card}>
          <h2 className={infoStyles.cardTitle}>Наши принципы</h2>
          <div className={styles.valuesGrid}>
            {values.map((item) => (
              <div key={item.title} className={styles.valueCard}>
                <h3 className={styles.valueTitle}>{item.title}</h3>
                <p className={styles.valueText}>{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={infoStyles.card}>
          <h2 className={infoStyles.cardTitle}>Кратко о сервисе</h2>
          <div className={styles.stepsGrid}>
            {HOW_IT_WORKS_STEPS.map((step) => (
              <StepCard key={step.number} {...step} />
            ))}
          </div>
          <div className={infoStyles.ctaRow}>
            <Button variant="primary" onClick={() => navigate('/guide')}>
              Подробное руководство
            </Button>
          </div>
        </section>

        <section className={infoStyles.card}>
          <h2 className={infoStyles.cardTitle}>Где мы работаем</h2>
          <p className={styles.destinationsIntro}>
            Сервис доступен на главных курортах юга России — выберите направление и забронируйте онлайн:
          </p>
          <div className={styles.destinations}>
            {destinations.map((name) => (
              <span key={name} className={styles.destinationTag}>
                {name}
              </span>
            ))}
          </div>
          <div className={infoStyles.ctaRow}>
            <Button variant="primary" onClick={() => navigate('/map')}>
              Смотреть на карте
            </Button>
            <Button variant="secondary" onClick={() => navigate('/search')}>
              Найти авто
            </Button>
          </div>
        </section>

        <section className={styles.ctaBanner}>
          <div>
            <h2 className={styles.ctaTitle}>Готовы к поездке на море?</h2>
            <p className={styles.ctaText}>
              Забронируйте парковку и аренду за пару минут — без звонков и очередей
            </p>
          </div>
          <Button variant="primary" size="large" onClick={() => navigate('/search?mode=storage')}>
            Начать
          </Button>
        </section>
      </div>

      <Footer />
    </div>
  );
}

export default AboutPage;
