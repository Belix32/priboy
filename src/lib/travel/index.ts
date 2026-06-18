/**
 * Прибой — Модуль аренды автомобилей на море
 *
 * Направления, партнёры, автомобили, локации,
 * бронирования и хранение личного авто.
 */

// Export all types
export * from './types';

// Export all API functions
export {
  // Destinations
  getActiveDestinations,
  getDestinationBySlug,
  getDestinationById,
  getAllDestinationsAdmin,
  createDestination,
  updateDestination,
  deleteDestination,

  // Partners
  getActivePartners,
  getPartnerById,
  getPartnersByDestination,
  getAllPartnersAdmin,
  createPartner,
  updatePartner,
  deletePartner,

  // Cars
  getAvailableCars,
  getPartnerCars,
  getCarById,
  getAllCarsAdmin,
  createCar,
  updateCar,
  deleteCar,

  // Locations
  getPartnerLocations,
  getLocationsByDestination,
  getLocationById,
  getAllLocationsAdmin,
  createLocation,
  updateLocation,
  deleteLocation,

  // Bookings
  createTravelBooking,
  getUserTravelBookings,
  getTravelBookingById,
  updateTravelBookingStatus,
  cancelTravelBooking,
  updateTravelBookingPaymentStatus,
  checkCarAvailability,
  getAllTravelBookingsAdmin,
  getAdminTravelStats,
  getAdminAnalytics,

  // Storage
  createStorageRecord,
  getBookingStorage,
  updateStorageStatus,
  getAllStorageAdmin,

  // Admin profiles & promos
  getAllProfilesAdmin,
  updateProfileAdmin,
  getAllPromoCodesAdmin,
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
  getAllSeasonalDiscountsAdmin,
  createSeasonalDiscount,
  updateSeasonalDiscount,
  deleteSeasonalDiscount,

  // Price calculation
  calculateTravelPrice,

  // Partner-specific
  getPartnerBookings,
  getPartnerStorageRecords,
  getPartnerStats,
  updatePartnerCarAvailability,
  confirmTravelBooking,
  markStorageCheckIn,
  markStorageCheckOut,
} from './api';
