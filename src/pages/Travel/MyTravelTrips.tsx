import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/** Redirect legacy /my-trips route to profile trips tab */
export function MyTravelTrips() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/profile?tab=trips', { replace: true });
  }, [navigate]);
  return null;
}

export default MyTravelTrips;
