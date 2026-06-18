import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/Button/Button';
import { useDestinations } from '../../hooks/useDestinations';
import { useCars } from '../../hooks/useCars';
import type { PartnerCar } from '../../lib/travel/types';
import styles from './TravelSearch.module.css';
import sharedStyles from './Travel.module.css';

export function TravelSearch() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { destinations } = useDestinations();
  const { cars, loading, search } = useCars();

  const mode = searchParams.get('mode') || 'rental';
  const initialDestination = searchParams.get('destination') || '';

  const [selectedDestination, setSelectedDestination] = useState(initialDestination);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [transmission, setTransmission] = useState('');
  const [seats, setSeats] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    setStartDate(today.toISOString().split('T')[0]);
    setEndDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  const handleSearch = useCallback(async () => {
    if (!selectedDestination || !startDate || !endDate) return;
    setHasSearched(true);
    await search({
      destination_slug: selectedDestination,
      start_date: startDate,
      end_date: endDate,
      transmission: transmission ? (transmission as 'manual' | 'automatic') : undefined,
      seats: seats ? parseInt(seats, 10) : undefined,
    });
  }, [selectedDestination, startDate, endDate, transmission, seats, search]);

  useEffect(() => {
    if (initialDestination && startDate && endDate) {
      setSelectedDestination(initialDestination);
      handleSearch();
    }
  }, [initialDestination, startDate, endDate, handleSearch]);

  const getDestinationName = (slug: string) =>
    destinations.find((d) => d.slug === slug)?.name || slug;

  const transmissionLabel = (t: string) => (t === 'automatic' ? 'Автомат' : 'Механика');

  const pageTitle = mode === 'storage' ? 'Парковка авто' : 'Поиск автомобиля';
  const pageSubtitle = mode === 'storage'
    ? 'Выберите локацию для хранения вашего автомобиля'
    : 'Найдите подходящий автомобиль на курорте';

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderContent}>
          <h1 className={styles.pageTitle}>{pageTitle}</h1>
          <p className={styles.pageSubtitle}>{pageSubtitle}</p>
        </div>
      </div>

      <div className={styles.filters}>
        <div className={styles.filtersInner}>
          <div className={styles.destinationSelector}>
            {destinations.map((dest) => (
              <button
                key={dest.id}
                type="button"
                className={`${styles.destinationOption} ${selectedDestination === dest.slug ? styles.destinationOptionActive : ''}`}
                onClick={() => setSelectedDestination(dest.slug)}
              >
                {dest.name}
              </button>
            ))}
          </div>

          <div className={styles.filterGrid}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Дата заезда</label>
              <input type="date" className={styles.filterInput} value={startDate} onChange={(e) => setStartDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Дата выезда</label>
              <input type="date" className={styles.filterInput} value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} />
            </div>
            {mode === 'rental' && (
              <>
                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Коробка</label>
                  <select className={styles.filterSelect} value={transmission} onChange={(e) => setTransmission(e.target.value)}>
                    <option value="">Все</option>
                    <option value="automatic">Автомат</option>
                    <option value="manual">Механика</option>
                  </select>
                </div>
                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Мест</label>
                  <select className={styles.filterSelect} value={seats} onChange={(e) => setSeats(e.target.value)}>
                    <option value="">Любое</option>
                    <option value="4">от 4</option>
                    <option value="5">от 5</option>
                    <option value="7">от 7</option>
                  </select>
                </div>
              </>
            )}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>&nbsp;</label>
              <Button variant="primary" className={styles.searchBtn} onClick={handleSearch} disabled={!selectedDestination}>
                {mode === 'storage' ? 'Найти парковку' : 'Найти'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.results}>
        {loading ? (
          <div className={sharedStyles.loading}>
            <div className={sharedStyles.spinner} />
            <p>Поиск...</p>
          </div>
        ) : hasSearched && cars.length === 0 ? (
          <div className={sharedStyles.emptyState}>
            <h2 className={styles.emptyTitle}>Нет подходящих автомобилей</h2>
            <p className={styles.emptyText}>Попробуйте изменить параметры поиска</p>
          </div>
        ) : hasSearched ? (
          <>
            <div className={styles.resultsHeader}>
              <div className={styles.resultsCount}>
                Найдено {cars.length} в {getDestinationName(selectedDestination)}
              </div>
              <button type="button" className={styles.showMapBtn} onClick={() => navigate('/map')}>
                Показать на карте
              </button>
            </div>
            <div className={styles.resultsGrid}>
              {cars.map((car: PartnerCar) => (
                <div key={car.id} className={styles.carCard}>
                  <div className={styles.carImage}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                      <path d="M5 17h14M5 17a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l2-3h8l2 3h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2" />
                    </svg>
                  </div>
                  <div className={styles.carInfo}>
                    <div className={styles.carHeader}>
                      <h3 className={styles.carName}>{car.brand} {car.model}</h3>
                      {car.year && <span className={styles.carYear}>{car.year}</span>}
                    </div>
                    <div className={styles.carSpecs}>
                      <span className={styles.carSpec}>{transmissionLabel(car.transmission)}</span>
                      <span className={styles.carSpec}>{car.seats} мест</span>
                    </div>
                    {car.partner && (
                      <div className={styles.carPartner}>
                        {car.partner.name}
                        {car.partner.rating > 0 && <span className={styles.partnerRating}>★ {car.partner.rating}</span>}
                      </div>
                    )}
                    <div className={styles.carFooter}>
                      <div className={styles.carPrice}>
                        <span className={styles.carPriceValue}>{car.price_per_day.toLocaleString('ru-RU')} ₽</span>
                        <span className={styles.carPriceLabel}>в сутки</span>
                      </div>
                      <Button
                        variant="primary"
                        size="small"
                        onClick={() => {
                          const params = new URLSearchParams({
                            start: startDate,
                            end: endDate,
                            destination: selectedDestination,
                            mode,
                          });
                          navigate(`/booking/${car.id}?${params.toString()}`);
                        }}
                      >
                        {mode === 'storage' ? 'Забронировать парковку' : 'Забронировать'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className={sharedStyles.emptyState}>
            <h2 className={styles.emptyTitle}>Выберите направление</h2>
            <p className={styles.emptyText}>Укажите курорт, даты и нажмите «Найти»</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default TravelSearch;
