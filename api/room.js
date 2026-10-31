// Realtime room for one couple's space: presence, synced playback, shared countdown
// and live drawing strokes. The room is keyed by the space id and is authoritative —
// clients send operations, never outcomes.
// Ported from the existing SpaceRoom actor; runs against local PostgreSQL.
class Actor {
 constructor(id,pool){this.id=id;this.pool=pool;this.connections=new Set();
  const persistent=new Set(['playback','timer','game','reading','radio','sleep']);
  this.storage={get:async key=>{if(!persistent.has(key))return undefined;const r=await pool.query('SELECT data->$2 AS value FROM app.room_state WHERE space_id=$1',[id,key]);return r.rows[0]?.value},
   put:async(key,value)=>{if(!persistent.has(key))return;await pool.query("INSERT INTO app.room_state(space_id,data) VALUES($1,jsonb_build_object($2::text,$3::jsonb)) ON CONFLICT(space_id) DO UPDATE SET data=jsonb_set(app.room_state.data,ARRAY[$2::text],$3::jsonb)",[id,key,JSON.stringify(value)])}};
 }
 getConnections(){return [...this.connections].filter(c=>c.socket.readyState===1)}
 broadcast(message){for(const conn of this.getConnections())conn.send(message)}
}

const MAX_USERS = 4;
const MAX_POINTS_PER_MESSAGE = 80;
const PLAYBACK_ACTIONS = ['play', 'pause', 'seek', 'load', 'tick'];
const GAME_KINDS = ['chess', 'checkers', 'tictactoe', 'connect4'];
const DRAW_TOOLS = [
  'pen',
  'pencil',
  'marker',
  'airbrush',
  'roller',
  'eraser',
  'fill',
  'line',
  'rect',
  'ellipse',
  'stamp',
];
const MIRROR_MODES = ['off', 'v', 'h', 'quad'];
const MAX_GAME_BYTES = 20000;
const MAX_SIGNAL_BYTES = 30000;

export default class SpaceRoom extends Actor {
  users = new Map(); // conn.id -> { seat, name, tab, person }
  // One seat per PERSON, not per socket: two tabs on one laptop are still one
  // of you, and a call never has to guess which of their tabs to ring.
  seats = new Map(); // person -> seat
  nextSeat = 1;
  playback = { videoId: null, playing: false, time: 0, at: 0, leaderSeat: null };
  timer = { endsAt: 0, running: false };
  game = { kind: null, state: null, turnSeat: null, starterSeat: null, at: 0 };
  reading = { docId: null, page: 0 };
  radio = { station: null, playing: false, at: 0 };
  // The sleep soundtrack: which track, whether it is on, and how far into it,
  // so the other person hears the same thing from the same place.
  sleep = { trackId: null, title: '', file_uri: '', playing: false, position: 0, at: 0 };

  async handleStart() {
    const savedUsers = await this.storage.get('users');
    if (savedUsers) this.users = new Map(savedUsers);
    // A call does not survive the room sleeping, so no device starts out
    // claiming one: each says where the call is as it picks it up again.
    for (const user of this.users.values()) user.call = false;
    const savedSeats = await this.storage.get('seats');
    if (savedSeats) this.seats = new Map(savedSeats);
    const savedPlayback = await this.storage.get('playback');
    if (savedPlayback) this.playback = savedPlayback;
    const savedTimer = await this.storage.get('timer');
    if (savedTimer) this.timer = savedTimer;
    const savedGame = await this.storage.get('game');
    if (savedGame) this.game = savedGame;
    const savedReading = await this.storage.get('reading');
    if (savedReading) this.reading = savedReading;
    const savedRadio = await this.storage.get('radio');
    if (savedRadio) this.radio = savedRadio;
    const savedSleep = await this.storage.get('sleep');
    if (savedSleep) this.sleep = savedSleep;

    // A hibernation wake keeps sockets attached without re-running handleConnect.
    const live = new Set(this.getConnections().map((c) => c.id));
    for (const id of [...this.users.keys()]) if (!live.has(id)) this.users.delete(id);
    this.nextSeat =
      Math.max(
        0,
        ...[...this.users.values()].map((u) => u.seat),
        ...[...this.seats.values()]
      ) + 1;
  }

  async handleConnect(conn) {
    // A socket that vanished without a close (a sleeping laptop, a lost network)
    // leaves its entry behind. Clear those first, so a returning pair always gets
    // the room back instead of hitting a full house of ghosts.
    const live = new Set(this.getConnections().map((c) => c.id));
    let pruned = false;
    for (const id of [...this.users.keys()]) {
      if (id !== conn.id && !live.has(id)) {
        this.users.delete(id);
        pruned = true;
      }
    }
    if (pruned) await this.saveUsers();

    const taken = new Set([...this.users.values()].map((u) => u.seat));
    if (!this.users.has(conn.id) && taken.size >= MAX_USERS) {
      conn.reject(4001, 'room full');
      return;
    }
    if (!this.users.has(conn.id)) {
      const person = this.personKey(conn);
      let seat = this.seats.get(person);
      if (!seat) {
        const held = [...this.users.values()].find((u) => u.person === person);
        seat = held ? held.seat : this.nextSeat++;
        this.seats.set(person, seat);
        await this.saveSeats();
      }
      this.users.set(conn.id, { seat, name: 'Them', person, call: false });
      await this.saveUsers();
    }
    conn.send({ type: 'you', seat: this.users.get(conn.id).seat });
    conn.send({
      type: 'state',
      playback: this.playback,
      timer: this.timer,
      game: this.game,
      reading: this.reading,
      radio: this.radio,
      sleep: this.sleep,
    });
    this.broadcastPresence();
  }

  async handleMessage(conn, msg) {
    if (typeof msg !== 'object' || msg === null) return;
    const user = this.users.get(conn.id);
    if (!user) return;

    if (msg.type === 'hello') {
      user.name = typeof msg.name === 'string' && msg.name.trim() ? msg.name.trim().slice(0, 40) : 'Them';
      await this.saveUsers();
      this.broadcastPresence();
      return;
    }

    // They are writing something. Ephemeral: never stored, just passed on.
    if (msg.type === 'typing') {
      this.broadcast({ type: 'typing', from: user.seat, name: user.name, on: msg.on === true });
      return;
    }

    // Which room this person is in right now, so the other one can be told.
    if (msg.type === 'activity') {
      const tab = typeof msg.tab === 'string' && msg.tab.trim() ? msg.tab.trim().slice(0, 24) : null;
      if (user.tab === tab) return;
      user.tab = tab;
      this.broadcastPresence();
      return;
    }

    // Which device is carrying the call. Presence carries it, so their other
    // device can offer to take the call up instead of sitting there cut off.
    if (msg.type === 'call') {
      const on = msg.on === true;
      if (user.call === on) return;
      user.call = on;
      this.broadcastPresence();
      return;
    }

    // The call is being taken up on another device of theirs: the device that
    // had it is told to let go, so the two never fight over the same line.
    if (msg.type === 'takeover') {
      for (const socket of this.getConnections()) {
        if (socket.id === conn.id) continue;
        const entry = this.users.get(socket.id);
        if (entry && entry.person === user.person) socket.send({ type: 'takeover' });
      }
      return;
    }

    if (msg.type === 'playback') {
      if (!PLAYBACK_ACTIONS.includes(msg.action)) return;
      const rawTime = Number(msg.time);
      const time = Number.isFinite(rawTime) ? Math.max(0, Math.min(rawTime, 86400)) : 0;
      const videoId = typeof msg.videoId === 'string' ? msg.videoId.slice(0, 64) : null;

      if (msg.action === 'tick') {
        if (user.seat !== this.playback.leaderSeat) return;
        this.playback = { ...this.playback, time, at: Date.now() };
        this.broadcast({ type: 'playback', ...this.playback, action: 'tick', from: user.seat });
        return;
      }

      const playing = msg.action === 'play' ? true : msg.action === 'pause' ? false : this.playback.playing;
      this.playback = {
        videoId: videoId || this.playback.videoId,
        playing,
        time,
        at: Date.now(),
        leaderSeat: msg.action === 'play' ? user.seat : msg.action === 'pause' ? null : this.playback.leaderSeat,
      };
      if (msg.action !== 'seek') await this.storage.put('playback', this.playback);
      this.broadcast({ type: 'playback', ...this.playback, action: msg.action, from: user.seat });
      return;
    }

    if (msg.type === 'timer') {
      if (msg.action === 'start') {
        const endsAt = Number(msg.endsAt);
        if (!Number.isFinite(endsAt)) return;
        this.timer = { endsAt, running: true };
      } else if (msg.action === 'pause' || msg.action === 'clear') {
        this.timer = { endsAt: 0, running: false };
      } else {
        return;
      }
      await this.storage.put('timer', this.timer);
      this.broadcast({ type: 'timer', ...this.timer, action: msg.action, from: user.seat });
      return;
    }

    if (msg.type === 'draw') {
      const incoming = Array.isArray(msg.pts) ? msg.pts.slice(0, MAX_POINTS_PER_MESSAGE) : [];
      const clamp = (value) => Math.max(0, Math.min(2000, Number(value) || 0));
      const pts = incoming
        .filter((point) => Array.isArray(point) && point.length >= 2)
        .map((point) => [clamp(point[0]), clamp(point[1])]);
      if (!pts.length) return;
      this.broadcast({
        type: 'draw',
        from: user.seat,
        c: typeof msg.c === 'string' ? msg.c.slice(0, 24) : '#818cf8',
        w: Math.max(1, Math.min(160, Number(msg.w) || 3)),
        t: typeof msg.t === 'string' && DRAW_TOOLS.includes(msg.t) ? msg.t : 'pen',
        o: Math.max(0.05, Math.min(1, Number(msg.o) || 1)),
        m: MIRROR_MODES.includes(msg.m) ? msg.m : 'off',
        e: typeof msg.e === 'string' ? msg.e.slice(0, 8) : '',
        ti: typeof msg.ti === 'string' ? msg.ti.slice(0, 64) : '',
        l: typeof msg.l === 'string' ? msg.l.slice(0, 64) : null,
        pts,
        start: msg.start === true,
        end: msg.end === true,
      });
      return;
    }

    if (msg.type === 'clear') {
      this.broadcast({ type: 'clear', from: user.seat });
      return;
    }

    // Someone changed the colour of the paper under the drawing.
    if (msg.type === 'bg') {
      this.broadcast({
        type: 'bg',
        from: user.seat,
        c: typeof msg.c === 'string' ? msg.c.slice(0, 24) : '',
      });
      return;
    }

    // Someone changed the drawing in a way strokes can't describe (an undo, a
    // new layer). The page itself lives in the database, so just say "look again".
    if (msg.type === 'canvas') {
      this.broadcast({ type: 'canvas', from: user.seat });
      return;
    }

    // A new brush texture was uploaded, so the other side should pick it up.
    if (msg.type === 'tips') {
      this.broadcast({ type: 'tips', from: user.seat });
      return;
    }

    if (msg.type === 'game') {
      if (msg.action === 'new') {
        if (!GAME_KINDS.includes(msg.kind)) return;
        if (!msg.state || JSON.stringify(msg.state).length > MAX_GAME_BYTES) return;
        this.game = {
          kind: msg.kind,
          state: msg.state,
          turnSeat: user.seat,
          starterSeat: user.seat,
          at: Date.now(),
        };
        await this.storage.put('game', this.game);
        this.broadcast({ type: 'game', ...this.game, action: 'new', from: user.seat });
        return;
      }
      if (msg.action === 'reset') {
        this.game = { kind: null, state: null, turnSeat: null, starterSeat: null, at: Date.now() };
        await this.storage.put('game', this.game);
        this.broadcast({ type: 'game', ...this.game, action: 'reset', from: user.seat });
        return;
      }
      if (msg.action === 'move') {
        if (!this.game.kind || this.game.turnSeat !== user.seat) return;
        if (!msg.state || JSON.stringify(msg.state).length > MAX_GAME_BYTES) return;
        const partner = [...this.users.values()].find((u) => u.seat !== user.seat);
        this.game = {
          ...this.game,
          state: msg.state,
          turnSeat: partner ? partner.seat : null,
          at: Date.now(),
        };
        await this.storage.put('game', this.game);
        this.broadcast({ type: 'game', ...this.game, action: 'move', from: user.seat });
        return;
      }
      return;
    }

    if (msg.type === 'reading') {
      const docId = typeof msg.docId === 'string' ? msg.docId.slice(0, 64) : null;
      const page = Math.max(0, Math.min(5000, Math.floor(Number(msg.page) || 0)));
      this.reading = { docId, page };
      await this.storage.put('reading', this.reading);
      this.broadcast({ type: 'reading', ...this.reading, from: user.seat });
      return;
    }

    if (msg.type === 'radio') {
      this.radio = {
        station: typeof msg.station === 'string' ? msg.station.slice(0, 32) : null,
        playing: msg.playing === true,
        at: Date.now(),
      };
      await this.storage.put('radio', this.radio);
      this.broadcast({ type: 'radio', ...this.radio, from: user.seat });
      return;
    }

    // One sleep soundtrack for both of you: whoever presses play, the other hears it.
    if (msg.type === 'sleep') {
      if (msg.action === 'ask') {
        // A quiet reply only to whoever asked, who was away when it started.
        conn.send({ type: 'sleep', ...this.sleep, action: 'state', from: 0 });
        return;
      }
      if (msg.action !== 'state') return;
      const trackId = typeof msg.trackId === 'string' && msg.trackId ? msg.trackId.slice(0, 64) : null;
      const rawPosition = Number(msg.position);
      this.sleep = {
        trackId,
        title: typeof msg.title === 'string' ? msg.title.slice(0, 120) : '',
        file_uri: typeof msg.file_uri === 'string' ? msg.file_uri.slice(0, 400) : '',
        playing: !!trackId && msg.playing === true,
        position:
          Number.isFinite(rawPosition) && rawPosition > 0 ? Math.min(rawPosition, 86400) : 0,
        at: Date.now(),
      };
      await this.storage.put('sleep', this.sleep);
      this.broadcast({ type: 'sleep', ...this.sleep, action: 'state', from: user.seat });
      return;
    }

    if (msg.type === 'signal') {
      const toSeat = Number(msg.to);
      if (!Number.isFinite(toSeat) || toSeat === user.seat) return;
      const target = [...this.users.entries()].find(([, value]) => value.seat === toSeat);
      const data = msg.data && typeof msg.data === 'object' ? msg.data : null;
      if (!target || !data || JSON.stringify(data).length > MAX_SIGNAL_BYTES) return;
      // A reconnect leaves the old socket attached for a moment. Always use the
      // newest one, so a handshake never lands on a socket that is already gone.
      const sockets = this.getConnections().filter((c) => {
        const entry = this.users.get(c.id);
        return entry && entry.seat === toSeat;
      });
      if (!sockets.length) {
        // Tell the caller instead of letting them wait on "connecting" forever.
        conn.send({ type: 'signal', from: 0, data: { kind: 'gone' } });
        return;
      }
      // Every device of theirs, not just the newest socket. The one they are
      // actually holding is often not the last tab that spoke — a handshake
      // delivered only to a tab left open on a laptop looks exactly like nobody
      // picking up, and the call never connects.
      for (const socket of sockets) socket.send({ type: 'signal', from: user.seat, data });
      return;
    }

    if (msg.type === 'cursor') {
      const clamp = (value) => Math.max(0, Math.min(2000, Number(value) || 0));
      this.broadcast({
        type: 'cursor',
        from: user.seat,
        name: user.name,
        x: clamp(msg.x),
        y: clamp(msg.y),
        active: msg.active !== false,
      });
    }
  }

  async handleClose(conn) {
    // A reload reattaches the same id, and the old socket's close can land after
    // the new one is already seated. Only the last one out leaves the room.
    const reclaimed = this.getConnections().some((other) => other.id === conn.id && other !== conn);
    if (reclaimed) return;
    if (!this.users.has(conn.id)) return;
    this.users.delete(conn.id);
    await this.saveUsers();
    this.broadcastPresence();
  }

  // A signed-in person keeps the same seat across tabs, reloads and reconnects.
  personKey(conn) {
    const identity = conn.identity;
    if (identity && identity.type === 'authenticated' && identity.userId) return `u:${identity.userId}`;
    return `c:${conn.id}`;
  }

  saveUsers() {
    return this.storage.put('users', [...this.users.entries()]);
  }

  saveSeats() {
    return this.storage.put('seats', [...this.seats.entries()]);
  }

  broadcastPresence() {
    // A socket that closed without a word must not stay on the list pretending
    // to be reachable — the other one would ring a phone that is not there.
    const live = new Set(this.getConnections().map((c) => c.id));
    let pruned = false;
    for (const id of [...this.users.keys()]) {
      if (!live.has(id)) {
        this.users.delete(id);
        pruned = true;
      }
    }
    if (pruned) this.saveUsers().catch(() => {});

    // One entry per person, whichever of their tabs spoke last.
    const people = new Map();
    for (const user of this.users.values()) {
      const held = people.get(user.seat);
      people.set(user.seat, {
        seat: user.seat,
        name: user.name,
        tab: user.tab || null,
        // Any of their devices carrying the call marks the person as on it.
        call: held?.call === true || user.call === true,
      });
    }
    this.broadcast({ type: 'presence', users: [...people.values()] });
  }
}