import { Fragment } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MapPage from './pages/MapPage';
import UserProfilePage from './pages/UserProfilePage';

function App() {
  return (
    <Fragment>
      <Routes>
        <Route path="/" element={<Navigate to="/map" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/profile" element={<UserProfilePage />} />
      </Routes>
    </Fragment>
  );
}

export default App;
