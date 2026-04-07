import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import LandingPage from './pages/LandingPage';
import DataPage from './pages/DataPage';
import AuthForm from './components/AuthForm';
import { auth } from './firebase';

function App() {
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (isAuthLoading) {
    return <div className="auth-wrapper">Checking session...</div>;
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={user ? <DataPage /> : <LandingPage />} />
          <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthForm />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;