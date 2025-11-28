// Media type detection for content
export type MediaType = 'article' | 'video' | 'audio' | 'image' | 'thread' | 'unknown';

export interface MediaInfo {
  type: MediaType;
  videoId?: string; // YouTube/Vimeo ID
  audioUrl?: string; // Direct audio URL
  embedUrl?: string; // Embeddable URL
  platform?: string;
}

// URL patterns for different media types
const patterns = {
  youtube: [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ],
  vimeo: [
    /vimeo\.com\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/,
  ],
  twitter: [
    /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/,
  ],
  reddit: [
    /reddit\.com\/r\/\w+\/comments\/(\w+)/,
  ],
  spotify: [
    /open\.spotify\.com\/(track|episode|show)\/(\w+)/,
  ],
  soundcloud: [
    /soundcloud\.com\/[\w-]+\/[\w-]+/,
  ],
  podcast: [
    /\.(mp3|m4a|ogg|wav)(\?|$)/i,
    /podcasts?\./i,
    /anchor\.fm/,
    /overcast\.fm/,
    /pocketcasts\.com/,
  ],
  image: [
    /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i,
    /imgur\.com/,
    /i\.redd\.it/,
  ],
};

// Detect media type from URL
export function detectMediaType(url: string): MediaInfo {
  if (!url) return { type: 'unknown' };

  const urlLower = url.toLowerCase();

  // YouTube
  for (const pattern of patterns.youtube) {
    const match = url.match(pattern);
    if (match) {
      return {
        type: 'video',
        videoId: match[1],
        platform: 'youtube',
        embedUrl: `https://www.youtube.com/embed/${match[1]}`,
      };
    }
  }

  // Vimeo
  for (const pattern of patterns.vimeo) {
    const match = url.match(pattern);
    if (match) {
      return {
        type: 'video',
        videoId: match[1],
        platform: 'vimeo',
        embedUrl: `https://player.vimeo.com/video/${match[1]}`,
      };
    }
  }

  // Twitter/X threads
  for (const pattern of patterns.twitter) {
    const match = url.match(pattern);
    if (match) {
      return {
        type: 'thread',
        platform: 'twitter',
      };
    }
  }

  // Reddit threads
  for (const pattern of patterns.reddit) {
    const match = url.match(pattern);
    if (match) {
      return {
        type: 'thread',
        platform: 'reddit',
      };
    }
  }

  // Spotify
  for (const pattern of patterns.spotify) {
    const match = url.match(pattern);
    if (match) {
      return {
        type: 'audio',
        platform: 'spotify',
        embedUrl: url.replace('open.spotify.com', 'open.spotify.com/embed'),
      };
    }
  }

  // SoundCloud
  for (const pattern of patterns.soundcloud) {
    if (pattern.test(url)) {
      return {
        type: 'audio',
        platform: 'soundcloud',
      };
    }
  }

  // Direct podcast/audio
  for (const pattern of patterns.podcast) {
    if (pattern.test(url)) {
      return {
        type: 'audio',
        audioUrl: url,
      };
    }
  }

  // Images
  for (const pattern of patterns.image) {
    if (pattern.test(url)) {
      return {
        type: 'image',
      };
    }
  }

  // Default to article
  return { type: 'article' };
}

// Get display name for media type
export function getMediaTypeLabel(type: MediaType): string {
  switch (type) {
    case 'video': return 'Video';
    case 'audio': return 'Audio';
    case 'image': return 'Image';
    case 'thread': return 'Thread';
    case 'article': return 'Article';
    default: return 'Link';
  }
}

// Get icon name for media type
export function getMediaTypeIcon(type: MediaType): string {
  switch (type) {
    case 'video': return 'play-circle';
    case 'audio': return 'headphones';
    case 'image': return 'image';
    case 'thread': return 'message-square';
    case 'article': return 'file-text';
    default: return 'link';
  }
}
