import React from 'react';
import './NavBar.css';

export default function NavBar({ screen, onHome, onCreate, onProfile }) {
  const isHome    = screen === 'home';
  const isProfile = screen === 'profile' || screen === 'editProfile' || screen === 'followList';

  return (
    <div className="nav-bar">
      <div className="nav-bar__inner">
        <button onClick={onHome} className={isHome ? 'nav-btn nav-btn--active' : 'nav-btn'}>
          <div className="nav-btn__icon">
            <div className="nav-btn__icon--home-base" />
            <div className="nav-btn__icon--home-roof" />
          </div>
          <span className="nav-btn__label">Home</span>
        </button>

        <button onClick={onCreate} className="nav-plus">
          <span className="nav-plus__icon">+</span>
        </button>

        <button onClick={onProfile} className={isProfile ? 'nav-btn nav-btn--active' : 'nav-btn'}>
          <div className="nav-btn__icon--user">
            <div className="nav-btn__icon--user-head" />
            <div className="nav-btn__icon--user-body" />
          </div>
          <span className="nav-btn__label">You</span>
        </button>
      </div>
    </div>
  );
}
