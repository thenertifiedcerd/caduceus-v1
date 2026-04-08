import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithRedirect,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { updateMetaTags } from '../utils/seo';
import './AuthForm.css';
import { auth, db } from '../firebase';

const mapIdentityToolkitMessage = (message, isLoginMode) => {
  switch (message) {
    case 'EMAIL_EXISTS':
      return 'That email is already registered. Try signing in instead.';
    case 'OPERATION_NOT_ALLOWED':
      return 'Email/password sign-in is not enabled in Firebase. Enable it in Authentication > Sign-in method.';
    case 'TOO_MANY_ATTEMPTS_TRY_LATER':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'INVALID_PASSWORD':
    case 'INVALID_LOGIN_CREDENTIALS':
      return isLoginMode ? 'Incorrect email or password.' : 'Could not create account with these credentials.';
    case 'USER_DISABLED':
      return 'This account has been disabled.';
    case 'EMAIL_NOT_FOUND':
      return 'No account found for this email.';
    default:
      return '';
  }
};

const getIdentityToolkitMessageFromError = (firebaseError) => {
  const serverResponse = firebaseError?.customData?._serverResponse;

  if (!serverResponse || typeof serverResponse !== 'string') {
    return '';
  }

  try {
    const parsed = JSON.parse(serverResponse);
    return parsed?.error?.message || '';
  } catch {
    return '';
  }
};

const getAuthErrorMessage = (firebaseError, isLoginMode) => {
  const code = firebaseError?.code || '';
  const identityToolkitMessage = getIdentityToolkitMessageFromError(firebaseError);
  const mappedToolkitMessage = mapIdentityToolkitMessage(identityToolkitMessage, isLoginMode);

  if (mappedToolkitMessage) {
    return mappedToolkitMessage;
  }

  switch (code) {
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is not enabled in Firebase. Enable it in Authentication > Sign-in method.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/missing-password':
      return 'Please enter your password.';
    case 'auth/weak-password':
      return 'Password is too weak. Use at least 6 characters.';
    case 'auth/email-already-in-use':
      return 'That email is already registered. Try signing in instead.';
    case 'auth/user-not-found':
      return 'No account found for this email.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return isLoginMode ? 'Incorrect email or password.' : 'Could not create account with these credentials.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Could not reach Firebase Auth from the browser. Disable ad blockers/VPN/proxy for localhost and try again.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was canceled before completion.';
    case 'auth/popup-blocked':
      return 'Popup was blocked by your browser. Allow popups and try again.';
    default:
      return firebaseError?.message || 'Authentication failed. Please try again.';
  }
};

const AuthForm = ({ onLogin }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    updateMetaTags({
      title: 'Sign In or Create Account - Caduceus',
      description: 'Join Caduceus to track your workouts, monitor health metrics, and achieve your fitness goals. Quick signup in less than a minute.',
    });
  }, []);

  const upsertUser = async (user, provider) => {
    await setDoc(
      doc(db, 'users', user.uid),
      {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || null,
        photoURL: user.photoURL || null,
        provider,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      let userCredential;

      if (isLoginMode) {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      }

      await upsertUser(userCredential.user, isLoginMode ? 'password-login' : 'password-signup');

      if (onLogin) {
        onLogin(userCredential.user);
      }

      navigate('/');
    } catch (firebaseError) {
      console.error('Firebase auth error:', firebaseError);
      setError(getAuthErrorMessage(firebaseError, isLoginMode));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      const provider = new GoogleAuthProvider();
      // Use redirect instead of popup for better mobile support
      // The result will be handled in App.jsx after redirect
      await signInWithRedirect(auth, provider);
    } catch (firebaseError) {
      console.error('Google auth error:', firebaseError);
      setError(getAuthErrorMessage(firebaseError, isLoginMode));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <p className="auth-kicker">Secure Access</p>
        <h2>{isLoginMode ? 'Login' : 'Sign Up'}</h2>
        <p className="auth-subtitle">Track workouts, meals, and health trends in one place.</p>
        <form onSubmit={handleSubmit}>
          {error ? <p className="auth-error">{error}</p> : null}

          <div className="auth-form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="name@example.com"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="auth-form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Password"
              required
              minLength={6}
              autoComplete={isLoginMode ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait...' : isLoginMode ? 'Sign In' : 'Create Account'}
          </button>

          <div className="auth-divider" aria-hidden="true">
            <span>or</span>
          </div>

          <button type="button" className="auth-google-btn" onClick={handleGoogleSignIn} disabled={isSubmitting}>
            Continue with Google
          </button>
        </form>

        <div className="auth-toggle-wrapper">
          <button
            type="button"
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setEmail('');
              setPassword('');
            }}
            className="auth-toggle-btn"
          >
            {isLoginMode ? "New to Caduceus? Sign Up" : "Already have an account? Login"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;