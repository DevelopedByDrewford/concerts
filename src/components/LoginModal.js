import React from 'react';
import './LoginModal.css';

export default function LoginModal({ loading, error, onSignIn, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>

        <div className="modal-drag-handle">
          <div className="modal-drag-handle__bar" />
        </div>

        <div className="modal-wordmark">
          <span className="modal-wordmark__title">Encore</span>
          <div className="modal-wordmark__dot" />
        </div>
        <div className="modal-tagline">Save your shots, see who else was there, and revisit every show.</div>

        <button onClick={onSignIn} disabled={loading} className="modal-google-btn">
          {loading ? (
            <div className="spinner modal-google-btn__spinner" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#4285F4" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
              <path fill="#34A853" d="M6.3 14.7l6.6 4.8C14.7 15.8 19 13 24 13c3.1 0 5.8 1.1 7.9 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
              <path fill="#FBBC05" d="M24 44c5.2 0 9.9-1.8 13.5-4.8l-6.2-5.2C29.4 35.6 26.8 36.5 24 36.5c-5.2 0-9.7-3.3-11.3-8l-6.6 5.1C9.5 39.5 16.3 44 24 44z"/>
              <path fill="#EA4335" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6.2 5.2C41.6 36.2 44 30.5 44 24c0-1.3-.1-2.6-.4-3.9z"/>
            </svg>
          )}
          {loading ? 'Signing in…' : 'Continue with Google'}
        </button>

        {error && <p className="modal-error">{error}</p>}

        <div className="modal-legal">By continuing you agree to our terms. We only use your account to identify you.</div>
      </div>
    </div>
  );
}
