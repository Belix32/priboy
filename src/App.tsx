import { Routes, Route, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Header } from './components/Header/Header';
import { PageLoader } from './components/PageLoader/PageLoader';
import { RouteGuard } from './components/RouteGuard/RouteGuard';
import { TravelHome } from './pages/Travel/TravelHome';

const Login = lazy(() => import('./pages/Login/Login').then(m => ({ default: m.Login })));
const ResetPassword = lazy(() => import('./pages/Login/ResetPassword').then(m => ({ default: m.ResetPassword })));
const Register = lazy(() => import('./pages/Register/Register').then(m => ({ default: m.Register })));

const TravelSearch = lazy(() => import('./pages/Travel/TravelSearch').then(m => ({ default: m.TravelSearch })));
const TravelBooking = lazy(() => import('./pages/Travel/TravelBooking').then(m => ({ default: m.TravelBooking })));
const TravelBookingConfirm = lazy(() => import('./pages/Travel/TravelBookingConfirm').then(m => ({ default: m.TravelBookingConfirm })));
const TravelBookingSuccess = lazy(() => import('./pages/Travel/TravelBookingSuccess').then(m => ({ default: m.TravelBookingSuccess })));
const MyTravelTrips = lazy(() => import('./pages/Travel/MyTravelTrips').then(m => ({ default: m.MyTravelTrips })));
const UserProfile = lazy(() => import('./pages/Travel/UserProfile').then(m => ({ default: m.UserProfile })));
const HelpPage = lazy(() => import('./pages/Travel/HelpPage').then(m => ({ default: m.HelpPage })));
const GuidePage = lazy(() => import('./pages/Travel/GuidePage').then(m => ({ default: m.GuidePage })));
const AboutPage = lazy(() => import('./pages/Travel/AboutPage').then(m => ({ default: m.AboutPage })));
const TravelMap = lazy(() => import('./pages/Travel/TravelMap').then(m => ({ default: m.TravelMap })));
const StandaloneStorageBooking = lazy(() => import('./pages/Travel/StandaloneStorageBooking').then(m => ({ default: m.StandaloneStorageBooking })));
const NotFound = lazy(() => import('./pages/Travel/NotFound').then(m => ({ default: m.NotFound })));

const AdminTravelDashboard = lazy(() => import('./pages/Admin/AdminTravelDashboard').then(m => ({ default: m.AdminTravelDashboard })));
const AdminTravelDestinations = lazy(() => import('./pages/Admin/AdminTravelDestinations').then(m => ({ default: m.AdminTravelDestinations })));
const AdminTravelPartners = lazy(() => import('./pages/Admin/AdminTravelPartners').then(m => ({ default: m.AdminTravelPartners })));
const AdminTravelCars = lazy(() => import('./pages/Admin/AdminTravelCars').then(m => ({ default: m.AdminTravelCars })));
const AdminTravelBookings = lazy(() => import('./pages/Admin/AdminTravelBookings').then(m => ({ default: m.AdminTravelBookings })));
const AdminTravelStorage = lazy(() => import('./pages/Admin/AdminTravelStorage').then(m => ({ default: m.AdminTravelStorage })));
const AdminTravelLocations = lazy(() => import('./pages/Admin/AdminTravelLocations').then(m => ({ default: m.AdminTravelLocations })));
const AdminAnalytics = lazy(() => import('./pages/Admin/AdminAnalytics').then(m => ({ default: m.AdminAnalytics })));
const AdminPromotions = lazy(() => import('./pages/Admin/AdminPromotions').then(m => ({ default: m.AdminPromotions })));
const AdminSettings = lazy(() => import('./pages/Admin/AdminSettings').then(m => ({ default: m.AdminSettings })));
const AdminUsers = lazy(() => import('./pages/Admin/AdminUsers').then(m => ({ default: m.AdminUsers })));

const PartnerDashboard = lazy(() => import('./pages/Partner/PartnerDashboard').then(m => ({ default: m.PartnerDashboard })));
const PartnerCars = lazy(() => import('./pages/Partner/PartnerCars').then(m => ({ default: m.PartnerCars })));
const PartnerBookings = lazy(() => import('./pages/Partner/PartnerBookings').then(m => ({ default: m.PartnerBookings })));
const PartnerStorage = lazy(() => import('./pages/Partner/PartnerStorage').then(m => ({ default: m.PartnerStorage })));
const PartnerScan = lazy(() => import('./pages/Partner/PartnerScan').then(m => ({ default: m.PartnerScan })));

function ProtectedAdmin({ children }: { children: React.ReactNode }) {
  return <RouteGuard requireAdmin>{children}</RouteGuard>;
}

function ProtectedPartner({ children }: { children: React.ReactNode }) {
  return <RouteGuard requirePartner>{children}</RouteGuard>;
}

function ProtectedAuth({ children }: { children: React.ReactNode }) {
  return <RouteGuard requireAuth>{children}</RouteGuard>;
}

export default function App() {
  const location = useLocation();
  const showHeader = !location.pathname.startsWith('/admin') && !location.pathname.startsWith('/partner');

  return (
    <>
      <a href="#main" className="skipLink">Перейти к основному контенту</a>
      {showHeader && <Header />}
      <main id="main" role="main">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin-login" element={<Login />} />

            <Route path="/" element={<TravelHome />} />
            <Route path="/travel" element={<TravelHome />} />
            <Route path="/search" element={<TravelSearch />} />
            <Route path="/travel/search" element={<TravelSearch />} />
            <Route path="/storage/book/:locationId" element={<ProtectedAuth><StandaloneStorageBooking /></ProtectedAuth>} />
            <Route path="/booking/:carId" element={<ProtectedAuth><TravelBooking /></ProtectedAuth>} />
            <Route path="/travel/booking/:carId" element={<ProtectedAuth><TravelBooking /></ProtectedAuth>} />
            <Route path="/booking/confirm" element={<ProtectedAuth><TravelBookingConfirm /></ProtectedAuth>} />
            <Route path="/travel/booking/confirm" element={<ProtectedAuth><TravelBookingConfirm /></ProtectedAuth>} />
            <Route path="/booking/success" element={<ProtectedAuth><TravelBookingSuccess /></ProtectedAuth>} />
            <Route path="/travel/booking/success" element={<ProtectedAuth><TravelBookingSuccess /></ProtectedAuth>} />
            <Route path="/my-trips" element={<ProtectedAuth><MyTravelTrips /></ProtectedAuth>} />
            <Route path="/travel/my-trips" element={<ProtectedAuth><MyTravelTrips /></ProtectedAuth>} />
            <Route path="/profile" element={<ProtectedAuth><UserProfile /></ProtectedAuth>} />
            <Route path="/travel/profile" element={<ProtectedAuth><UserProfile /></ProtectedAuth>} />
            <Route path="/map" element={<TravelMap />} />
            <Route path="/travel/map" element={<TravelMap />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/travel/help" element={<HelpPage />} />
            <Route path="/guide" element={<GuidePage />} />
            <Route path="/how-it-works" element={<GuidePage />} />
            <Route path="/travel/guide" element={<GuidePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/travel/about" element={<AboutPage />} />

            <Route path="/admin" element={<ProtectedAdmin><AdminTravelDashboard /></ProtectedAdmin>} />
            <Route path="/admin/destinations" element={<ProtectedAdmin><AdminTravelDestinations /></ProtectedAdmin>} />
            <Route path="/admin/partners" element={<ProtectedAdmin><AdminTravelPartners /></ProtectedAdmin>} />
            <Route path="/admin/cars" element={<ProtectedAdmin><AdminTravelCars /></ProtectedAdmin>} />
            <Route path="/admin/bookings" element={<ProtectedAdmin><AdminTravelBookings /></ProtectedAdmin>} />
            <Route path="/admin/storage" element={<ProtectedAdmin><AdminTravelStorage /></ProtectedAdmin>} />
            <Route path="/admin/locations" element={<ProtectedAdmin><AdminTravelLocations /></ProtectedAdmin>} />
            <Route path="/admin/analytics" element={<ProtectedAdmin><AdminAnalytics /></ProtectedAdmin>} />
            <Route path="/admin/promotions" element={<ProtectedAdmin><AdminPromotions /></ProtectedAdmin>} />
            <Route path="/admin/settings" element={<ProtectedAdmin><AdminSettings /></ProtectedAdmin>} />
            <Route path="/admin/users" element={<ProtectedAdmin><AdminUsers /></ProtectedAdmin>} />

            <Route path="/partner" element={<ProtectedPartner><PartnerDashboard /></ProtectedPartner>} />
            <Route path="/partner/cars" element={<ProtectedPartner><PartnerCars /></ProtectedPartner>} />
            <Route path="/partner/bookings" element={<ProtectedPartner><PartnerBookings /></ProtectedPartner>} />
            <Route path="/partner/storage" element={<ProtectedPartner><PartnerStorage /></ProtectedPartner>} />
            <Route path="/partner/scan" element={<ProtectedPartner><PartnerScan /></ProtectedPartner>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
    </>
  );
}
