import React from 'react';
import { serif, coverStr, avStr } from '../utils/colorHelpers';

export default function HomeContainer({ galleries, user, profile, onOpenGallery, onGoProfile }) {
  const avatarSrc = profile.avatarUrl || user?.photoURL || null;

  return (
    <div style={{ position: 'relative', zIndex: 1, animation: 'fadeUp .55s ease both' }}>

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 20px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '9px' }}>
          <div style={{ fontFamily: serif, fontSize: '30px', letterSpacing: '0.5px', lineHeight: 1 }}>Encore</div>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'linear-gradient(120deg,oklch(0.7 0.2 5),oklch(0.64 0.2 290))', animation: 'pulse 2.4s ease-in-out infinite' }} />
        </div>
        <div onClick={onGoProfile} className="profile-btn" style={{ width: '34px', height: '34px', borderRadius: '50%', border: '1.5px solid oklch(1 0 0/0.16)', cursor: 'pointer', overflow: 'hidden', flexShrink: 0 }}>
          {avatarSrc
            ? <img src={avatarSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'linear-gradient(135deg,oklch(0.62 0.18 5),oklch(0.55 0.18 290))' }} />
          }
        </div>
      </div>

      {/* search */}
      <div style={{ padding: '0 20px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '14px', background: 'oklch(0.2 0.014 285/0.6)', border: '1px solid oklch(1 0 0/0.07)', backdropFilter: 'blur(8px)' }}>
          <div style={{ width: '14px', height: '14px', border: '1.6px solid oklch(0.6 0.01 285)', borderRadius: '50%', position: 'relative', flex: 'none' }}>
            <div style={{ position: 'absolute', width: '6px', height: '1.6px', background: 'oklch(0.6 0.01 285)', bottom: '-3px', right: '-3px', transform: 'rotate(45deg)' }} />
          </div>
          <div style={{ color: 'oklch(0.62 0.01 285)', fontSize: '14.5px' }}>Search artists, venues, cities…</div>
        </div>
      </div>

      {/* filter tabs */}
      <div style={{ display: 'flex', gap: '8px', padding: '2px 20px 18px', overflowX: 'auto' }}>
        <div style={{ flex: 'none', padding: '8px 16px', borderRadius: '999px', fontSize: '13px', fontWeight: 600, background: 'linear-gradient(120deg,oklch(0.7 0.2 5),oklch(0.64 0.2 290))', color: '#fff' }}>For you</div>
        {['This month', 'Near you', 'Following'].map(tab => (
          <div key={tab} style={{ flex: 'none', padding: '8px 16px', borderRadius: '999px', fontSize: '13px', fontWeight: 500, background: 'oklch(0.2 0.014 285/0.7)', border: '1px solid oklch(1 0 0/0.07)', color: 'oklch(0.8 0.01 285)' }}>{tab}</div>
        ))}
      </div>

      {/* featured card */}
      {galleries.length > 0 && (() => {
        const g   = galleries[0];
        const avs = [g.h1, g.h2, (g.h1 + 40) % 360, (g.h2 - 30 + 360) % 360];
        return (
          <div style={{ padding: '0 20px' }}>
            <div onClick={() => onOpenGallery(g.id)} className="gallery-card" style={{ position: 'relative', borderRadius: '20px', overflow: 'hidden', cursor: 'pointer', aspectRatio: '4/5', boxShadow: '0 18px 50px rgba(0,0,0,0.5)' }}>
              <div style={{ position: 'absolute', inset: 0, animation: 'ken 16s ease-in-out infinite alternate', background: coverStr(g.h1, g.h2) }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(6,5,12,0.92) 4%,rgba(6,5,12,0.2) 48%,rgba(6,5,12,0.35) 100%)' }} />
              <div style={{ position: 'absolute', top: '16px', left: '16px', display: 'flex', alignItems: 'center', gap: '7px', padding: '6px 12px', borderRadius: '999px', background: 'rgba(10,8,16,0.55)', backdropFilter: 'blur(8px)', border: '1px solid oklch(1 0 0/0.12)' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'oklch(0.72 0.21 5)', animation: 'pulse 2s ease-in-out infinite' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase' }}>Trending gallery</span>
              </div>
              <div style={{ position: 'absolute', left: '20px', right: '20px', bottom: '20px' }}>
                <div style={{ fontFamily: serif, fontSize: '46px', lineHeight: 0.96, letterSpacing: '0.3px' }}>{g.artist}</div>
                <div style={{ marginTop: '10px', fontSize: '14px', color: 'oklch(0.84 0.01 285)' }}>{g.venue + ' · ' + g.city}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '16px' }}>
                  <div style={{ display: 'flex' }}>
                    {avs.map((h, i) => (
                      <div key={i} style={{ width: '26px', height: '26px', borderRadius: '50%', border: '2px solid #0a0810', marginLeft: i === 0 ? 0 : '-8px', background: avStr(h) }} />
                    ))}
                  </div>
                  <div style={{ fontSize: '13px', color: 'oklch(0.78 0.01 285)', fontWeight: 500 }}>{g.photoCount} photos · {g.videoCount} videos · {g.contribCount} fans</div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* recent header */}
      <div style={{ padding: '30px 20px 8px', fontFamily: serif, fontSize: '22px', color: 'oklch(0.88 0.01 285)' }}>Recent galleries</div>

      {/* feed */}
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {galleries.slice(1).map(g => {
          const avs = [g.h1, g.h2, (g.h1 + 40) % 360];
          return (
            <div key={g.id} onClick={() => onOpenGallery(g.id)} className="feed-card" style={{ position: 'relative', borderRadius: '18px', overflow: 'hidden', cursor: 'pointer', aspectRatio: '16/11', animation: 'fadeUp .5s ease both', boxShadow: '0 12px 34px rgba(0,0,0,0.4)' }}>
              <div className="feed-cover" style={{ position: 'absolute', inset: 0, background: coverStr(g.h1, g.h2) }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(6,5,12,0.9),rgba(6,5,12,0.05) 60%)' }} />
              <div style={{ position: 'absolute', top: '14px', right: '14px', padding: '6px 11px', borderRadius: '999px', background: 'rgba(10,8,16,0.5)', backdropFilter: 'blur(8px)', border: '1px solid oklch(1 0 0/0.1)', fontSize: '11.5px', fontWeight: 600, letterSpacing: '0.3px' }}>{g.month} {g.year}</div>
              <div style={{ position: 'absolute', left: '18px', right: '18px', bottom: '16px' }}>
                <div style={{ fontFamily: serif, fontSize: '30px', lineHeight: 1 }}>{g.artist}</div>
                <div style={{ marginTop: '5px', fontSize: '13px', color: 'oklch(0.8 0.01 285)' }}>{g.venue + ' · ' + g.city}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
                  <div style={{ display: 'flex' }}>
                    {avs.map((h, i) => (
                      <div key={i} style={{ width: '22px', height: '22px', borderRadius: '50%', border: '2px solid #0a0810', marginLeft: i === 0 ? 0 : '-7px', background: avStr(h) }} />
                    ))}
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'oklch(0.72 0.01 285)', fontWeight: 500 }}>{g.photoCount} photos · {g.videoCount} videos · {g.contribCount} fans</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
