// Demo seed data for localStorage fallback mode
import type { TravelDestination, RentalPartner, PartnerLocation, PartnerCar } from './types';

const LS_SEED_KEY = 'priboi_travel_seeded';

export const STORAGE_PRICE_PER_DAY = 500;

export const DEMO_DESTINATIONS: TravelDestination[] = [
  { id: 'a0000000-0000-4000-8000-000000000001', name: 'Сочи', slug: 'sochi', description: 'Жемчужина Черноморского побережья', image: null, hero_image: 'https://images.unsplash.com/photo-1596484552834-086a760e5a59?w=800&q=80', region: 'Краснодарский край', latitude: 43.6028, longitude: 39.7343, price_from: 2500, is_active: true, sort_order: 1, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 'a0000000-0000-4000-8000-000000000002', name: 'Анапа', slug: 'anapa', description: 'Солнце, песчаные пляжи', image: null, hero_image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80', region: 'Краснодарский край', latitude: 44.8944, longitude: 37.3167, price_from: 1800, is_active: true, sort_order: 2, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 'a0000000-0000-4000-8000-000000000003', name: 'Геленджик', slug: 'gelendzhik', description: 'Уютные бухты', image: null, hero_image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80', region: 'Краснодарский край', latitude: 44.5611, longitude: 38.0767, price_from: 2000, is_active: true, sort_order: 3, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 'a0000000-0000-4000-8000-000000000004', name: 'Туапсе', slug: 'tuapse', description: 'Город-порт', image: null, hero_image: 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=800&q=80', region: 'Краснодарский край', latitude: 44.0937, longitude: 39.0742, price_from: 1500, is_active: true, sort_order: 4, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 'a0000000-0000-4000-8000-000000000005', name: 'Крым', slug: 'crimea', description: 'Уникальная природа', image: null, hero_image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80', region: 'Республика Крым', latitude: 44.9521, longitude: 34.1024, price_from: 2200, is_active: true, sort_order: 5, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
];

export const DEMO_PARTNERS: RentalPartner[] = [
  { id: 'b0000000-0000-4000-8000-000000000001', name: 'АвтоМоре Сочи', slug: 'avtomore-sochi', description: 'Крупнейший прокат', logo: null, phone: '+7 (862) 200-10-01', email: null, website: null, is_active: true, commission_rate: 15, rating: 4.7, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 'b0000000-0000-4000-8000-000000000002', name: 'Южный Прокат', slug: 'yuzhny-prokat', description: 'Надёжный партнёр', logo: null, phone: '+7 (862) 250-40-04', email: null, website: null, is_active: true, commission_rate: 12, rating: 4.5, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
];

export const DEMO_LOCATIONS: PartnerLocation[] = [
  { id: 'c0000000-0000-4000-8000-000000000101', partner_id: 'b0000000-0000-4000-8000-000000000001', destination_id: 'a0000000-0000-4000-8000-000000000001', name: 'АвтоМоре — Сочи', address: 'ул. Курортный проспект, 89', latitude: 43.5855, longitude: 39.7228, phone: '+7 (862) 200-10-01', has_storage: true, has_rental: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'c0000000-0000-4000-8000-000000000102', partner_id: 'b0000000-0000-4000-8000-000000000001', destination_id: 'a0000000-0000-4000-8000-000000000002', name: 'АвтоМоре — Анапа', address: 'ул. Ленина, 12', latitude: 44.8935, longitude: 37.3185, phone: '+7 (861) 330-20-02', has_storage: true, has_rental: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'c0000000-0000-4000-8000-000000000103', partner_id: 'b0000000-0000-4000-8000-000000000001', destination_id: 'a0000000-0000-4000-8000-000000000003', name: 'АвтоМоре — Геленджик', address: 'ул. Революционная, 45', latitude: 44.562, longitude: 38.0755, phone: '+7 (861) 410-30-03', has_storage: true, has_rental: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'c0000000-0000-4000-8000-000000000201', partner_id: 'b0000000-0000-4000-8000-000000000002', destination_id: 'a0000000-0000-4000-8000-000000000001', name: 'Южный Прокат — Сочи', address: 'ул. Навагинская, 7', latitude: 43.587, longitude: 39.724, phone: '+7 (862) 250-40-04', has_storage: true, has_rental: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'c0000000-0000-4000-8000-000000000202', partner_id: 'b0000000-0000-4000-8000-000000000002', destination_id: 'a0000000-0000-4000-8000-000000000002', name: 'Южный Прокат — Анапа', address: 'пр-т Пионерский, 38', latitude: 44.892, longitude: 37.32, phone: '+7 (861) 330-50-05', has_storage: true, has_rental: true, created_at: '2024-01-01T00:00:00Z' },
];

export const DEMO_CARS: PartnerCar[] = [
  { id: 'd0000000-0000-4000-8000-000000000101', partner_id: 'b0000000-0000-4000-8000-000000000001', location_id: 'c0000000-0000-4000-8000-000000000101', brand: 'Hyundai', model: 'Solaris', year: 2021, color: 'Белый', license_plate: 'С001АМ 123', transmission: 'automatic', fuel_type: 'gasoline', seats: 5, price_per_day: 2500, deposit: 5000, image: null, images: [], description: 'Экономичный седан', is_available: true, is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 'd0000000-0000-4000-8000-000000000102', partner_id: 'b0000000-0000-4000-8000-000000000001', location_id: 'c0000000-0000-4000-8000-000000000101', brand: 'Toyota', model: 'Camry', year: 2023, color: 'Белый', license_plate: 'С004КМ 123', transmission: 'automatic', fuel_type: 'gasoline', seats: 5, price_per_day: 4500, deposit: 10000, image: null, images: [], description: 'Бизнес-седан', is_available: true, is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 'd0000000-0000-4000-8000-000000000105', partner_id: 'b0000000-0000-4000-8000-000000000001', location_id: 'c0000000-0000-4000-8000-000000000102', brand: 'Lada', model: 'Vesta', year: 2022, color: 'Синий', license_plate: 'А005ВС 123', transmission: 'manual', fuel_type: 'gasoline', seats: 5, price_per_day: 1800, deposit: 3000, image: null, images: [], description: 'Бюджетный вариант', is_available: true, is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 'd0000000-0000-4000-8000-000000000109', partner_id: 'b0000000-0000-4000-8000-000000000001', location_id: 'c0000000-0000-4000-8000-000000000103', brand: 'Hyundai', model: 'Creta', year: 2022, color: 'Белый', license_plate: 'Г009КР 123', transmission: 'automatic', fuel_type: 'gasoline', seats: 5, price_per_day: 3000, deposit: 6000, image: null, images: [], description: 'Кроссовер', is_available: true, is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 'd0000000-0000-4000-8000-000000000201', partner_id: 'b0000000-0000-4000-8000-000000000002', location_id: 'c0000000-0000-4000-8000-000000000201', brand: 'Renault', model: 'Duster', year: 2022, color: 'Оранжевый', license_plate: 'С101ДС 123', transmission: 'manual', fuel_type: 'gasoline', seats: 5, price_per_day: 2200, deposit: 4000, image: null, images: [], description: 'Вездеход', is_available: true, is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 'd0000000-0000-4000-8000-000000000202', partner_id: 'b0000000-0000-4000-8000-000000000002', location_id: 'c0000000-0000-4000-8000-000000000201', brand: 'Hyundai', model: 'Tucson', year: 2023, color: 'Белый', license_plate: 'С102ТС 123', transmission: 'automatic', fuel_type: 'gasoline', seats: 5, price_per_day: 3500, deposit: 7000, image: null, images: [], description: 'Современный кроссовер', is_available: true, is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
];

export function seedDemoDataIfNeeded(): void {
  if (localStorage.getItem(LS_SEED_KEY)) return;
  localStorage.setItem('priboi_travel_destinations', JSON.stringify(DEMO_DESTINATIONS));
  localStorage.setItem('priboi_travel_partners', JSON.stringify(DEMO_PARTNERS));
  localStorage.setItem('priboi_travel_locations', JSON.stringify(DEMO_LOCATIONS));
  localStorage.setItem('priboi_travel_cars', JSON.stringify(DEMO_CARS));
  localStorage.setItem('priboi_travel_bookings', JSON.stringify([]));
  localStorage.setItem('priboi_travel_storage', JSON.stringify([]));
  localStorage.setItem(LS_SEED_KEY, '1');
}

export const HERO_IMAGE = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80';

export const HOW_IT_WORKS_STEPS = [
  { number: '01', title: 'Выберите локацию и даты', description: 'Укажите, где и когда хотите оставить авто или арендовать', icon: 'location' },
  { number: '02', title: 'Забронируйте онлайн', description: 'Выберите услугу и забронируйте удобным способом', icon: 'calendar' },
  { number: '03', title: 'Оставьте или получите авто', description: 'Мы позаботимся о безопасности и комфорте', icon: 'car' },
  { number: '04', title: 'Наслаждайтесь поездкой', description: 'Путешествуйте налегке, мы обо всём позаботимся', icon: 'sun' },
] as const;

export const FEATURES = [
  { title: 'Выгодные цены без скрытых платежей', icon: 'price' },
  { title: 'Широкий выбор авто на любой вкус', icon: 'cars' },
  { title: 'Поддержка 24/7 всегда на связи', icon: 'support' },
  { title: 'Быстрое бронирование и удобная отмена', icon: 'booking' },
] as const;
