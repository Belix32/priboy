import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '../../components/Button/Button';
import styles from './TravelHome.module.css';
import sharedStyles from './Travel.module.css';

// Fix Leaflet default icon
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Destination {
  id: string;
  name: string;
  slug: string;
  image: string;
  region: string;
  latitude: number;
  longitude: number;
  is_active: boolean;
  sort_order: number;
}

const MOCK_DESTINATIONS: Destination[] = [
  { id: 'dest-1', name: 'Сочи', slug: 'sochi', image: '', region: 'Краснодарский край', latitude: 43.6028, longitude: 39.7343, is_active: true, sort_order: 1 },
  { id: 'dest-2', name: 'Анапа', slug: 'anapa', image: '', region: 'Краснодарский край', latitude: 44.8948, longitude: 37.3162, is_active: true, sort_order: 2 },
  { id: 'dest-3', name: 'Геленджик', slug: 'gelendzhik', image: '', region: 'Краснодарский край', latitude: 44.5622, longitude: 38.0780, is_active: true, sort_order: 3 },
];

/** Mini-map preview for a destination city card */
function DestinationMiniMap({ lat, lng, cityName }: { lat: number; lng: number; cityName: string }) {
  const icon = L.divIcon({
    className: '',
    html: `<div style="
      width: 28px; height: 28px;
      background: #0ea5e9;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
    "></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={12}
      scrollWheelZoom={false}
      dragging={false}
      zoomControl={false}
      attributionControl={false}
      style={{ width: '100%', height: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lng]} icon={icon}>
        <Popup>{cityName}</Popup>
      </Marker>
    </MapContainer>
  );
}

export function TravelHome() {
  const navigate = useNavigate();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      setDestinations(MOCK_DESTINATIONS.filter(d => d.is_active));
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={styles.heroPattern} />
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            Сервис аренды авто на курортах
          </div>
          <h1 className={styles.heroTitle}>
            <span className={styles.brandName}>Прибой</span>
            <span className={styles.heroTitleAccent}>. </span>
            Колёса к морю
          </h1>
          <p className={styles.heroSubtitle}>
            Прилетел на море — получи машину. Свою оставь на хранение
          </p>
          <div className={styles.heroActions}>
            <Button
              variant="primary"
              size="large"
              className={styles.heroCta}
              onClick={() => navigate('/travel/search')}
            >
              Выбрать направление
            </Button>
          </div>
          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <div className={styles.heroStatValue}>50+</div>
              <div className={styles.heroStatLabel}>авто в прокате</div>
            </div>
            <div className={styles.heroStat}>
              <div className={styles.heroStatValue}>3</div>
              <div className={styles.heroStatLabel}>направления</div>
            </div>
            <div className={styles.heroStat}>
              <div className={styles.heroStatValue}>12+</div>
              <div className={styles.heroStatLabel}>партнёров</div>
            </div>
          </div>
        </div>
      </section>

      {/* Wave Divider */}
      <div className={styles.waveDivider}>
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" fill="var(--bg-secondary)">
          <path d="M0,40 C360,80 720,0 1080,40 C1260,60 1350,40 1440,40 L1440,80 L0,80 Z" />
        </svg>
      </div>

      {/* How It Works */}
      <section className={styles.howItWorks}>
        <div className={sharedStyles.container}>
          <div style={{ textAlign: 'center' }}>
            <h2 className={sharedStyles.sectionTitle}>Как это работает</h2>
            <p className={sharedStyles.sectionSubtitle}>
              Три простых шага для вашего идеального отпуска
            </p>
          </div>
          <div className={styles.stepsGrid}>
            <div className={styles.step}>
              <div className={styles.stepNumber}>1</div>
              <div className={styles.stepIcon}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="10" r="3" />
                  <path d="M12 2a8 8 0 0 0-8 8c0 5.4 8 12 8 12s8-6.6 8-12a8 8 0 0 0-8-8z" />
                </svg>
              </div>
              <h3 className={styles.stepTitle}>Выберите направление</h3>
              <p className={styles.stepDesc}>
                Сочи, Анапа или Геленджик — выберите курорт для вашей поездки
              </p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>2</div>
              <div className={styles.stepIcon}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="1" y="3" width="15" height="13" rx="2" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              </div>
              <h3 className={styles.stepTitle}>Арендуйте авто на месте</h3>
              <p className={styles.stepDesc}>
                Выберите подходящий автомобиль от проверенных партнёров
              </p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>3</div>
              <div className={styles.stepIcon}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="2" width="20" height="20" rx="2" />
                  <path d="M6 12h12" />
                  <path d="M12 6v12" />
                </svg>
              </div>
              <h3 className={styles.stepTitle}>Оставьте свою машину на хранение</h3>
              <p className={styles.stepDesc}>
                Ваш автомобиль будет ждать вас в надёжном месте
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Destinations */}
      <section className={styles.destinations}>
        <div className={sharedStyles.container}>
          <div style={{ textAlign: 'center' }}>
            <h2 className={sharedStyles.sectionTitle}>Популярные направления</h2>
            <p className={sharedStyles.sectionSubtitle}>
              Выберите курорт для вашей поездки
            </p>
          </div>
          {loading ? (
            <div className={sharedStyles.loading}>
              <div className={sharedStyles.spinner} />
              <p>Загрузка направлений...</p>
            </div>
          ) : (
            <div className={styles.destinationsGrid}>
              {destinations.map((dest) => (
                <div
                  key={dest.id}
                  className={styles.destinationCard}
                  onClick={() => navigate(`/travel/search?destination=${dest.slug}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      navigate(`/travel/search?destination=${dest.slug}`);
                    }
                  }}
                >
                  <div className={styles.destinationImage}>
                    <DestinationMiniMap
                      lat={dest.latitude}
                      lng={dest.longitude}
                      cityName={dest.name}
                    />
                  </div>
                  <div className={styles.destinationInfo}>
                    <h3 className={styles.destinationName}>{dest.name}</h3>
                    <p className={styles.destinationRegion}>{dest.region}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Benefits */}
      <section className={styles.benefits}>
        <div className={sharedStyles.container}>
          <div style={{ textAlign: 'center' }}>
            <h2 className={sharedStyles.sectionTitle}>Почему это удобно</h2>
            <p className={sharedStyles.sectionSubtitle}>
              Преимущества сервиса Прибой — аренда авто с хранением вашего
            </p>
          </div>
          <div className={styles.benefitsGrid}>
            <div className={styles.benefitCard}>
              <div className={styles.benefitIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div className={styles.benefitContent}>
                <h3 className={styles.benefitTitle}>Никаких пробок на курорте</h3>
                <p className={styles.benefitDesc}>
                  Оставьте свой автомобиль дома и не стойте в многокилометровых пробках по пути к морю
                </p>
              </div>
            </div>
            <div className={styles.benefitCard}>
              <div className={styles.benefitIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="2" width="20" height="20" rx="2" />
                  <path d="M6 12h12" />
                  <path d="M12 6v12" />
                </svg>
              </div>
              <div className={styles.benefitContent}>
                <h3 className={styles.benefitTitle}>Без проблем с парковкой</h3>
                <p className={styles.benefitDesc}>
                  На курорте не нужно искать место для парковки — вы сразу получаете авто
                </p>
              </div>
            </div>
            <div className={styles.benefitCard}>
              <div className={styles.benefitIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </div>
              <div className={styles.benefitContent}>
                <h3 className={styles.benefitTitle}>Сохранность вашего авто</h3>
                <p className={styles.benefitDesc}>
                  Ваш автомобиль находится на охраняемой стоянке под видеонаблюдением
                </p>
              </div>
            </div>
            <div className={styles.benefitCard}>
              <div className={styles.benefitIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
              <div className={styles.benefitContent}>
                <h3 className={styles.benefitTitle}>Экономия времени</h3>
                <p className={styles.benefitDesc}>
                  Не тратьте дни на дорогу — прилетите самолётом и получите авто на месте
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className={sharedStyles.container}>
          <h2 className={styles.ctaTitle}>Прибой ждёт</h2>
          <p className={styles.ctaText}>
            Выберите авто на курорте, а своё оставьте на хранении
          </p>
          <Button
            variant="primary"
            size="large"
            className={styles.ctaButton}
            onClick={() => navigate('/travel/search')}
          >
            Найти автомобиль
          </Button>
        </div>
      </section>
    </div>
  );
}

export default TravelHome;
