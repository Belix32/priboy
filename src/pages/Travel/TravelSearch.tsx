import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/Button/Button';
import { useDestinations } from '../../hooks/useDestinations';
import { useCars } from '../../hooks/useCars';
import { getRentalDayLimits, getStoragePricePerDay } from '../../lib/travel/settings';
import { searchStorageLocations } from '../../lib/travel/storageBooking';
import type { PartnerCar, PartnerLocation } from '../../lib/travel/types';
import styles from './TravelSearch.module.css';
import sharedStyles from './Travel.module.css';

export function TravelSearch() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { destinations, loading: destLoading, error: destError, refresh: refreshDestinations } = useDestinations();
  const { cars, loading, error: searchError, search } = useCars();

  const mode = searchParams.get('mode') || 'rental';
  const initialDestination = searchParams.get('destination') || '';

  const [selectedDestination, setSelectedDestination] = useState(initialDestination);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [transmission, setTransmission] = useState('');
  const [seats, setSeats] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [rentalLimits, setRentalLimits] = useState({ min: 1, max: 30 });
  const isStorageMode = mode === 'storage';
  const [storageLocations, setStorageLocations] = useState<PartnerLocation[]>([]);
  const [storagePricePerDay, setStoragePricePerDay] = useState(500);
  const [storageLoading, setStorageLoading] = useState(false);

  useEffect(() => {
    getRentalDayLimits().then(setRentalLimits);
    if (isStorageMode) getStoragePricePerDay().then(setStoragePricePerDay);
  }, [isStorageMode]);

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
    if (isStorageMode) {
      setStorageLoading(true);
      try {
        const locations = await searchStorageLocations(selectedDestination);
        setStorageLocations(locations);
      } finally {
        setStorageLoading(false);
      }
      return;
    }
    await search({
      destination_slug: selectedDestination,
      start_date: startDate,
      end_date: endDate,
      transmission: transmission ? (transmission as 'manual' | 'automatic') : undefined,
      seats: seats ? parseInt(seats, 10) : undefined,
    });
  }, [selectedDestination, startDate, endDate, transmission, seats, search, isStorageMode]);

  useEffect(() => {
    if (initialDestination && startDate && endDate) {
      setSelectedDestination(initialDestination);
      handleSearch();
    }
  }, [initialDestination, startDate, endDate, handleSearch]);

  const getDestinationName = (slug: string) =>
    destinations.find((d) => d.slug === slug)?.name || slug;

  const transmissionLabel = (t: string) => (t === 'automatic' ? 'Автомат' : 'Механика');

  const pageTitle = isStorageMode ? 'Хранение авто' : 'Поиск автомобиля';
  const pageSubtitle = isStorageMode
    ? 'Выберите парковку партнёра — оставьте свой автомобиль без аренды'
    : 'Найдите подходящий автомобиль на курорте';

  const storageDays = Math.max(
    1,
    startDate && endDate
      ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
      : 1,
  );

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
              <p className={styles.filterHint}>
                {isStorageMode
                  ? `Срок хранения: от ${rentalLimits.min} до ${rentalLimits.max} дней`
                  : `Срок аренды: от ${rentalLimits.min} до ${rentalLimits.max} дней`}
              </p>
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
                {isStorageMode ? 'Найти парковки' : 'Найти'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.results}>
        {(destError || searchError) && (
          <div className={sharedStyles.error}>
            <p>{destError || searchError}</p>
            <Button variant="secondary" size="small" onClick={() => { refreshDestinations(); if (hasSearched) handleSearch(); }}>
              Повторить
            </Button>
          </div>
        )}
        {loading || destLoading || storageLoading ? (
          <div className={sharedStyles.loading}>
            <div className={sharedStyles.spinner} />
            <p>Поиск...</p>
          </div>
        ) : hasSearched && isStorageMode && storageLocations.length === 0 && !searchError ? (
          <div className={sharedStyles.emptyState}>
            <h2 className={styles.emptyTitle}>Нет парковок в этом направлении</h2>
            <p className={styles.emptyText}>Попробуйте другое направление или свяжитесь с поддержкой</p>
          </div>
        ) : hasSearched && !isStorageMode && cars.length === 0 && !searchError ? (
          <div className={sharedStyles.emptyState}>
            <h2 className={styles.emptyTitle}>Нет подходящих автомобилей</h2>
            <p className={styles.emptyText}>Попробуйте изменить параметры поиска</p>
          </div>
        ) : hasSearched && isStorageMode ? (
          <>
            <div className={styles.resultsHeader}>
              <div className={styles.resultsCount}>
                {storageLocations.length} парковок в {getDestinationName(selectedDestination)}
              </div>
              <button type="button" className={styles.showMapBtn} onClick={() => navigate('/map')}>
                Показать на карте
              </button>
            </div>
            <div className={styles.resultsGrid}>
              {storageLocations.map((loc) => {
                const days = storageDays;
                const estimate = days * storagePricePerDay;
                return (
                  <div key={loc.id} className={styles.carCard}>
                    <div className={styles.carInfo}>
                      <div className={styles.carHeader}>
                        <h3 className={styles.carName}>{loc.name}</h3>
                      </div>
                      <p className={styles.carSpec}>{loc.address}</p>
                      {loc.partner && (
                        <div className={styles.carPartner}>
                          {loc.partner.name}
                          {loc.partner.rating > 0 && (
                            <span className={styles.partnerRating}>★ {loc.partner.rating}</span>
                          )}
                        </div>
                      )}
                      <div className={styles.carFooter}>
                        <div className={styles.carPrice}>
                          <span className={styles.carPriceValue}>от {estimate.toLocaleString('ru-RU')} ₽</span>
                          <span className={styles.carPriceLabel}>
                            {days} дн. × {storagePricePerDay.toLocaleString('ru-RU')} ₽
                          </span>
                        </div>
                        <Button
                          variant="primary"
                          size="small"
                          onClick={() => {
                            const params = new URLSearchParams({ start: startDate, end: endDate });
                            navigate(`/storage/book/${loc.id}?${params.toString()}`);
                          }}
                        >
                          Забронировать
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : hasSearched && !isStorageMode ? (
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
                          });
                          navigate(`/booking/${car.id}?${params.toString()}`);
                        }}
                      >
                        Забронировать
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
