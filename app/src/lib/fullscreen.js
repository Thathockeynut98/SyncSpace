// Full screen that behaves the same on laptops and phones.
export function isFullscreen() {
  return Boolean(document.fullscreenElement || document.webkitFullscreenElement);
}

export function exitFullscreen() {
  const exit = document.exitFullscreen || document.webkitExitFullscreen;
  if (exit) exit.call(document);
}

// Fill the screen with the player shell. iPhones only allow their own player to
// go full screen, so fall back to the video element itself.
export function toggleFullscreen(container, media) {
  if (isFullscreen()) {
    exitFullscreen();
    return;
  }
  const request = container?.requestFullscreen || container?.webkitRequestFullscreen;
  if (request) {
    const attempt = request.call(container);
    if (attempt?.catch) attempt.catch(() => media?.webkitEnterFullscreen?.());
    return;
  }
  if (media?.webkitEnterFullscreen) media.webkitEnterFullscreen();
}