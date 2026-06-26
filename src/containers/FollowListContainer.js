import React from 'react';
import './FollowListContainer.css';
import { avStr, uidToHue } from '../utils/colorHelpers';

export default function FollowListContainer({ type, list, loading, onBack, onOpenProfile }) {
  return (
    <div className="follow-list">
      <div className="follow-list__header">
        <button onClick={onBack} className="btn-back">‹</button>
        <span className="follow-list__title">{type === 'followers' ? 'Followers' : 'Following'}</span>
        <div className="follow-list__header-spacer" />
      </div>

      {loading && (
        <div className="follow-list__loading">
          <div className="spinner" style={{ width: '24px', height: '24px', border: '2px solid oklch(1 0 0/0.12)', borderTopColor: 'var(--c-text-dim)' }} />
        </div>
      )}

      {!loading && list.length === 0 && (
        <div className="follow-list__empty">
          {type === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
        </div>
      )}

      {!loading && list.length > 0 && (
        <div className="follow-list__items">
          {list.map(person => {
            const hasProfile = !!person.username;
            return (
              <div
                key={person.uid}
                onClick={() => hasProfile && onOpenProfile(person.username)}
                className={`follow-list__item${hasProfile ? '' : ' follow-list__item--no-profile'}`}
              >
                <div className="follow-list__avatar-wrap">
                  <div className="follow-list__avatar-bg" style={{ background: avStr(uidToHue(person.uid)) }} />
                  {person.profilePhotoUrl && (
                    <img src={person.profilePhotoUrl} alt="" className="follow-list__avatar-img" />
                  )}
                </div>
                <div className="follow-list__info">
                  <div className="follow-list__name">{person.name || 'Encore user'}</div>
                  {person.username && <div className="follow-list__handle">@{person.username}</div>}
                </div>
                {hasProfile && <span className="follow-list__chevron">›</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
