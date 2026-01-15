import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import HomePage from './pages/HomePage';
import CostingEnginePage from './pages/CostingEnginePage';
import ResultsPage from './pages/ResultsPage';
import InventoryPage from './pages/InventoryPage';
import SettingsPage from './pages/SettingsPage';

const App: React.FC = () => {
    return (
        <AppProvider>
            <HashRouter>
                <div className="relative">
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/costing-engine" element={<CostingEnginePage />} />
                        <Route path="/results" element={<ResultsPage />} />
                        <Route path="/inventory" element={<InventoryPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                    </Routes>
                </div>
            </HashRouter>
        </AppProvider>
    );
};

export default App;