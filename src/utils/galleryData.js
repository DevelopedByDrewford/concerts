import { rand } from './colorHelpers';

export function buildGalleries() {
  const defs = [
    { artist: 'Phoebe Bridgers', venue: 'The Greek Theatre', city: 'Los Angeles',  month: 'Sep', year: '2025', h1: 330, h2: 285 },
    { artist: 'Fred again..',    venue: 'Brooklyn Steel',    city: 'New York',      month: 'Nov', year: '2025', h1: 288, h2: 200 },
    { artist: 'Mitski',          venue: 'The Fillmore',      city: 'San Francisco', month: 'Aug', year: '2025', h1: 18,  h2: 330 },
    { artist: 'Bonobo',          venue: 'Red Rocks',         city: 'Morrison, CO',  month: 'Jul', year: '2025', h1: 200, h2: 160 },
    { artist: 'Jamie xx',        venue: 'Aragon Ballroom',   city: 'Chicago',       month: 'Oct', year: '2025', h1: 285, h2: 335 },
    { artist: 'Beach House',     venue: 'The Anthem',        city: 'Washington DC', month: 'Jun', year: '2025', h1: 262, h2: 205 },
  ];
  const names   = ['mara.k', 'dustinr', 'leoshoots', 'ava_m', 'noah.p', 'sofia.l', 'kenji', 'remy_w', 'tash'];
  const aspects = [1.25, 1.33, 1, 1.25, 1.78, 1.33, 1.25, 1, 1.5];

  defs.forEach((g, gi) => {
    const n = 9 + (gi % 3) * 2;
    g.media = [];
    let vid = 0, own = 0;
    for (let i = 0; i < n; i++) {
      const r      = rand(gi * 100 + i);
      const isVid  = r > 0.79;
      const isOwn  = rand(gi * 100 + i + 7) > 0.66;
      if (isVid) vid++;
      if (isOwn) own++;
      g.media.push({
        id:        gi + '-' + i,
        ratio:     aspects[i % aspects.length],
        type:      isVid ? 'video' : 'photo',
        duration:  isVid ? '0:' + (12 + Math.floor(r * 44)) : null,
        h1:        g.h1 + (r * 46 - 23),
        h2:        g.h2 + (rand(gi + i) * 30 - 15),
        L:         0.16 + r * 0.12,
        isOwn,
        ownerName: isOwn ? 'you' : names[Math.floor(rand(gi * 7 + i) * names.length)],
        ownerH:    isOwn ? 320 : Math.floor(rand(gi * 13 + i) * 360),
      });
    }
    g.id          = String(gi);
    g.photoCount  = g.media.filter(m => m.type === 'photo').length;
    g.videoCount  = vid;
    g.contribCount = 6 + (gi * 5 + 3) % 40;
    g.ownCount    = own;
  });
  return defs;
}

export const INITIAL_GALLERIES = buildGalleries();
