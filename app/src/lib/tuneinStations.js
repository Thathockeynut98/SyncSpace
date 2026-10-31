// Curated US stations whose own live stream can play right inside SyncSpace,
// so a single tap starts the music. `url` is the station's TuneIn page.

export const TUNEIN_GENRES = [
  { id: 'all', label: 'All' },
  { id: 'country', label: 'Country' },
  { id: 'classical', label: 'Classical' },
  { id: 'rock', label: 'Rock' },
  { id: 'pop', label: 'Pop' },
];

export const TUNEIN_BROWSE = {
  country: 'https://tunein.com/radio/Stream-Country-c57940/',
  classical: 'https://tunein.com/search/?query=classical+radio',
  rock: 'https://tunein.com/radio/Stream-Classic-Rock-Stations-c57938/',
  pop: 'https://tunein.com/radio/Top-40--Pop-Music--Free-Internet-Radio--TuneIn-c57943/',
};

const STATION_LIST = [
  // Country
  { sid: 's126270', name: "America's Country", blurb: 'Three decades of country', genre: 'country', stream: 'https://ais-sa2.cdnstream1.com/1976_128.mp3' },
  { sid: 's271780', name: 'Country Hits Radio', blurb: 'Just great country songs', genre: 'country', stream: 'https://countryhits.radioca.st/stream' },
  { sid: 's140309', name: 'County Road Country', blurb: 'Hits and classics, all day', genre: 'country', stream: 'https://streaming.live365.com/a13741' },
  { sid: 's90412', name: "181.FM 90's Country", blurb: 'The nineties, all country', genre: 'country', stream: 'https://listen.181fm.com/181-90scountry_128k.mp3?noPreRoll=true' },
  { sid: 's51095', name: "181.FM Kickin' Country", blurb: 'New country, commercial free', genre: 'country', stream: 'https://listen.181fm.com/181-kickincountry_64k.aac?noPreRoll=true' },
  { sid: 's358937', name: 'Jolene Country Radio', blurb: 'Modern country, back to back', genre: 'country', stream: 'https://playerservices.streamtheworld.com/api/livestream-redirect/SERVICE07AAC.aac' },

  // Classical
  { sid: 's28807', name: 'WFMT Classical', blurb: 'Chicago, live from WFMT', genre: 'classical', stream: 'https://wfmt-live.streamguys1.com/wfmt128-mp3' },
  { sid: 's22608', name: 'WRTI Classical', blurb: 'Philadelphia classical and jazz', genre: 'classical', stream: 'https://wrti-live.streamguys1.com/classical-mp3' },
  { sid: 's31824', name: 'All Classical Portland', blurb: 'Oregon, all day long', genre: 'classical', stream: 'https://allclassical.streamguys1.com/ac128kmp3' },
  { sid: 's22654', name: 'Nashville Classical', blurb: 'Music City, orchestral', genre: 'classical', stream: 'https://wpln.streamguys1.com/wfclfm.mp3' },
  { sid: 's28152', name: 'WDAV Classical', blurb: 'Charlotte, night music and more', genre: 'classical', stream: 'https://audio-mp3.ibiblio.org/wdav-112k' },
  { sid: 's44786', name: 'VPR Classical', blurb: 'Vermont, classical around the clock', genre: 'classical', stream: 'https://vprclassical.streamguys1.com/vprclassical64.aac' },
  { sid: 's39146', name: 'WBAA Classical', blurb: 'Purdue, West Lafayette', genre: 'classical', stream: 'https://purdue.streamguys1.com/wbaa-classical-aac' },
  { sid: 's22142', name: 'Classical QED', blurb: 'Exploring music, hour by hour', genre: 'classical', stream: 'https://ice-1.streamhoster.com/lv_wqed--893' },

  // Rock
  { sid: 's30842', name: 'QFM96', blurb: 'Columbus, Ohio', genre: 'rock', stream: 'https://live.amperwave.net/direct/saga-wlvqfmaac-ibc2?source=TuneIn&gdpr=0' },
  { sid: 's32961', name: 'KUTX 98.9', blurb: 'Austin, Texas', genre: 'rock', stream: 'https://streams.kut.org/4428_56?aw_0_1st.playerid=kutx-tunein' },
  { sid: 's33222', name: 'Classic Rock 92.9', blurb: 'The rock of the Northwest', genre: 'rock', stream: 'https://live.amperwave.net/direct/saga-kismfmmp3-ibc1?source=TuneIn&gdpr=0' },
  { sid: 's49676', name: 'GotRadio Classic Rock', blurb: 'Commercial free classic rock', genre: 'rock', stream: 'https://pureplay.cdnstream1.com/6012_128.mp3' },
  { sid: 's240616', name: 'Hair Band Radio', blurb: 'Big choruses, bigger hair', genre: 'rock', stream: 'https://cheetah.streemlion.com:2005/stream' },
  { sid: 's281107', name: 'HD Radio Classic Rock', blurb: 'Ride to rock', genre: 'rock', stream: 'https://hdradioclassicrock-rfritschka.radioca.st/' },

  // Pop
  { sid: 's23211', name: '101.9 The MIX', blurb: 'Chicago pop, new music club', genre: 'pop', stream: 'https://playerservices.streamtheworld.com/api/livestream-redirect/WTMXFM.mp3' },
  { sid: 's55029', name: '181.FM Power 181', blurb: 'Top 40, nonstop', genre: 'pop', stream: 'https://listen.181fm.com/181-power_64k.aac?noPreRoll=true' },
  { sid: 's49697', name: 'GotRadio Top 40', blurb: 'Chart hits, commercial free', genre: 'pop', stream: 'https://pureplay.cdnstream1.com/6024_64.aac' },
  { sid: 's242980', name: 'JamsNetwork Pop Hits', blurb: 'Lite hits, USA', genre: 'pop', stream: 'https://streaming.live365.com/a57693' },
  { sid: 's305155', name: 'Classic Hits Radio USA', blurb: '70s, 80s, 90s nonstop', genre: 'pop', stream: 'https://radiopanther.radiolebowski.com/play' },
  { sid: 's346220', name: 'Hits Pop 80s–90s', blurb: 'Los Angeles, the era that sang', genre: 'pop', stream: 'https://samcloud.spacial.com/api/listen?sid=127021&m=sc&rid=266563&t=ssl' },
];

export const TUNEIN_STATIONS = STATION_LIST.map((station) => ({
  ...station,
  id: station.sid,
  url: `https://tunein.com/station/?stationid=${station.sid.slice(1)}`,
}));

export const GENRE_TINT = {
  country: 'from-amber-400/80 to-orange-600/70',
  classical: 'from-sky-400/80 to-indigo-600/70',
  rock: 'from-rose-500/80 to-red-700/70',
  pop: 'from-fuchsia-500/80 to-pink-600/70',
};

export const GENRE_LABEL = {
  country: 'Country',
  classical: 'Classical',
  rock: 'Rock',
  pop: 'Pop',
};