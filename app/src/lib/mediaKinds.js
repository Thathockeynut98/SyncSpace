import { parseLink } from '@/lib/videoLinks';

const AUDIO_EXT = /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|weba)(\?|#|$)/i;
const VIDEO_EXT = /\.(mp4|m4v|webm|ogv|mov|mkv)(\?|#|$)/i;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|bmp|heic)(\?|#|$)/i;

export function kindForFile(file) {
  const type = (file?.type || '').toLowerCase();
  if (type.startsWith('audio/')) return 'audio';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('image/')) return 'image';
  if (AUDIO_EXT.test(file?.name || '')) return 'audio';
  if (VIDEO_EXT.test(file?.name || '')) return 'video';
  if (IMAGE_EXT.test(file?.name || '')) return 'image';
  return 'file';
}

export function kindForLink(parsed) {
  if (!parsed) return 'link';
  if (parsed.kind === 'youtube') return 'link';
  const path = parsed.url || '';
  if (AUDIO_EXT.test(path)) return 'audio';
  if (VIDEO_EXT.test(path)) return 'video';
  if (IMAGE_EXT.test(path)) return 'image';
  return 'link';
}

export function readLink(value) {
  return parseLink(value);
}

export const KIND_LABEL = {
  audio: 'Song',
  video: 'Video',
  image: 'Picture',
  link: 'Link',
  file: 'File',
};