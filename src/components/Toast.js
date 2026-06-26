import React from 'react';

export default function Toast({ message }) {
  if (!message) return null;
  return (
    <div style={{ position: 'fixed', bottom: '108px', left: '50%', transform: 'translateX(-50%)', zIndex: 90, padding: '12px 20px', borderRadius: '999px', background: 'oklch(0.24 0.015 285/0.95)', backdropFilter: 'blur(10px)', border: '1px solid oklch(1 0 0/0.12)', fontSize: '13.5px', fontWeight: 500, boxShadow: '0 10px 30px rgba(0,0,0,0.5)', animation: 'pop .4s ease both', whiteSpace: 'nowrap' }}>
      {message}
    </div>
  );
}
