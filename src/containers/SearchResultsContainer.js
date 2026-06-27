import React from 'react';
import './SearchResultsContainer.css';
import { avStr, uidToHue } from '../utils/colorHelpers';

function Section({ title, children }) {
  return (
    <div className="search-results__section">
      <div className="search-results__section-title">{title}</div>
      {children}
    </div>
  );
}

export default function SearchResultsContainer({ query, results, loading, onBack, onOpenProfile }) {
  const isEmpty = results &&
    results.users.length === 0 &&
    results.artists.length === 0 &&
    results.cities.length === 0 &&
    results.venues.length === 0;

  return (
    <div className="search-results">
      <div className="search-results__header">
        <button onClick={onBack} className="btn-back">‹</button>
        <div className="search-results__query">"{query}"</div>
      </div>

      {loading && (
        <div className="search-results__loading">
          <div className="spinner" style={{ width: '24px', height: '24px', border: '2px solid oklch(1 0 0/0.12)', borderTopColor: 'var(--c-text-dim)' }} />
        </div>
      )}

      {!loading && isEmpty && (
        <div className="search-results__empty">No results for "{query}"</div>
      )}

      {!loading && results && (
        <>
          {results.users.length > 0 && (
            <Section title="People">
              {results.users.map(u => {
                const tappable = !!u.username;
                return (
                  <div
                    key={u.uid}
                    className={`search-results__user${tappable ? ' search-results__user--tappable' : ''}`}
                    onClick={() => tappable && onOpenProfile(u.username)}
                  >
                    <div className="search-results__avatar" style={{ background: avStr(uidToHue(u.uid)) }}>
                      {u.profilePhotoUrl && <img src={u.profilePhotoUrl} alt="" />}
                    </div>
                    <div className="search-results__user-info">
                      <div className="search-results__user-name">{u.name || 'Encore user'}</div>
                      {u.username && <div className="search-results__user-handle">@{u.username}</div>}
                    </div>
                    {tappable && <span className="search-results__chevron">›</span>}
                  </div>
                );
              })}
            </Section>
          )}

          {results.artists.length > 0 && (
            <Section title="Artists">
              {results.artists.map(({ artist, count }) => (
                <div key={artist} className="search-results__row">
                  <div className="search-results__row-icon search-results__row-icon--artist">♪</div>
                  <div className="search-results__row-info">
                    <div className="search-results__row-name">{artist}</div>
                    <div className="search-results__row-sub">{count} {count === 1 ? 'gallery' : 'galleries'}</div>
                  </div>
                </div>
              ))}
            </Section>
          )}

          {results.cities.length > 0 && (
            <Section title="Cities">
              {results.cities.map(({ city, count }) => (
                <div key={city} className="search-results__row">
                  <div className="search-results__row-icon search-results__row-icon--city">◎</div>
                  <div className="search-results__row-info">
                    <div className="search-results__row-name">{city}</div>
                    <div className="search-results__row-sub">{count} {count === 1 ? 'gallery' : 'galleries'}</div>
                  </div>
                </div>
              ))}
            </Section>
          )}

          {results.venues.length > 0 && (
            <Section title="Venues">
              {results.venues.map(({ venue, city, count }) => (
                <div key={`${venue}||${city}`} className="search-results__row">
                  <div className="search-results__row-icon search-results__row-icon--venue">▣</div>
                  <div className="search-results__row-info">
                    <div className="search-results__row-name">{venue}</div>
                    <div className="search-results__row-sub">{city} · {count} {count === 1 ? 'gallery' : 'galleries'}</div>
                  </div>
                </div>
              ))}
            </Section>
          )}
        </>
      )}
    </div>
  );
}
