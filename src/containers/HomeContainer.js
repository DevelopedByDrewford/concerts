import React from 'react';
import './HomeContainer.css';
import { coverStr, avStr } from '../utils/colorHelpers';

export default function HomeContainer({ galleries, user, profile, onOpenGallery, onGoProfile }) {
  const avatarSrc = profile.avatarUrl || user?.photoURL || null;

  return (
    <div className="home">

      <div className="home__header">
        <div className="home__wordmark">
          <span className="home__wordmark-title">Encore</span>
          <div className="home__dot" />
        </div>
        <div onClick={onGoProfile} className="home__avatar profile-btn">
          {avatarSrc
            ? <img src={avatarSrc} alt="" />
            : <div className="home__avatar-placeholder" />
          }
        </div>
      </div>

      <div className="home__search">
        <div className="home__search-inner">
          <div className="home__search-icon" />
          <span className="home__search-text">Search artists, venues, cities…</span>
        </div>
      </div>

      <div className="home__tabs">
        <div className="home__tab--active">For you</div>
        {['This month', 'Near you', 'Following'].map(tab => (
          <div key={tab} className="home__tab">{tab}</div>
        ))}
      </div>

      {galleries.length > 0 && (() => {
        const g   = galleries[0];
        const avs = [g.h1, g.h2, (g.h1 + 40) % 360, (g.h2 - 30 + 360) % 360];
        return (
          <div className="home__featured">
            <div onClick={() => onOpenGallery(g.id)} className="home__gallery-card gallery-card">
              <div className="home__gallery-cover" style={{ background: coverStr(g.h1, g.h2) }} />
              <div className="home__gallery-scrim" />
              <div className="home__gallery-badge">
                <div className="home__gallery-badge-dot" />
                <span className="home__gallery-badge-label">Trending gallery</span>
              </div>
              <div className="home__gallery-info">
                <div className="home__gallery-title">{g.artist}</div>
                <div className="home__gallery-meta">{g.venue + ' · ' + g.city}</div>
                <div className="home__gallery-fans">
                  <div className="home__gallery-fan-avatars">
                    {avs.map((h, i) => (
                      <div key={i} className="home__gallery-fan-avatar" style={{ background: avStr(h) }} />
                    ))}
                  </div>
                  <span className="home__gallery-fan-count">{g.photoCount} photos · {g.videoCount} videos · {g.contribCount} fans</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="home__section-title">Recent galleries</div>

      <div className="home__feed">
        {galleries.slice(1).map(g => {
          const avs = [g.h1, g.h2, (g.h1 + 40) % 360];
          return (
            <div key={g.id} onClick={() => onOpenGallery(g.id)} className="feed-card">
              <div className="feed-cover" style={{ background: coverStr(g.h1, g.h2) }} />
              <div className="feed-card__scrim" />
              <div className="feed-card__date">{g.month} {g.year}</div>
              <div className="feed-card__info">
                <div className="feed-card__title">{g.artist}</div>
                <div className="feed-card__meta">{g.venue + ' · ' + g.city}</div>
                <div className="feed-card__fans">
                  <div className="feed-card__fan-avatars">
                    {avs.map((h, i) => (
                      <div key={i} className="feed-card__fan-avatar" style={{ background: avStr(h) }} />
                    ))}
                  </div>
                  <span className="feed-card__fan-count">{g.photoCount} photos · {g.videoCount} videos · {g.contribCount} fans</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
