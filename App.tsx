import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import HomePage from './pages/HomePage';
import CostingEnginePage from './pages/CostingEnginePage';
import ResultsPage from './pages/ResultsPage';
import InventoryPage from './pages/InventoryPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
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

const App: React.FC = () => {
    return (
        <AppProvider>
            <HashRouter>
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
                    </Routes>
                </div>
            </HashRouter>
        </AppProvider>
    );
};

export default App;