import React from 'react';

export default function LoginModal({ loading, onSignIn, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(5,4,9,0.78)', backdropFilter: 'blur(18px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', maxWidth: '480px', margin: '0 auto', animation: 'fadeIn .25s ease both' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', padding: '32px 24px 44px', borderRadius: '28px 28px 0 0', background: 'linear-gradient(180deg, oklch(0.16 0.018 285), oklch(0.12 0.014 285))', border: '1px solid oklch(1 0 0/0.1)', borderBottom: 'none', boxShadow: '0 -24px 60px rgba(0,0,0,0.6)', animation: 'fadeUp .3s ease both' }}>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
          <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'oklch(1 0 0/0.15)' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: '34px', letterSpacing: '0.5px', lineHeight: 1 }}>Encore</div>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'linear-gradient(120deg,oklch(0.7 0.2 5),oklch(0.64 0.2 290))', animation: 'pulse 2.4s ease-in-out infinite' }} />
        </div>
        <div style={{ fontSize: '15px', color: 'oklch(0.68 0.01 285)', lineHeight: 1.5, marginBottom: '32px' }}>Save your shots, see who else was there, and revisit every show.</div>

        <button
          onClick={onSignIn}
          disabled={loading}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '15px 20px', borderRadius: '14px', background: loading ? 'oklch(0.88 0 0)' : '#fff', border: 'none', cursor: loading ? 'default' : 'pointer', fontSize: '15px', fontWeight: 600, color: '#1f1f1f', boxShadow: '0 4px 16px rgba(0,0,0,0.3)', transition: 'opacity .15s ease', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? (
            <div style={{ width: '20px', height: '20px', border: '2px solid #ccc', borderTopColor: '#555', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
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

        <div style={{ textAlign: 'center', fontSize: '12px', color: 'oklch(0.48 0.01 285)', marginTop: '16px', lineHeight: 1.5 }}>By continuing you agree to our terms. We only use your account to identify you.</div>
      </div>
    </div>
  );
}
