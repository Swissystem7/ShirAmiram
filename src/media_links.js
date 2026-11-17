// Recognise a YouTube or Spotify song link (or a bare ID) and build its public embed and open URLs.
// Client-side only: no API keys, no network calls. Anything that is not a recognised link returns null,
// and every URL this module returns is rebuilt from a validated ID, never copied from the input.
((root, factory) => {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ShirAmiramMediaLinks = factory();
})(typeof self !== 'undefined' ? self : this, () => {
  const YT_ID = /^[A-Za-z0-9_-]{11}$/;
  const YT_LIST = /^[A-Za-z0-9_-]{10,64}$/;
  const SP_ID = /^[A-Za-z0-9]{22}$/;
  const SP_KINDS = ['track', 'album', 'playlist'];
  const YT_HOSTS = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'];

  // "90", "90s", "1m30s", "1h2m3s" -> seconds; anything else -> 0
  function parseStart(value) {
    const v = String(value || '').trim();
    if (/^\d+$/.test(v)) return Number(v);
    const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(v);
    if (!m || !v) return 0;
    return Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0);
  }

  function youtube(id, start, music) {
    const q = start > 0 ? `?start=${start}` : '';
    const t = start > 0 ? `&t=${start}` : '';
    return {
      provider: 'youtube',
      kind: 'video',
      id,
      start,
      music: !!music,
      embedUrl: `https://www.youtube.com/embed/${id}${q}`,
      openUrl: music ? `https://music.youtube.com/watch?v=${id}${t}` : `https://www.youtube.com/watch?v=${id}${t}`,
      height: null
    };
  }

  function youtubePlaylist(list, music) {
    return {
      provider: 'youtube',
      kind: 'playlist',
      id: list,
      start: 0,
      music: !!music,
      embedUrl: `https://www.youtube.com/embed/videoseries?list=${list}`,
      openUrl: music ? `https://music.youtube.com/playlist?list=${list}` : `https://www.youtube.com/playlist?list=${list}`,
      height: null
    };
  }

  function spotify(kind, id) {
    return {
      provider: 'spotify',
      kind,
      id,
      start: 0,
      music: false,
      embedUrl: `https://open.spotify.com/embed/${kind}/${id}`,
      openUrl: `https://open.spotify.com/${kind}/${id}`,
      height: kind === 'track' ? 152 : 352
    };
  }

  function fromUrl(url) {
    const host = url.hostname.toLowerCase();
    const parts = url.pathname.split('/').filter(Boolean);
    if (YT_HOSTS.includes(host)) {
      const music = host === 'music.youtube.com';
      const start = parseStart(url.searchParams.get('t') || url.searchParams.get('start'));
      const v = url.searchParams.get('v');
      if (parts[0] === 'watch' && YT_ID.test(v || '')) return youtube(v, start, music);
      if (['shorts', 'embed', 'live', 'v'].includes(parts[0]) && YT_ID.test(parts[1] || '')) return youtube(parts[1], start, music);
      const list = url.searchParams.get('list');
      if ((parts[0] === 'playlist' || parts[0] === 'watch') && YT_LIST.test(list || '')) return youtubePlaylist(list, music);
      return null;
    }
    if (host === 'youtu.be') {
      return YT_ID.test(parts[0] || '') ? youtube(parts[0], parseStart(url.searchParams.get('t')), false) : null;
    }
    if (host === 'open.spotify.com' || host === 'play.spotify.com') {
      // optional locale segment, e.g. /intl-he/track/<id>; embed links /embed/track/<id> are accepted too
      const rest = parts.filter((p, i) => !(i === 0 && (/^intl-[a-z-]+$/i.test(p) || p === 'embed')));
      if (SP_KINDS.includes(rest[0]) && SP_ID.test(rest[1] || '')) return spotify(rest[0], rest[1]);
      return null;
    }
    return null;
  }

  /** A link, a spotify: URI or a bare ID -> media info, or null when it is not a recognised song link. */
  function parseMediaLink(input) {
    const text = String(input == null ? '' : input).trim();
    if (!text || text.length > 500) return null;
    const uri = /^spotify:(track|album|playlist):([A-Za-z0-9]{22})$/i.exec(text);
    if (uri) return spotify(uri[1].toLowerCase(), uri[2]);
    if (SP_ID.test(text)) return spotify('track', text);
    if (YT_ID.test(text)) return youtube(text, 0, false);
    let url;
    try {
      url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`);
    } catch (e) {
      return null;
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return fromUrl(url);
  }

  return { parseMediaLink, parseStart };
});
