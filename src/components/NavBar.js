import React from 'react';

export default function NavBar({ screen, onHome, onCreate, onProfile }) {
  const navBase = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', background: 'none', border: 'none', padding: 0, cursor: 'pointer' };
  const navOn   = { ...navBase, color: 'oklch(0.97 0.005 285)' };
  const navOff  = { ...navBase, color: 'oklch(0.5 0.01 285)' };

  const isHome    = screen === 'home';
  const isProfile = screen === 'profile' || screen === 'editProfile';

  return (
    <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', zIndex: 70, padding: '0 22px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderRadius: '22px', background: 'rgba(14,11,20,0.82)', backdropFilter: 'blur(20px)', border: '1px solid oklch(1 0 0/0.09)', boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}>
        <button onClick={onHome} style={isHome ? navOn : navOff}>
          <div style={{ width: '20px', height: '18px', position: 'relative' }}>
            <div style={{ position: 'absolute', bottom: 0, width: '18px', height: '11px', border: '2px solid currentColor', borderTop: 'none', borderRadius: '0 0 3px 3px' }} />
            <div style={{ position: 'absolute', top: 0, left: '1px', width: 0, height: 0, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderBottom: '8px solid currentColor' }} />
          </div>
          <span style={{ fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.3px' }}>Home</span>
        </button>
        <button onClick={onCreate} className="nav-plus" style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(120deg,oklch(0.7 0.2 5),oklch(0.64 0.2 290))', boxShadow: '0 8px 24px oklch(0.64 0.2 320/0.4)', marginTop: '-24px', border: 'none', cursor: 'pointer' }}>
          <span style={{ fontSize: '28px', fontWeight: 300, color: '#fff', lineHeight: 0.6 }}>+</span>
        </button>
        <button onClick={onProfile} style={isProfile ? navOn : navOff}>
          <div style={{ width: '18px', height: '18px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: '5px', width: '8px', height: '8px', borderRadius: '50%', border: '2px solid currentColor' }} />
            <div style={{ position: 'absolute', bottom: 0, width: '18px', height: '8px', border: '2px solid currentColor', borderBottom: 'none', borderRadius: '9px 9px 0 0' }} />
          </div>
          <span style={{ fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.3px' }}>You</span>
        </button>
      </div>
    </div>
  );
}
