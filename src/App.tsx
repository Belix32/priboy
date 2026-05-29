import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// Auth pages
const Login = lazy(() => import('./pages/Login/Login').then(m => ({ default: m.Login })));

// Travel pages (user-facing)
const TravelHome = lazy(() => import('./pages/Travel/TravelHome').then(m => ({ default: m.TravelHome })));
const TravelSearch = lazy(() => import('./pages/Travel/TravelSearch').then(m => ({ default: m.TravelSearch })));
const TravelBooking = lazy(() => import('./pages/Travel/TravelBooking').then(m => ({ default: m.TravelBooking })));
const TravelBookingConfirm = lazy(() => import('./pages/Travel/TravelBookingConfirm').then(m => ({ default: m.TravelBookingConfirm })));
const TravelBookingSuccess = lazy(() => import('./pages/Travel/TravelBookingSuccess').then(m => ({ default: m.TravelBookingSuccess })));
const MyTravelTrips = lazy(() => import('./pages/Travel/MyTravelTrips').then(m => ({ default: m.MyTravelTrips })));
const UserProfile = lazy(() => import('./pages/Travel/UserProfile').then(m => ({ default: m.UserProfile })));
const TravelMap = lazy(() => import('./pages/Travel/TravelMap').then(m => ({ default: m.TravelMap })));

// Admin pages
const AdminTravelDashboard = lazy(() => import('./pages/Admin/AdminTravelDashboard').then(m => ({ default: m.AdminTravelDashboard })));
const AdminTravelDestinations = lazy(() => import('./pages/Admin/AdminTravelDestinations').then(m => ({ default: m.AdminTravelDestinations })));
const AdminTravelPartners = lazy(() => import('./pages/Admin/AdminTravelPartners').then(m => ({ default: m.AdminTravelPartners })));
const AdminTravelCars = lazy(() => import('./pages/Admin/AdminTravelCars').then(m => ({ default: m.AdminTravelCars })));
const AdminTravelBookings = lazy(() => import('./pages/Admin/AdminTravelBookings').then(m => ({ default: m.AdminTravelBookings })));
const AdminTravelStorage = lazy(() => import('./pages/Admin/AdminTravelStorage').then(m => ({ default: m.AdminTravelStorage })));
const AdminUsers = lazy(() => import('./pages/Admin/AdminUsers').then(m => ({ default: m.AdminUsers })));

// Partner pages
const PartnerDashboard = lazy(() => import('./pages/Partner/PartnerDashboard').then(m => ({ default: m.PartnerDashboard })));
const PartnerCars = lazy(() => import('./pages/Partner/PartnerCars').then(m => ({ default: m.PartnerCars })));
const PartnerBookings = lazy(() => import('./pages/Partner/PartnerBookings').then(m => ({ default: m.PartnerBookings })));
const PartnerStorage = lazy(() => import('./pages/Partner/PartnerStorage').then(m => ({ default: m.PartnerStorage })));

function PageLoader() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--ocean-deep, #0c4a6e)',
      color: '#fff'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 40,
          height: 40,
          border: '3px solid #38bdf8',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        Прибой загружается...
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <a href="#main" className="skipLink">Перейти к основному контенту</a>
      <main id="main" role="main">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Auth */}
            <Route path="/login" element={<Login />} />
            <Route path="/admin-login" element={<Login />} />

            {/* User pages */}
            <Route path="/" element={<TravelHome />} />
            <Route path="/travel" element={<TravelHome />} />
            <Route path="/travel/search" element={<TravelSearch />} />
            <Route path="/travel/booking/:carId" element={<TravelBooking />} />
            <Route path="/travel/booking/confirm" element={<TravelBookingConfirm />} />
            <Route path="/travel/booking/success" element={<TravelBookingSuccess />} />
            <Route path="/travel/my-trips" element={<MyTravelTrips />} />
            <Route path="/travel/profile" element={<UserProfile />} />
            <Route path="/travel/map" element={<TravelMap />} />

            {/* Admin pages */}
            <Route path="/admin" element={<AdminTravelDashboard />} />
            <Route path="/admin/destinations" element={<AdminTravelDestinations />} />
            <Route path="/admin/partners" element={<AdminTravelPartners />} />
            <Route path="/admin/cars" element={<AdminTravelCars />} />
            <Route path="/admin/bookings" element={<AdminTravelBookings />} />
            <Route path="/admin/storage" element={<AdminTravelStorage />} />
            <Route path="/admin/users" element={<AdminUsers />} />

            {/* Partner pages */}
            <Route path="/partner" element={<PartnerDashboard />} />
            <Route path="/partner/cars" element={<PartnerCars />} />
            <Route path="/partner/bookings" element={<PartnerBookings />} />
            <Route path="/partner/storage" element={<PartnerStorage />} />
          </Routes>
        </Suspense>
      </main>
    </>
  );
}
