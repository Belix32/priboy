import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getAllLocationsAdmin } from '../../lib/travel/api';
import type { PartnerLocation } from '../../lib/travel/types';
import styles from './TravelMap.module.css';

// Fix Leaflet default icon issue
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ============================================================================
// Types
// ============================================================================

interface OfficeLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  has_storage: boolean;
  has_rental: boolean;
  destination: string;
  destinationSlug: string;
  partner: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_COLOR = '#6b7280';
const DESTINATION_PALETTE = ['#2563eb', '#059669', '#f59e0b', '#8b5cf6', '#ec4899', '#0ea5e9'];

function getDestinationColor(name: string, paletteIndex: number): string {
  if (!name) return DEFAULT_COLOR;
  return DESTINATION_PALETTE[paletteIndex % DESTINATION_PALETTE.length];
}

const MAP_CENTER: [number, number] = [44.5, 39.0];
const MAP_ZOOM = 8;
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

// ============================================================================
// Helper: create marker icon
// ============================================================================

function createOfficeIcon(color: string, isSelected: boolean): L.DivIcon {
  const size = isSelected ? 36 : 28;
  return L.divIcon({
    className: '',
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: ${isSelected ? '0 0 0 3px rgba(37,99,235,0.3), 0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.3)'};
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      cursor: pointer;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// ============================================================================
// MapFlyTo — programmatically fly to a location
// ============================================================================

function MapFlyTo({
  location,
  onFlyComplete,
}: {
  location: OfficeLocation | null;
  onFlyComplete: () => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!location) return;
    map.flyTo([location.latitude, location.longitude], 14, { duration: 1 });
    const timer = setTimeout(onFlyComplete, 1200);
    return () => clearTimeout(timer);
  }, [map, location, onFlyComplete]);

  return null;
}

// ============================================================================
// OfficeMarker — single marker on the map
// ============================================================================

function OfficeMarker({
  location,
  isSelected,
  onSelect,
  onBook,
  popupOpen,
  markerColor,
  onPopupClose,
}: {
  location: OfficeLocation;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onBook: (location: OfficeLocation) => void;
  popupOpen: boolean;
  markerColor: string;
  onPopupClose: () => void;
}) {
  const markerRef = useRef<L.Marker>(null);

  useEffect(() => {
    if (popupOpen && markerRef.current) {
      markerRef.current.openPopup();
    } else if (!popupOpen && markerRef.current) {
      markerRef.current.closePopup();
    }
  }, [popupOpen]);

  return (
    <Marker
      ref={markerRef}
      position={[location.latitude, location.longitude]}
      icon={createOfficeIcon(markerColor, isSelected)}
      eventHandlers={{
        click: () => {
          onSelect(location.id);
        },
        popupclose: () => {
          onPopupClose();
        },
      }}
    >
      <Popup>
        <div className={styles.popup}>
          <strong className={styles.popupName}>{location.name}</strong>
          <p className={styles.popupAddress}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {location.address}
          </p>
          <p className={styles.popupPhone}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            {location.phone}
          </p>
          <p className={styles.popupServices}>
            {location.has_storage && <span title="Хранение">🏠 Хранение</span>}
            {location.has_rental && <span title="Аренда">🚗 Аренда</span>}
          </p>
          <button
            type="button"
            className={styles.popupDetailBtn}
            onClick={() => onBook(location)}
          >
            Забронировать авто
          </button>
          <button
            type="button"
            className={styles.popupDetailBtnSecondary}
            onClick={() => onSelect(location.id)}
          >
            Подробнее
          </button>
        </div>
      </Popup>
    </Marker>
  );
}

// ============================================================================
// TravelMap — Main Component
// ============================================================================

export function TravelMap() {
  const navigate = useNavigate();
  const [locations, setLocations] = useState<OfficeLocation[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [destinationFilter, setDestinationFilter] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [popupOpenId, setPopupOpenId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocationsLoading(true);
    getAllLocationsAdmin()
      .then((data) => {
        setLocations(
          data
            .filter((loc) => loc.latitude && loc.longitude)
            .map((loc: PartnerLocation) => ({
              id: loc.id,
              name: loc.name,
              address: loc.address,
              latitude: Number(loc.latitude),
              longitude: Number(loc.longitude),
              phone: loc.phone || '',
              has_storage: loc.has_storage,
              has_rental: loc.has_rental,
              destination: loc.destination?.name || '',
              destinationSlug: loc.destination?.slug || '',
              partner: loc.partner?.name || '',
            })),
        );
      })
      .finally(() => setLocationsLoading(false));
  }, []);

  const destinationFilters = useMemo(() => {
    const names = [...new Set(locations.map((l) => l.destination).filter(Boolean))].sort();
    return [
      { value: '', label: 'Все направления' },
      ...names.map((name) => ({ value: name, label: name })),
    ];
  }, [locations]);

  const destinationColorMap = useMemo(() => {
    const map = new Map<string, string>();
    destinationFilters
      .filter((f) => f.value)
      .forEach((f, index) => map.set(f.value, getDestinationColor(f.value, index)));
    return map;
  }, [destinationFilters]);

  const filteredLocations = destinationFilter
    ? locations.filter((loc) => loc.destination === destinationFilter)
    : locations;

  const selectedLocation =
    locations.find((loc) => loc.id === selectedLocationId) ?? null;

  const handleBookFromOffice = useCallback(
    (loc: OfficeLocation) => {
      if (!loc.destinationSlug) {
        navigate('/search');
        return;
      }
      navigate(`/search?destination=${encodeURIComponent(loc.destinationSlug)}`);
    },
    [navigate],
  );

  // Fly-to target (when user clicks a sidebar item)
  const [flyTarget, setFlyTarget] = useState<OfficeLocation | null>(null);

  const handleSelectLocation = useCallback((id: string) => {
    setSelectedLocationId(id);
    setPopupOpenId(id);
    const loc = locations.find((l) => l.id === id);
    if (loc) {
      setFlyTarget(loc);
    }
    // Scroll sidebar item into view
    setTimeout(() => {
      if (listRef.current) {
        const el = listRef.current.querySelector(`[data-location-id="${id}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  }, []);

  const handleFlyComplete = useCallback(() => {
    // Popup opened via popupOpenId state in OfficeMarker
  }, []);

  const handlePopupClose = useCallback(() => {
    setPopupOpenId(null);
  }, []);

  // Close sidebar on mobile by default
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setSidebarOpen(!mq.matches);
    const handler = (e: MediaQueryListEvent) => setSidebarOpen(!e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <div className={styles.page}>
      {/* Back button */}
      <button
        type="button"
        className={styles.backButton}
        onClick={() => navigate('/travel/search')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Назад к поиску
      </button>

      {/* Mobile sidebar toggle */}
      <button
        type="button"
        className={`${styles.sidebarToggle} ${sidebarOpen ? styles.sidebarToggleActive : ''}`}
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label={sidebarOpen ? 'Скрыть панель' : 'Показать панель'}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {sidebarOpen ? (
            <path d="M18 6L6 18M6 6l12 12" />
          ) : (
            <path d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Sidebar */}
      <aside
        className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''} ${selectedLocation && sidebarOpen ? styles.sidebarHasSelection : ''}`}
      >
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>Офисы партнёров</h2>
          <p className={styles.sidebarSubtitle}>
            {filteredLocations.length} офис
            {filteredLocations.length === 1
              ? ''
              : filteredLocations.length < 5
                ? 'а'
                : 'ов'}{' '}
            {destinationFilter
              ? `в ${destinationFilter}`
              : 'по всем направлениям'}
          </p>
        </div>

        {/* Destination filter */}
        <div className={styles.filterWrapper}>
          <select
            className={styles.filterSelect}
            value={destinationFilter}
            onChange={(e) => {
              setDestinationFilter(e.target.value);
              setSelectedLocationId(null);
              setPopupOpenId(null);
              setFlyTarget(null);
            }}
          >
            {destinationFilters.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Office list */}
        <div className={styles.officeList} ref={listRef}>
          {locationsLoading ? (
            <div className={styles.officeListEmpty}>Загрузка офисов...</div>
          ) : filteredLocations.length === 0 ? (
            <div className={styles.officeListEmpty}>
              Нет офисов с координатами в выбранном направлении
            </div>
          ) : (
            filteredLocations.map((loc) => {
              const isSelected = selectedLocationId === loc.id;
              const color = destinationColorMap.get(loc.destination) || DEFAULT_COLOR;
              return (
                <button
                  key={loc.id}
                  type="button"
                  data-location-id={loc.id}
                  className={`${styles.officeItem} ${isSelected ? styles.officeItemActive : ''}`}
                  onClick={() => handleSelectLocation(loc.id)}
                >
                  <div className={styles.officeItemDot} style={{ background: color }} />
                  <div className={styles.officeItemContent}>
                    <div className={styles.officeItemName}>{loc.name}</div>
                    <div className={styles.officeItemAddress}>{loc.address}</div>
                    <div className={styles.officeItemPhone}>{loc.phone}</div>
                    <div className={styles.officeItemServices}>
                      {loc.has_storage && (
                        <span className={styles.serviceBadge} title="Хранение">
                          🏠
                        </span>
                      )}
                      {loc.has_rental && (
                        <span className={styles.serviceBadge} title="Аренда">
                          🚗
                        </span>
                      )}
                      <span className={styles.officeItemPartner}>{loc.partner}</span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {selectedLocation && (
          <div className={styles.officeDetail}>
            <h3 className={styles.officeDetailTitle}>{selectedLocation.name}</h3>
            <p className={styles.officeDetailMeta}>{selectedLocation.address}</p>
            {selectedLocation.phone && (
              <p className={styles.officeDetailMeta}>{selectedLocation.phone}</p>
            )}
            <p className={styles.officeDetailMeta}>{selectedLocation.partner}</p>
            {selectedLocation.has_rental && (
              <button
                type="button"
                className={styles.officeDetailBtn}
                onClick={() => handleBookFromOffice(selectedLocation)}
              >
                Забронировать авто
              </button>
            )}
          </div>
        )}
      </aside>

      {/* Map */}
      <div className={styles.mapContainer}>
        <MapContainer
          center={MAP_CENTER}
          zoom={MAP_ZOOM}
          className={styles.map}
          scrollWheelZoom={true}
          zoomControl={true}
          attributionControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
            url={TILE_URL}
          />

          <MapFlyTo
            location={flyTarget}
            onFlyComplete={handleFlyComplete}
          />

          {locations.map((loc) => (
            <OfficeMarker
              key={loc.id}
              location={loc}
              isSelected={selectedLocationId === loc.id}
              onSelect={handleSelectLocation}
              onBook={handleBookFromOffice}
              popupOpen={popupOpenId === loc.id}
              markerColor={destinationColorMap.get(loc.destination) || DEFAULT_COLOR}
              onPopupClose={handlePopupClose}
            />
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

export default TravelMap;
