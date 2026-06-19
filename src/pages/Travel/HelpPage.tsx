import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Footer } from '../../components/Footer/Footer';
import { Button } from '../../components/Button/Button';
import { HELP_FAQ, HELP_CONTACT_TOPICS } from '../../lib/travel/content';
import infoStyles from './InfoPages.module.css';
import styles from './HelpPage.module.css';

const FAQ_CATEGORIES = [...new Set(HELP_FAQ.map((item) => item.category))];

export function HelpPage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<string>('Все');
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [formSent, setFormSent] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    topic: HELP_CONTACT_TOPICS[0],
    message: '',
  });

  const filteredFaq =
    activeCategory === 'Все'
      ? HELP_FAQ
      : HELP_FAQ.filter((item) => item.category === activeCategory);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Прибой: ${form.topic}`);
    const body = encodeURIComponent(
      `Имя: ${form.name}\nEmail: ${form.email}\nТема: ${form.topic}\n\n${form.message}`,
    );
    window.location.href = `mailto:support@priboi.ru?subject=${subject}&body=${body}`;
    setFormSent(true);
  };

  return (
    <div className={infoStyles.page}>
      <section className={infoStyles.hero}>
        <div className={infoStyles.heroInner}>
          <span className={infoStyles.overline}>Центр помощи</span>
          <h1 className={infoStyles.heroTitle}>Помощь и поддержка</h1>
          <p className={infoStyles.heroSubtitle}>
            Ответы на частые вопросы, инструкции по бронированию и форма связи с нашей командой
          </p>
        </div>
      </section>

      <div className={infoStyles.container}>
        <div className={infoStyles.grid}>
          <div className={infoStyles.main}>
            <div className={infoStyles.card}>
              <h2 className={infoStyles.cardTitle}>Частые вопросы</h2>
              <div className={styles.categories}>
                <button
                  type="button"
                  className={`${styles.categoryBtn} ${activeCategory === 'Все' ? styles.categoryActive : ''}`}
                  onClick={() => setActiveCategory('Все')}
                >
                  Все
                </button>
                {FAQ_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`${styles.categoryBtn} ${activeCategory === cat ? styles.categoryActive : ''}`}
                    onClick={() => {
                      setActiveCategory(cat);
                      setOpenIndex(0);
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className={styles.faqList}>
                {filteredFaq.map((item, index) => {
                  const isOpen = openIndex === index;
                  return (
                    <div key={item.question} className={styles.faqItem}>
                      <button
                        type="button"
                        className={styles.faqQuestion}
                        aria-expanded={isOpen}
                        onClick={() => setOpenIndex(isOpen ? null : index)}
                      >
                        <span>{item.question}</span>
                        <span className={`${styles.faqIcon} ${isOpen ? styles.faqIconOpen : ''}`} aria-hidden="true">
                          +
                        </span>
                      </button>
                      {isOpen && <div className={styles.faqAnswer}>{item.answer}</div>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={infoStyles.card} id="contact-form">
              <h2 className={infoStyles.cardTitle}>Написать в поддержку</h2>
              <p className={styles.formIntro}>
                Не нашли ответ? Заполните форму — откроется письмо на наш email, и мы ответим в течение рабочего дня.
              </p>
              {formSent ? (
                <div className={styles.success}>
                  <p>Спасибо! Если почтовый клиент не открылся, напишите нам на <a href="mailto:support@priboi.ru">support@priboi.ru</a></p>
                  <Button variant="outline" size="small" onClick={() => setFormSent(false)}>
                    Отправить ещё
                  </Button>
                </div>
              ) : (
                <form className={styles.form} onSubmit={handleSubmit}>
                  <div className={styles.formRow}>
                    <label className={styles.label}>
                      Имя
                      <input
                        className={styles.input}
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Как к вам обращаться"
                      />
                    </label>
                    <label className={styles.label}>
                      Email
                      <input
                        className={styles.input}
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="your@email.ru"
                      />
                    </label>
                  </div>
                  <label className={styles.label}>
                    Тема обращения
                    <select
                      className={styles.input}
                      value={form.topic}
                      onChange={(e) => setForm({ ...form, topic: e.target.value })}
                    >
                      {HELP_CONTACT_TOPICS.map((topic) => (
                        <option key={topic} value={topic}>
                          {topic}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.label}>
                    Сообщение
                    <textarea
                      className={styles.textarea}
                      required
                      rows={5}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="Опишите ваш вопрос или проблему"
                    />
                  </label>
                  <Button type="submit" variant="primary">
                    Отправить сообщение
                  </Button>
                </form>
              )}
            </div>
          </div>

          <aside className={infoStyles.sidebar}>
            <div className={infoStyles.contactCard}>
              <h3 className={infoStyles.cardTitle}>Связаться с нами</h3>
              <a href="tel:88001234567" className={infoStyles.contactItem}>
                <span className={infoStyles.contactIcon} aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </span>
                <span>
                  <div className={infoStyles.contactLabel}>Телефон</div>
                  <div className={infoStyles.contactValue}>8 800 123-45-67</div>
                </span>
              </a>
              <a href="mailto:support@priboi.ru" className={infoStyles.contactItem}>
                <span className={infoStyles.contactIcon} aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M22 6l-10 7L2 6" />
                  </svg>
                </span>
                <span>
                  <div className={infoStyles.contactLabel}>Email</div>
                  <div className={infoStyles.contactValue}>support@priboi.ru</div>
                </span>
              </a>
              <div className={infoStyles.contactItem}>
                <span className={infoStyles.contactIcon} aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                </span>
                <span>
                  <div className={infoStyles.contactLabel}>Режим работы</div>
                  <div className={infoStyles.contactValue}>Круглосуточно, 7 дней в неделю</div>
                </span>
              </div>
            </div>

            <div className={infoStyles.contactCard}>
              <h3 className={infoStyles.cardTitle}>Быстрые ссылки</h3>
              <ul className={styles.quickLinks}>
                <li><Link to="/search?mode=rental">Забронировать аренду</Link></li>
                <li><Link to="/search?mode=storage">Забронировать парковку</Link></li>
                <li><Link to="/guide">Как это работает</Link></li>
                <li><Link to="/about">О сервисе</Link></li>
                <li><Link to="/profile">Личный кабинет</Link></li>
              </ul>
              <div className={infoStyles.ctaRow}>
                <Button variant="primary" size="small" onClick={() => navigate('/search')}>
                  Начать бронирование
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default HelpPage;
