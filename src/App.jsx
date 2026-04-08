import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import { doc, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';
import LandingPage from './pages/LandingPage';
import DataPage from './pages/DataPage';
import AuthForm from './components/AuthForm';
import { auth, db } from './firebase';
import { ThemeProvider } from './ThemeContext';

function App() {
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const ensureUserDocument = async (firebaseUser) => {
    if (!firebaseUser) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return;
    }

    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      // Only create if it doesn't exist
      if (!userDocSnap.exists()) {
        await setDoc(userDocRef, {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || null,
          photoURL: firebaseUser.photoURL || null,
          provider: firebaseUser.providerData[0]?.providerId || 'unknown',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      const errorCode = error?.code || '';
      const errorMessage = String(error?.message || '').toLowerCase();
      const isOfflineError =
        errorCode === 'unavailable' ||
        errorCode === 'failed-precondition' ||
        errorMessage.includes('offline');

      if (isOfflineError) {
        return;
      }

      console.error('Error ensuring user document:', error);
    }
  };

  useEffect(() => {
    // Handle redirect result from Google sign-in
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          // User was redirected back from Google auth
          console.log('User authenticated via redirect:', result.user.email);
          await ensureUserDocument(result.user);
        }
      } catch (error) {
        console.error('Redirect result error:', error);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (nextUser) {
        setUser(nextUser);
        // Ensure user document exists on every auth state change
        await ensureUserDocument(nextUser);
      } else {
        setUser(null);
      }
      setIsAuthLoading(false);
    });

    handleRedirectResult();

    return () => unsubscribe();
  }, []);

  if (isAuthLoading) {
    return <div className="auth-wrapper">Checking session...</div>;
  }

  return (
    <ThemeProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={user ? <DataPage user={user} /> : <LandingPage />} />
            <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthForm />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;