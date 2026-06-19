import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Footer } from '../../components/Footer/Footer';
import { Button } from '../../components/Button/Button';
import { SYSTEM_GUIDE } from '../../lib/travel/content';
import infoStyles from './InfoPages.module.css';
import styles from './GuidePage.module.css';

export function GuidePage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(SYSTEM_GUIDE.nav[0].id);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    SYSTEM_GUIDE.nav.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id);
        },
        { rootMargin: '-20% 0px -60% 0px', threshold: 0 },
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveSection(id);
  };

  const statusClass: Record<string, string> = {
    pending: styles.statusPending,
    confirmed: styles.statusConfirmed,
    active: styles.statusActive,
    completed: styles.statusCompleted,
    cancelled: styles.statusCancelled,
  };

  return (
    <div className={infoStyles.page}>
      <section className={infoStyles.hero}>
        <div className={infoStyles.heroInner}>
          <span className={infoStyles.overline}>Для клиентов</span>
          <h1 className={infoStyles.heroTitle}>{SYSTEM_GUIDE.title}</h1>
          <p className={infoStyles.heroSubtitle}>{SYSTEM_GUIDE.subtitle}</p>
        </div>
      </section>

      <div className={infoStyles.container}>
        <p className={styles.intro}>{SYSTEM_GUIDE.intro}</p>

        <div className={styles.layout}>
          <nav className={styles.toc} aria-label="Содержание руководства">
            <p className={styles.tocTitle}>Содержание</p>
            {SYSTEM_GUIDE.nav.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`${styles.tocLink} ${activeSection === item.id ? styles.tocLinkActive : ''}`}
                onClick={() => scrollTo(item.id)}
              >
                <span className={styles.tocIcon} aria-hidden="true">{item.icon}</span>
                {item.title}
              </button>
            ))}
          </nav>

          <div className={styles.main}>
            {/* Platform */}
            <section id="platform" className={`${infoStyles.card} ${styles.section}`}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionIcon} aria-hidden="true">🌊</span>
                <h2 className={styles.sectionTitle}>{SYSTEM_GUIDE.platform.title}</h2>
              </div>
              {SYSTEM_GUIDE.platform.paragraphs.map((p) => (
                <p key={p.slice(0, 40)} className={styles.paragraph}>{p}</p>
              ))}
              <div className={styles.highlightGrid}>
                {SYSTEM_GUIDE.platform.highlights.map((h) => (
                  <div key={h.title} className={styles.highlightCard}>
                    <h3 className={styles.highlightTitle}>{h.title}</h3>
                    <p className={styles.highlightText}>{h.text}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Journey */}
            <section id="journey" className={`${infoStyles.card} ${styles.section}`}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionIcon} aria-hidden="true">🧭</span>
                <h2 className={styles.sectionTitle}>{SYSTEM_GUIDE.journey.title}</h2>
              </div>
              <div className={styles.timeline}>
                {SYSTEM_GUIDE.journey.steps.map((step, i) => (
                  <div key={step.title} className={styles.timelineItem}>
                    <div className={styles.timelineMarker}>{String(i + 1).padStart(2, '0')}</div>
                    <div className={styles.timelineBody}>
                      <h3 className={styles.timelineTitle}>{step.title}</h3>
                      <p className={styles.timelineDesc}>{step.description}</p>
                      {step.detail && <p className={styles.timelineDetail}>{step.detail}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Storage */}
            <section id="storage" className={`${infoStyles.card} ${styles.section}`}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionIcon} aria-hidden="true">🔒</span>
                <h2 className={styles.sectionTitle}>{SYSTEM_GUIDE.storage.title}</h2>
              </div>
              <p className={styles.paragraph}>{SYSTEM_GUIDE.storage.intro}</p>
              <ol className={styles.stepList}>
                {SYSTEM_GUIDE.storage.steps.map((s) => (
                  <li key={s} className={styles.stepListItem}>{s}</li>
                ))}
              </ol>
              <p className={styles.note}>{SYSTEM_GUIDE.storage.note}</p>
            </section>

            {/* Rental */}
            <section id="rental" className={`${infoStyles.card} ${styles.section}`}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionIcon} aria-hidden="true">🚗</span>
                <h2 className={styles.sectionTitle}>{SYSTEM_GUIDE.rental.title}</h2>
              </div>
              <p className={styles.paragraph}>{SYSTEM_GUIDE.rental.intro}</p>
              <ol className={styles.stepList}>
                {SYSTEM_GUIDE.rental.steps.map((s) => (
                  <li key={s} className={styles.stepListItem}>{s}</li>
                ))}
              </ol>
              <div className={styles.requirements}>
                {SYSTEM_GUIDE.rental.requirements.map((r) => (
                  <span key={r} className={styles.requirementTag}>{r}</span>
                ))}
              </div>
            </section>

            {/* Pricing */}
            <section id="pricing" className={`${infoStyles.card} ${styles.section}`}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionIcon} aria-hidden="true">💰</span>
                <h2 className={styles.sectionTitle}>{SYSTEM_GUIDE.pricing.title}</h2>
              </div>
              <p className={styles.paragraph}>{SYSTEM_GUIDE.pricing.intro}</p>
              <div className={styles.priceGrid}>
                {SYSTEM_GUIDE.pricing.items.map((item) => (
                  <div key={item.label} className={styles.priceRow}>
                    <div className={styles.priceLabel}>{item.label}</div>
                    <div>
                      <p className={styles.priceDesc}>{item.description}</p>
                      {item.example && <p className={styles.priceExample}>Пример: {item.example}</p>}
                    </div>
                  </div>
                ))}
              </div>
              <p className={styles.note}>{SYSTEM_GUIDE.pricing.promoNote}</p>
            </section>

            {/* Statuses */}
            <section id="statuses" className={`${infoStyles.card} ${styles.section}`}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionIcon} aria-hidden="true">📋</span>
                <h2 className={styles.sectionTitle}>{SYSTEM_GUIDE.statuses.title}</h2>
              </div>
              <p className={styles.paragraph}>{SYSTEM_GUIDE.statuses.intro}</p>
              <div className={styles.statusGrid}>
                {SYSTEM_GUIDE.statuses.items.map((s) => (
                  <div key={s.name} className={styles.statusCard}>
                    <span className={`${styles.statusName} ${statusClass[s.color]}`}>
                      {s.name}
                    </span>
                    <p className={styles.statusDesc}>{s.description}</p>
                  </div>
                ))}
              </div>
              <div className={styles.paymentBlock}>
                <h3 className={styles.paymentTitle}>Статусы оплаты</h3>
                <div className={styles.statusGrid}>
                  {SYSTEM_GUIDE.statuses.payment.map((p) => (
                    <div key={p.name} className={styles.statusCard}>
                      <span className={`${styles.statusName} ${styles.statusConfirmed}`}>{p.name}</span>
                      <p className={styles.statusDesc}>{p.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Account */}
            <section id="account" className={`${infoStyles.card} ${styles.section}`}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionIcon} aria-hidden="true">👤</span>
                <h2 className={styles.sectionTitle}>{SYSTEM_GUIDE.account.title}</h2>
              </div>
              <div className={styles.featureList}>
                {SYSTEM_GUIDE.account.features.map((f) => (
                  <div key={f.title} className={styles.featureItem}>
                    <h3 className={styles.featureItemTitle}>{f.title}</h3>
                    <p className={styles.featureItemText}>{f.text}</p>
                  </div>
                ))}
              </div>
              <div className={infoStyles.ctaRow}>
                <Button variant="primary" onClick={() => navigate('/profile')}>Открыть кабинет</Button>
                <Button variant="secondary" onClick={() => navigate('/my-trips')}>Мои поездки</Button>
              </div>
            </section>

            <div className={styles.ctaBanner}>
              <div>
                <h2 className={styles.ctaTitle}>Остались вопросы?</h2>
                <p className={styles.ctaText}>
                  Загляните в центр помощи с FAQ и формой связи — или начните бронирование прямо сейчас.
                </p>
              </div>
              <div className={styles.ctaActions}>
                <Button variant="primary" onClick={() => navigate('/search')}>Забронировать</Button>
                <Button variant="secondary" onClick={() => navigate('/help')}>Центр помощи</Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default GuidePage;
