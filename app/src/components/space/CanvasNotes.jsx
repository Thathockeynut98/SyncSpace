import CanvasStudio from './canvas/CanvasStudio';

// The canvas itself. The notes left for each other now live on the home screen,
// where they are the first thing seen instead of buried under the drawing.
export default function CanvasNotes({ space, user, room }) {
  return (
    <div className="space-y-5">
      <CanvasStudio space={space} user={user} room={room} />
    </div>
  );
}