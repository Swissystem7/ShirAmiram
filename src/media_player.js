// ShirAmiram — Unified Media Player (YouTube IFrame API, Spotify Embed, Playlist Queue & Fallback Audio)
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ShirAmiramMediaPlayer = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;
  const SPOTIFY_ID_RE = /^[A-Za-z0-9]{22}$/;

  function isValidYouTubeId(id) {
    return typeof id === 'string' && YOUTUBE_ID_RE.test(id.trim());
  }

  function isValidSpotifyId(id) {
    return typeof id === 'string' && SPOTIFY_ID_RE.test(id.trim());
  }

  function getYouTubeEmbedUrl(id, options) {
    if (!isValidYouTubeId(id)) return null;
    const cleanId = id.trim();
    const opts = options || {};
    const params = new URLSearchParams({
      enablejsapi: '1',
      origin: typeof window !== 'undefined' && window.location ? window.location.origin : 'http://localhost'
    });
    if (opts.autoplay) params.set('autoplay', '1');
    if (opts.start != null) params.set('start', String(Math.floor(opts.start)));
    if (opts.controls != null) params.set('controls', opts.controls ? '1' : '0');
    if (Array.isArray(opts.playlist) && opts.playlist.length > 0) {
      const validIds = opts.playlist.filter(isValidYouTubeId).map(x => x.trim());
      if (validIds.length > 0) {
        params.set('playlist', validIds.join(','));
      }
    }
    return `https://www.youtube.com/embed/${cleanId}?${params.toString()}`;
  }

  function getYouTubeWatchPlaylistUrl(videoIds) {
    if (!Array.isArray(videoIds)) return null;
    const valid = videoIds.filter(isValidYouTubeId).map(x => x.trim());
    if (valid.length === 0) return null;
    return `https://www.youtube.com/watch_videos?video_ids=${valid.join(',')}`;
  }

  function getSpotifyEmbedUrl(id) {
    if (!isValidSpotifyId(id)) return null;
    return `https://open.spotify.com/embed/track/${id.trim()}`;
  }

  function getSpotifyTrackUrl(id) {
    if (!isValidSpotifyId(id)) return null;
    return `https://open.spotify.com/track/${id.trim()}`;
  }

  class MediaPlayer {
    constructor() {
      this.mode = 'idle'; // 'youtube' | 'spotify' | 'fallback' | 'idle'
      this.currentId = null;
      this.isPlaying = false;
      this.currentTime = 0;
      this.duration = 0;
      this.volume = 1.0;
      this.playlist = [];
      this.playlistIndex = 0;
      this.playlistPlatform = 'youtube';
      this.listeners = {
        stateChange: [],
        timeUpdate: [],
        error: [],
        playlistChange: []
      };
      this.timer = null;
    }

    on(event, callback) {
      if (this.listeners[event]) {
        this.listeners[event].push(callback);
      }
    }

    emit(event, data) {
      if (this.listeners[event]) {
        this.listeners[event].forEach(cb => {
          try { cb(data); } catch (e) { /* ignore callback errors */ }
        });
      }
    }

    getState() {
      return {
        mode: this.mode,
        currentId: this.currentId,
        isPlaying: this.isPlaying,
        currentTime: this.currentTime,
        duration: this.duration,
        volume: this.volume,
        playlistIndex: this.playlistIndex,
        playlistLength: this.playlist.length
      };
    }

    getPlaylistState() {
      const ytIds = this.playlist.map(t => t && t.youtube_id).filter(isValidYouTubeId);
      return {
        totalTracks: this.playlist.length,
        currentIndex: this.playlistIndex,
        currentTrack: this.playlist[this.playlistIndex] || null,
        platform: this.playlistPlatform,
        youtubePlaylistUrl: getYouTubeWatchPlaylistUrl(ytIds)
      };
    }

    loadYouTube(videoId, containerElement, options) {
      if (!isValidYouTubeId(videoId)) {
        this.emit('error', { message: 'Invalid YouTube ID' });
        return { ok: false, error: 'Invalid YouTube ID' };
      }
      this.pause();
      const opts = options || {};
      this.mode = 'youtube';
      this.currentId = videoId.trim();
      this.currentTime = opts.start ? Math.max(0, Number(opts.start) || 0) : 0;
      this.duration = 180; // default estimated duration

      if (containerElement && typeof document !== 'undefined') {
        const iframe = document.createElement('iframe');
        iframe.src = getYouTubeEmbedUrl(this.currentId, {
          autoplay: opts.autoplay ? 1 : 0,
          start: this.currentTime > 0 ? this.currentTime : undefined,
          playlist: opts.playlist
        });
        iframe.width = '100%';
        iframe.height = '100%';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;
        iframe.className = 'w-full h-full rounded-xl border border-slate-700/50';
        containerElement.innerHTML = '';
        containerElement.appendChild(iframe);
      }

      this.emit('stateChange', this.getState());
      return { ok: true, mode: 'youtube', id: this.currentId };
    }

    loadSpotify(spotifyId, containerElement) {
      if (!isValidSpotifyId(spotifyId)) {
        this.emit('error', { message: 'Invalid Spotify ID' });
        return { ok: false, error: 'Invalid Spotify ID' };
      }
      this.pause();
      this.mode = 'spotify';
      this.currentId = spotifyId.trim();
      this.currentTime = 0;
      this.duration = 180;

      if (containerElement && typeof document !== 'undefined') {
        const iframe = document.createElement('iframe');
        iframe.src = getSpotifyEmbedUrl(this.currentId);
        iframe.width = '100%';
        iframe.height = '152';
        iframe.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
        iframe.loading = 'lazy';
        iframe.className = 'w-full rounded-xl border border-slate-700/50';
        containerElement.innerHTML = '';
        containerElement.appendChild(iframe);
      }

      this.emit('stateChange', this.getState());
      return { ok: true, mode: 'spotify', id: this.currentId };
    }

    loadPlaylist(tracks, platform, containerElement) {
      if (!Array.isArray(tracks) || tracks.length === 0) {
        return { ok: false, error: 'Empty playlist' };
      }
      const validTracks = tracks.filter(t => t && (isValidYouTubeId(t.youtube_id) || isValidSpotifyId(t.spotify_id)));
      if (validTracks.length === 0) {
        return { ok: false, error: 'No valid playable tracks in playlist' };
      }
      this.playlist = validTracks.map(t => Object.assign({}, t));
      this.playlistIndex = 0;
      this.playlistPlatform = platform === 'spotify' ? 'spotify' : 'youtube';
      return this._playCurrentPlaylistTrack(containerElement);
    }

    _playCurrentPlaylistTrack(containerElement) {
      const track = this.playlist[this.playlistIndex];
      if (!track) return { ok: false, error: 'No track at index' };

      let res;
      if (this.playlistPlatform === 'spotify' && isValidSpotifyId(track.spotify_id)) {
        res = this.loadSpotify(track.spotify_id, containerElement);
      } else if (isValidYouTubeId(track.youtube_id)) {
        const restIds = this.playlist
          .slice(this.playlistIndex + 1)
          .map(t => t.youtube_id)
          .filter(isValidYouTubeId);
        res = this.loadYouTube(track.youtube_id, containerElement, {
          start: track.timestamp_sec || 0,
          playlist: restIds
        });
      } else if (isValidSpotifyId(track.spotify_id)) {
        res = this.loadSpotify(track.spotify_id, containerElement);
      } else {
        return { ok: false, error: 'Track lacks valid ID' };
      }

      this.emit('playlistChange', this.getPlaylistState());
      return Object.assign({}, res, {
        playlistIndex: this.playlistIndex,
        totalTracks: this.playlist.length,
        track
      });
    }

    nextTrack(containerElement) {
      if (!this.playlist.length) return { ok: false, error: 'No active playlist' };
      this.playlistIndex = (this.playlistIndex + 1) % this.playlist.length;
      return this._playCurrentPlaylistTrack(containerElement);
    }

    prevTrack(containerElement) {
      if (!this.playlist.length) return { ok: false, error: 'No active playlist' };
      this.playlistIndex = (this.playlistIndex - 1 + this.playlist.length) % this.playlist.length;
      return this._playCurrentPlaylistTrack(containerElement);
    }

    loadFallback(config) {
      this.pause();
      const cfg = config || {};
      this.mode = 'fallback';
      this.currentId = 'synth_tune';
      this.currentTime = 0;
      this.duration = cfg.duration || 30;
      this.emit('stateChange', this.getState());
      return { ok: true, mode: 'fallback' };
    }

    play() {
      if (this.isPlaying) return;
      this.isPlaying = true;
      this.emit('stateChange', this.getState());

      if (typeof setInterval !== 'undefined') {
        this.timer = setInterval(() => {
          if (!this.isPlaying) return;
          this.currentTime += 0.25;
          if (this.duration > 0 && this.currentTime >= this.duration) {
            this.currentTime = 0;
          }
          this.emit('timeUpdate', { currentTime: this.currentTime, duration: this.duration });
        }, 250);
      }
    }

    pause() {
      if (!this.isPlaying) return;
      this.isPlaying = false;
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
      this.emit('stateChange', this.getState());
    }

    seekTo(seconds) {
      this.currentTime = Math.max(0, Math.min(Number(seconds) || 0, this.duration || 9999));
      this.emit('timeUpdate', { currentTime: this.currentTime, duration: this.duration });
      this.emit('stateChange', this.getState());
    }

    setVolume(vol) {
      this.volume = Math.max(0, Math.min(1.0, Number(vol) || 0));
      this.emit('stateChange', this.getState());
    }
  }

  MediaPlayer.isValidYouTubeId = isValidYouTubeId;
  MediaPlayer.isValidSpotifyId = isValidSpotifyId;
  MediaPlayer.getYouTubeEmbedUrl = getYouTubeEmbedUrl;
  MediaPlayer.getYouTubeWatchPlaylistUrl = getYouTubeWatchPlaylistUrl;
  MediaPlayer.getSpotifyEmbedUrl = getSpotifyEmbedUrl;
  MediaPlayer.getSpotifyTrackUrl = getSpotifyTrackUrl;

  return MediaPlayer;
}));
