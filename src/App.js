import { Fragment, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { hydrateFromStorage } from './store/user-auth-slice';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MapPage from './pages/MapPage';
import UserProfilePage from './pages/UserProfilePage';

function App() {
  const dispatch = useDispatch();
  const isLoggedIn = useSelector((s) => s.auth.isLoggedIn);

  // При старте приложения гидратируемся из localStorage
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      dispatch(hydrateFromStorage(token));
    }
  }, [dispatch]);

  return (
    <Fragment>
      <Routes>
        {/* "/" ведёт на login, если не авторизован, или на карту, если вошёл */}
        <Route
          path="/"
          element={isLoggedIn ? <Navigate to="/map" replace /> : <Navigate to="/login" replace />}
        />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* защищённые маршруты */}
        <Route path="/map" element={isLoggedIn ? <MapPage /> : <Navigate to="/login" replace />} />
        <Route
          path="/profile"
          element={isLoggedIn ? <UserProfilePage /> : <Navigate to="/login" replace />}
        />
      </Routes>
    </Fragment>
  );
}

export default App;
