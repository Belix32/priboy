import { Link } from 'react-router-dom';
import type { TravelDestination } from '../../lib/travel/types';
import styles from './DestinationCard.module.css';

interface DestinationCardProps {
  destination: TravelDestination;
}

export function DestinationCard({ destination }: DestinationCardProps) {
  const imageUrl = destination.hero_image || destination.image ||
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80';

  return (
    <Link
      to={`/search?destination=${destination.slug}&mode=rental`}
      className={styles.card}
    >
      <div className={styles.imageWrap}>
        <img src={imageUrl} alt={destination.name} className={styles.image} loading="lazy" />
      </div>
      <div className={styles.info}>
        <h3 className={styles.name}>{destination.name}</h3>
        <p className={styles.service}>Парковка и аренда</p>
        <p className={styles.price}>от {destination.price_from?.toLocaleString('ru-RU') || '1200'} ₽ / день</p>
      </div>
    </Link>
  );
}
