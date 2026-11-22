import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { AuthProvider, useAuth } from './lib/core';
import { SchemeMitra } from './components/ShellAndUi';
import {
  Landing,
  Login,
  Register,
  LaborerDashboard,
  LaborerSchemes,
  LaborerProfile,
  ContractorDashboard,
  PolicyNews,
} from './pages/AllPages';

function ProtectedRoute({ children, allowedRole }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xs text-zinc-500">
        Verifying encrypted session...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to={user.role === 'contractor' ? '/contractor' : '/laborer'} replace />;
  }
  return children;
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/laborer"
          element={
            <ProtectedRoute allowedRole="laborer">
              <LaborerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/laborer/schemes"
          element={
            <ProtectedRoute allowedRole="laborer">
              <LaborerSchemes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/laborer/profile"
          element={
            <ProtectedRoute allowedRole="laborer">
              <LaborerProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contractor"
          element={
            <ProtectedRoute allowedRole="contractor">
              <ContractorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/news"
          element={
            <ProtectedRoute>
              <PolicyNews />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AnimatedRoutes />
        <SchemeMitra />
      </AuthProvider>
    </BrowserRouter>
  );
}