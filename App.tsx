import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import HomePage from './pages/HomePage';
import CostingEnginePage from './pages/CostingEnginePage';
import ResultsPage from './pages/ResultsPage';
import InventoryPage from './pages/InventoryPage';
import SalesPage from './pages/SalesPage';
import OutflowPage from './pages/OutflowPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import TercerosPage from './pages/TercerosPage';

import LiquidLoader from './components/LiquidLoader';

// Wrapper for protected routes
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, loading } = useApp();

    if (loading) {
        return <LiquidLoader />;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};

// Theme Wrapper Component
const ThemeWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { theme, isTransitioning } = useApp();

    return (
        <>
            {/* Smooth Transition Overlay */}
            <div className={`theme-transition-overlay ${isTransitioning ? 'active' : ''}`} />

            {/* Galaxy Theme Background Effects */}
            {theme === 'galaxy' && (
                <>
                    <div className="galaxy-bg" />
                    <div className="galaxy-stars" />
                </>
            )}

            {children}
        </>
    );
};

// Shooting Stars Component (Only for Galaxy Theme on Dashboard/Home)
export const ShootingStars: React.FC = () => {
    const { theme } = useApp();

    if (theme !== 'galaxy') return null;

    return (
        <div className="shooting-stars-container">
            <div className="shooting-star" />
            <div className="shooting-star" />
            <div className="shooting-star" />
            <div className="shooting-star" />
            <div className="shooting-star" />
        </div>
    );
};

const App: React.FC = () => {
    return (
        <AppProvider>
            <HashRouter>
                <ThemeWrapper>
                    <div className="relative">
                        <Routes>
                            {/* Public Routes */}
                            <Route path="/" element={<LoginPage />} />
                            <Route path="/login" element={<LoginPage />} />

                            {/* Protected Routes */}
                            <Route path="/home" element={
                                <ProtectedRoute>
                                    <HomePage />
                                </ProtectedRoute>
                            } />
                            <Route path="/costing-engine" element={
                                <ProtectedRoute>
                                    <CostingEnginePage />
                                </ProtectedRoute>
                            } />
                            <Route path="/results" element={
                                <ProtectedRoute>
                                    <ResultsPage />
                                </ProtectedRoute>
                            } />
                            <Route path="/inventory" element={
                                <ProtectedRoute>
                                    <InventoryPage />
                                </ProtectedRoute>
                            } />
                            <Route path="/settings" element={
                                <ProtectedRoute>
                                    <SettingsPage />
                                </ProtectedRoute>
                            } />
                            <Route path="/sales" element={
                                <ProtectedRoute>
                                    <SalesPage />
                                </ProtectedRoute>
                            } />
                            <Route path="/outflow" element={
                                <ProtectedRoute>
                                    <OutflowPage />
                                </ProtectedRoute>
                            } />
                            <Route path="/terceros" element={
                                <ProtectedRoute>
                                    <TercerosPage />
                                </ProtectedRoute>
                            } />

                        </Routes>
                    </div>
                </ThemeWrapper>
            </HashRouter>
        </AppProvider>
    );
};

export default App;