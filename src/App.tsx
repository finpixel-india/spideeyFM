import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Draggable from 'react-draggable';
import anyAscii from 'any-ascii';

const BACKGROUND_IMAGE = '/images/background.png';

/* ─── LRC Parser ─── */
function parseLrc(lrc: string): { time: number; text: string }[] {
  return lrc
    .split('\n')
    .map(line => {
      const match = line.match(/^\[(\d+):(\d+\.\d+)\](.*)/);
      if (!match) return null;
      const time = parseInt(match[1]) * 60 + parseFloat(match[2]);
      const text = match[3].trim();
      return text ? { time, text } : null;
    })
    .filter(Boolean) as { time: number; text: string }[];
}

/* ─── Types ─── */
interface Song {
  id: string;
  name: string;
  artist: string;
  image: string;
  downloadUrl: string;
  duration: number;
  query?: string;
}

interface PlaylistTrack {
  name: string;
  artist?: string;
}

interface CuratedPlaylist {
  id: string;
  name: string;
  label: string;
  tracks: PlaylistTrack[];
}

interface SearchResult {
  id: string;
  name: string;
  artists: { primary: { name: string }[] };
  image: { quality: string; url: string }[];
  downloadUrl: { quality: string; url: string }[];
  duration: number;
}

/* ─── API helper ─── */
async function searchSongs(query: string): Promise<Song[]> {
  try {
    const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data?.results)) return [];
    return json.data.results;
  } catch {
    return [];
  }
}


/* ─── Default queue and curated playlists ─── */
const SUNFLOWER_STARTER: Song = {
  id: 'intro-sunflower',
  name: 'Sunflower (Spider-Man: Into the Spider-Verse)',
  artist: 'Post Malone, Swae Lee',
  image: '',
  downloadUrl: '',
  duration: 158,
  query: 'Sunflower Spider-Man Into the Spider-Verse Post Malone Swae Lee',
};

const DEFAULT_PLAYLIST: Song[] = [
  SUNFLOWER_STARTER,
];

const ANGREZI_SPIDER: PlaylistTrack[] = [
  { name: 'Despacito', artist: 'Luis Fonsi, Daddy Yankee' },
  { name: 'Sunflower (Spider-Man: Into the Spider-Verse)', artist: 'Post Malone, Swae Lee' },
  { name: 'Espresso', artist: 'Sabrina Carpenter' },
  { name: 'Levitating', artist: 'Dua Lipa' },
  { name: 'Attention', artist: 'Charlie Puth' },
  { name: "We Don't Talk Anymore", artist: 'Charlie Puth, Selena Gomez' },
  { name: 'One Call Away', artist: 'Charlie Puth' },
  { name: 'How Long', artist: 'Charlie Puth' },
  { name: 'See You Again', artist: 'Wiz Khalifa, Charlie Puth' },
  { name: 'Light Switch', artist: 'Charlie Puth' },
  { name: 'Left and Right', artist: 'Charlie Puth, Jung Kook' },
  { name: 'Starboy', artist: 'The Weeknd, Daft Punk' },
  { name: 'Blinding Lights', artist: 'The Weeknd' },
  { name: 'Save Your Tears', artist: 'The Weeknd' },
  { name: 'I Feel It Coming', artist: 'The Weeknd, Daft Punk' },
  { name: 'Houdini', artist: 'Dua Lipa' },
  { name: 'One Kiss', artist: 'Calvin Harris, Dua Lipa' },
  { name: "Don't Start Now", artist: 'Dua Lipa' },
  { name: 'Dance The Night', artist: 'Dua Lipa' },
  { name: 'Taste', artist: 'Sabrina Carpenter' },
  { name: 'Feather', artist: 'Sabrina Carpenter' },
  { name: 'Calm Down', artist: 'Rema, Selena Gomez' },
  { name: 'Shape of You', artist: 'Ed Sheeran' },
  { name: 'Bad Habits', artist: 'Ed Sheeran' },
  { name: 'As It Was', artist: 'Harry Styles' },
  { name: 'Watermelon Sugar', artist: 'Harry Styles' },
  { name: 'Adore You', artist: 'Harry Styles' },
  { name: 'Stay', artist: 'The Kid LAROI, Justin Bieber' },
  { name: 'Sorry', artist: 'Justin Bieber' },
  { name: 'What Do You Mean?', artist: 'Justin Bieber' },
  { name: 'Peaches', artist: 'Justin Bieber, Daniel Caesar, Giveon' },
  { name: 'Senorita', artist: 'Shawn Mendes, Camila Cabello' },
  { name: 'Havana', artist: 'Camila Cabello, Young Thug' },
  { name: "There's Nothing Holdin' Me Back", artist: 'Shawn Mendes' },
  { name: 'Stitches', artist: 'Shawn Mendes' },
  { name: 'Treat You Better', artist: 'Shawn Mendes' },
  { name: 'Cheap Thrills', artist: 'Sia' },
  { name: 'Unstoppable', artist: 'Sia' },
  { name: 'Woman', artist: 'Doja Cat' },
  { name: 'Paint The Town Red', artist: 'Doja Cat' },
  { name: 'greedy', artist: 'Tate McRae' },
  { name: 'Beautiful Things', artist: 'Benson Boone' },
  { name: 'Industry Baby', artist: 'Lil Nas X, Jack Harlow' },
  { name: 'Closer', artist: 'The Chainsmokers, Halsey' },
  { name: 'Something Just Like This', artist: 'The Chainsmokers, Coldplay' },
  { name: 'Cold Heart', artist: 'Elton John, Dua Lipa' },
];

const CHATPATA_SPIDER_NAMES = [
  'Saturday Saturday',
  'Pallo Latke',
  'Morni Banke',
  'DJ Wale Babu',
  'Abhi Toh Party Shuru Hui Hai',
  'Aaj Raat Ka Scene',
  'Wavy',
  'Bahu Kale Ki',
  'Laad Piya Ke',
  'Balam Pichkari',
  'Proper Patola',
  'Kala Chashma',
  'Genda Phool',
  'Makhna',
  'High Rated Gabru',
  'Lahore',
  'Koka',
  'Naah',
  'Suit Suit',
  'Kar Gayi Chull',
  'Mercy',
  "Let's Nacho",
  'Aankh Marey',
  'O Saki Saki',
  'Kamariya',
  'Nach Meri Rani',
  'Garmi',
  'Coca Cola',
  'Paani Paani',
  'Kusu Kusu',
  'Bijlee Bijlee',
  'Tareefan',
  'Chandigarh Mein',
  'Munda Sona Hoon Main',
  'Sweety Tera Drama',
  'Saturday Night',
  'Bom Diggy Diggy',
  'Dil Chori',
  'High Heels',
  'Patola',
  'Naagin',
  'Chittiyaan Kalaiyaan',
  'Dilliwali Girlfriend',
  'The Breakup Song',
  'Ullu Ka Pattha',
  'Badri Ki Dulhania',
  'London Thumakda',
  'Gallan Goodiyaan',
  'Desi Girl',
  'Tune Maari Entriyaan',
  'Mungda',
  'Laal Ghaghra',
  'What Jhumka?',
  'Aayi Nai',
  'Thumkeshwari',
  'Aaj Ki Raat',
  'Chikni Chameli',
];

const HARYANVI_BANGERS: PlaylistTrack[] = [
  { name: 'Laad Piya Ke' },
  { name: 'Teri Aakhya Ka Yo Kajal' },
  { name: 'Bairan' },
  { name: 'System Pe System' },
  { name: '52 Gaj Ka Daman' },
  { name: 'Gajban' },
  { name: 'Desi Desi Na Bolya Kar' },
  { name: 'Bahut Rangeen Chhora' },
  { name: 'Thada Bhartar' },
  { name: 'Kabootar' },
  { name: 'Solid Body' },
  { name: 'Warning' },
  { name: 'Hero Honda' },
  { name: 'Moto' },
  { name: 'Sheesha' },
  { name: 'Aankhya T Maregi' },
  { name: 'Jaat Ki Yaari' },
  { name: '4 G Ka Jamana' },
  { name: 'Pistol Bolegi' },
  { name: 'Roots' },
  { name: 'Raat Ke Shikari', artist: 'Masoom Sharma' },
  { name: 'Madam Ji', artist: 'Masoom Sharma' },
  { name: 'Lofar', artist: 'Masoom Sharma' },
  { name: 'Tuition Badmashi Ka', artist: 'Masoom Sharma' },
  { name: '2 Numbari', artist: 'Masoom Sharma' },
  { name: 'Chambal Ke Daku', artist: 'Masoom Sharma' },
  { name: 'Tempo', artist: 'Masoom Sharma' },
  { name: 'Parchi Mil Ki', artist: 'Masoom Sharma' },
  { name: 'Tede Mede Raste', artist: 'Masoom Sharma' },
  { name: 'Kothe Chad Lalkaru', artist: 'Masoom Sharma' },
  { name: 'Main Vohe', artist: 'Masoom Sharma' },
  { name: 'Bateu Haryane Te', artist: 'Masoom Sharma, Ashu Twinkle' },
  { name: 'Naami Gunde', artist: 'Masoom Sharma, Ashu Twinkle' },
  { name: 'Badmashan Ka Byaah', artist: 'Masoom Sharma' },
  { name: 'Balma Ke Laad', artist: 'Masoom Sharma, Ruchika Jangid' },
  { name: 'Chubare Me', artist: 'Masoom Sharma' },
  { name: 'Chamunda', artist: 'Masoom Sharma' },
  { name: 'Naam Chale' },
  { name: 'Russian Bandana' },
  { name: 'Boom Shaka' },
  { name: 'Champ' },
  { name: 'Badmash Look' },
  { name: 'Yaar Haryana Te' },
  { name: 'Desi Haan Ji' },
  { name: 'Gunda' },
  { name: 'Middle Class' },
  { name: 'Dabya Ni Karde' },
  { name: 'Kalesh' },
  { name: 'Jaat Jaat' },
  { name: 'System' },
  { name: '4 Aadmi' },
  { name: 'Gypsy' },
  { name: 'Chhora Baba Ka' },
  { name: 'Kallo' },
  { name: 'Macha Denge' },
  { name: '70 Ghaat Ka Pani' },
  { name: 'Solid Body' },
  { name: 'Dhokha' },
  { name: 'Pyar Aali Feel' },
  { name: 'Jale' },
];

const BHOJPURI_BHAUKAL: PlaylistTrack[] = [
  { name: 'Lollypop Lagelu', artist: 'Pawan Singh' },
  { name: 'Gurhi Jalebi Niyan Ras Tapke' },
  { name: 'Chali Samiyana Mein Aaj Tohre Chalte Goli' },
  { name: 'Saket Hota Raja Ji' },
  { name: 'Hook Raja Ji' },
  { name: 'Babuaan', artist: 'Pawan Singh, Shilpi Raj' },
  { name: 'Chhalakata Hamro Jawaniya', artist: 'Pawan Singh, Priyanka Singh' },
  { name: 'Palang Sagwan Ke', artist: 'Khesari Lal Yadav, Indu Sonali' },
  { name: 'Raate Diya Butake', artist: 'Pawan Singh, Indu Sonali' },
  { name: 'Pudina Ae Haseena', artist: 'Pawan Singh' },
  { name: 'Hello Koun', artist: 'Ritesh Pandey, Sneh Upadhya' },
  { name: 'Thik Hai', artist: 'Khesari Lal Yadav' },
  { name: 'Saj Ke Sawar Ke', artist: 'Khesari Lal Yadav, Priyanka Singh' },
  { name: 'Hari Hari Odhani', artist: 'Pawan Singh, Anupma Yadav' },
  { name: 'Nathuniya', artist: 'Khesari Lal Yadav, Priyanka Singh' },
  { name: 'Chat Deni Maar Deli', artist: 'Manoj Tiwari' },
  { name: 'Rinkiya Ke Papa', artist: 'Manoj Tiwari' },
  { name: 'Piyawa Se Pahile', artist: 'Ritesh Pandey' },
  { name: 'Jiya Ho Bihar Ke Lala', artist: 'Manoj Tiwari' },
  { name: 'Laal Ghaghra', artist: 'Pawan Singh, Shilpi Raj' },
  { name: 'Le Le Aayi Coca Cola', artist: 'Khesari Lal Yadav, Shilpi Raj' },
  { name: 'Pagal Banaibe', artist: 'Khesari Lal Yadav, Priyanka Singh' },
  { name: 'Raja Tani Jai Na Bahariya', artist: 'Rakesh Mishra' },
  { name: 'Saniya Mirza Ke Nathuniya', artist: 'Pawan Singh' },
  { name: 'Lehariya Luta Ae Raja', artist: 'Pawan Singh' },
  { name: 'Dhibari Me Rahue Na Tel', artist: 'Pawan Singh, Indu Sonali' },
  { name: 'Bhatarkatani', artist: 'Khesari Lal Yadav' },
  { name: 'Setting Kara K Ja', artist: 'Khesari Lal Yadav' },
  { name: 'Panche Ke Nache Aiha', artist: 'Pawan Singh, Shilpi Raj' },
  { name: 'Kamariya Kare Lapa Lap', artist: 'Pawan Singh' },
  { name: 'Aara Ke Othlali Lagelu', artist: 'Pawan Singh' },
  { name: 'Naach Re Patarki', artist: 'Arvind Akela Kallu, Shilpi Raj' },
  { name: 'Tohara Duara Pe Bajta DJ', artist: 'Arvind Akela Kallu' },
  { name: 'Kakari Bhail Ba Kamariya Lapak Ke', artist: 'Samar Singh, Kavita Yadav' },
  { name: 'Namariya Kamariya Mein Khos Deb', artist: 'Samar Singh' },
  { name: 'Bateeje Ke Mausi', artist: 'Khesari Lal Yadav, Antra Singh Priyanka' },
  { name: 'Tabla', artist: 'Khesari Lal Yadav, Shilpi Raj' },
  { name: 'Apni To Jaise Taise', artist: 'Khesari Lal Yadav, Shilpi Raj' },
  { name: 'Gori Tori Chunari Ba Laal Laal', artist: 'Ritesh Pandey, Antra Singh Priyanka' },
  { name: 'Bangliniya', artist: 'Pawan Singh' },
  { name: 'Lavandiya London Se Layenge', artist: 'Ritesh Pandey' },
  { name: 'Mitha Mitha Bathe Kamariya', artist: 'Pawan Singh' },
  { name: 'Kuware Me Ganga Nahaile Bani', artist: 'Ankush Raja, Shilpi Raj' },
  { name: 'Bullet Par Jija', artist: 'Vinay Pandey Sanu, Shilpi Raj' },
  { name: 'Nadi Biche Naiya Dole', artist: 'Shilpi Raj' },
  { name: 'Heroine', artist: 'Neelkamal Singh, Shilpi Raj' },
  { name: 'Kariya Blouse', artist: 'Shilpi Raj, Tuntun Yadav, Arvind Akela Kallu' },
  { name: 'Raja Raja Kareja Mein Samaja', artist: 'Kalpana' },
  { name: 'Sarso Ke Sagiya', artist: 'Khesari Lal Yadav, Priyanka Singh' },
  { name: 'Milte Marad Hamke Bhul Gailu', artist: 'Khesari Lal Yadav, Priyanka Singh' },
  { name: 'Ghaat Ghaat Ka Paani', artist: 'Pawan Singh' },
  { name: 'Tumsa Koi Pyaara', artist: 'Pawan Singh, Priyanka Singh' },
  { name: 'Garam Godam', artist: 'Khesari Lal Yadav, Neha Raj' },
  { name: 'Dhamaka Hoi Aara Mein', artist: 'Khesari Lal Yadav, Antra Singh Priyanka' },
  { name: 'Aashik Aawara', artist: 'Khesari Lal Yadav' },
  { name: 'Godi Mein Leke', artist: 'Pawan Singh, Shilpi Raj' },
  { name: 'Chatni', artist: 'Neelkamal Singh, Mamta Sharma' },
  { name: 'Lehenga Utha Deb Remote Se', artist: 'Pawan Singh' },
  { name: 'Mehari Ke Sukh Nahi Debu', artist: 'Pramod Premi Yadav' },
  { name: 'Chait Me Chhaila', artist: 'Pramod Premi Yadav' },
  { name: '36 Aayengi 36 Jayengi', artist: 'Ritesh Pandey' },
  { name: 'Chumma Chumma', artist: 'Pawan Singh' },
  { name: 'Laal T-Shirtwa', artist: 'Neelkamal Singh' },
  { name: 'Nadiya Bich Naiya Dole', artist: 'Khesari Lal Yadav' },
  { name: 'Odhani Ke Rang Piyar', artist: 'Khesari Lal Yadav' },
  { name: 'Bhasam', artist: 'Tuntun Yadav, Neha Raj' },
  { name: 'Patar Chhitar', artist: 'Pawan Singh' },
  { name: 'Piyawa Kirana Dukan Kiye Hai', artist: 'Samar Singh' },
];

const YO_YO_HONEY_SINGH: PlaylistTrack[] = [
  { name: 'Brown Rang' },
  { name: 'Love Dose' },
  { name: 'Blue Eyes' },
  { name: 'Desi Kalakaar' },
  { name: 'Dope Shope' },
  { name: 'High Heels Te Nachche' },
  { name: 'Angreji Beat' },
  { name: 'Lungi Dance' },
  { name: 'Dheere Dheere' },
  { name: 'One Bottle Down' },
  { name: 'Party All Night' },
  { name: 'Chaar Botal Vodka' },
  { name: 'Yaar Naa Miley' },
  { name: 'Manali Trance' },
  { name: 'Sunny Sunny' },
  { name: 'Aankhon Aankhon' },
  { name: 'Break Up Party' },
  { name: 'Bring Me Back' },
  { name: 'Raat Jashan Di' },
  { name: 'Issey Kehte Hain Hip Hop' },
  { name: 'Makhna' },
  { name: 'Stardom' },
  { name: 'Millionaire' },
  { name: 'Payal' },
  { name: 'Kudi Chamkeeli' },
  { name: 'Laal Pari' },
  { name: 'Kalaastar' },
  { name: 'Bonita' },
  { name: 'Aadat', artist: 'Yo Yo Honey Singh, AP Dhillon' },
  { name: 'Dil Chori' },
  { name: 'Kuley Kuley' },
  { name: 'Vigdiyan Heeran' },
  { name: 'High On Me' },
  { name: 'Superman' },
  { name: 'Get Up Jawani' },
  { name: 'Party With The Bhootnath' },
  { name: 'Moscow Mashuka' },
  { name: 'One Thousand Miles' },
  { name: 'Aao Raja' },
  { name: 'Stardom (Remix)' },
];

const GURU_RANDHAWA: PlaylistTrack[] = [
  { name: 'High Rated Gabru' },
  { name: 'Lahore' },
  { name: 'Suit Suit' },
  { name: 'Sirra' },
  { name: 'Ishare Tere' },
  { name: 'Lagdi Lahore Di' },
  { name: 'Patola' },
  { name: 'Made in India' },
  { name: 'Ban Ja Rani' },
  { name: 'AZUL' },
  { name: 'Qatal' },
  { name: 'Kaun Nachdi' },
  { name: 'DOPAMINE' },
  { name: 'Morni Banke' },
  { name: 'SHKINI' },
  { name: 'QEHER' },
  { name: 'Naach Meri Rani' },
  { name: 'PARIS' },
  { name: 'Surma Surma' },
  { name: 'Slowly Slowly' },
  { name: 'Dance Meri Rani' },
  { name: 'Baby Girl' },
  { name: 'Daaru Wargi' },
  { name: 'Raat Kamaal Hai' },
  { name: 'Tera Ki Khayal' },
  { name: 'Outfit' },
  { name: 'Khat' },
  { name: 'Fashion' },
  { name: 'Tere Te' },
  { name: 'Yaar Mod Do' },
  { name: 'Tu Meri Rani' },
  { name: 'Nain Ta Heere' },
  { name: 'Black Raat' },
  { name: 'Perfect' },
  { name: 'Pan India' },
  { name: 'Selfie' },
  { name: 'Main Deewana Tera' },
  { name: 'Fine Shyt' },
];

const BADSHAH: PlaylistTrack[] = [
  { name: 'DJ Waley Babu' },
  { name: 'Kar Gayi Chull' },
  { name: 'Proper Patola' },
  { name: 'Mercy' },
  { name: 'Genda Phool' },
  { name: 'Buzz' },
  { name: 'She Move It Like' },
  { name: 'Players' },
  { name: 'Jugnu' },
  { name: 'Naina' },
  { name: 'Akh Lad Jaave' },
  { name: 'Tareefan' },
  { name: 'The Humma Song' },
  { name: 'Garmi' },
  { name: 'Paani Paani' },
  { name: 'Abhi Toh Party Shuru Hui Hai' },
  { name: 'Saturday Saturday' },
  { name: "Let's Nacho" },
  { name: 'Chandigarh Mein' },
  { name: 'Bad Boy X Bad Girl' },
  { name: 'Wakhra Swag' },
  { name: 'Paagal' },
  { name: 'Kamaal' },
  { name: 'Baaki Baatein Peene Baad' },
  { name: 'Daaku' },
  { name: 'God Damn' },
  { name: 'Sanak' },
  { name: 'Voodoo' },
  { name: 'Aasman' },
  { name: 'Roll Up' },
  { name: 'Soulmate' },
  { name: 'Kokaina' },
  { name: 'Morni' },
  { name: 'Sajan Re' },
  { name: 'Gori Hai Kalaiyan' },
  { name: 'Kyaa Baat Ay' },
  { name: 'Tere Naal Nachna' },
  { name: 'Sheher Ki Ladki' },
  { name: 'Dheere Dheere' },
  { name: 'Aaj Se Teri' },
  { name: 'Mercy (Remix)' },
  { name: 'Heartless' },
  { name: 'One' },
  { name: 'Driving Slow' },
  { name: 'Baaki Baatein Peene Baad' },
  { name: 'Aaja Ni Aaja' },
  { name: 'Wakhra Song' },
  { name: 'Pinjra' },
  { name: 'Mummy Nu Pasand' },
  { name: 'Gone Girl' },
];

const KARAN_AUJLA: PlaylistTrack[] = [
  { name: 'Tauba Tauba' },
  { name: 'Winning Speech' },
  { name: 'Softly' },
  { name: 'Wavy' },
  { name: "Admirin' You" },
  { name: '52 Bars' },
  { name: 'Players' },
  { name: 'White Brown Black' },
  { name: 'Mexico' },
  { name: 'On Top' },
  { name: "Don't Look" },
  { name: 'For A Reason' },
  { name: 'Boyfriend' },
  { name: 'Antidote' },
  { name: 'Chitta Kurta' },
  { name: 'Jhanjar' },
  { name: 'Gangsta' },
  { name: 'Sheikh' },
  { name: 'Take It Easy' },
  { name: 'Bachke Bachke' },
  { name: 'Yeah Naah' },
  { name: 'Kya Baat Aa' },
  { name: 'Jee Ni Lagda' },
  { name: "Don't Worry" },
  { name: "Don't Look 2" },
  { name: 'Hukam' },
  { name: 'Red Eyes' },
  { name: 'Here & There' },
  { name: 'Na Na Na' },
  { name: 'Players' },
  { name: 'Facts' },
  { name: 'Hint' },
  { name: 'Chithiyaan' },
  { name: 'Rim vs Jhanjar' },
  { name: "Goin' Off" },
  { name: 'Mexico' },
  { name: '5-7' },
  { name: 'Low Fade' },
  { name: 'I Really Do...' },
  { name: 'MF Gabhru!' },
];

const SHUBH: PlaylistTrack[] = [
  { name: 'One Love' },
  { name: 'Cheques' },
  { name: 'We Rollin' },
  { name: 'Still Rollin' },
  { name: 'No Love' },
  { name: 'Elevated' },
  { name: 'Supreme' },
  { name: 'Bandana' },
  { name: 'Baller' },
  { name: 'You and Me' },
  { name: 'OG' },
  { name: 'MVP' },
  { name: 'Fell For You' },
  { name: 'Balenci' },
  { name: 'Moves' },
  { name: 'Bounce' },
  { name: 'Sohniye' },
  { name: 'Ace' },
  { name: 'Broken' },
  { name: 'Aura' },
  { name: 'Together' },
  { name: 'Be Mine' },
  { name: 'King Shit' },
  { name: 'Dior' },
  { name: 'Ruthless' },
  { name: 'Ice' },
  { name: 'The Flow' },
  { name: 'No Competition' },
  { name: 'Her' },
  { name: 'Homicide' },
];

const NEHA_KAKKAR: PlaylistTrack[] = [
  { name: 'Kala Chashma' },
  { name: 'Dilbar' },
  { name: 'Aankh Marey' },
  { name: 'O Saki Saki' },
  { name: 'London Thumakda' },
  { name: 'Kar Gayi Chull' },
  { name: 'Manali Trance' },
  { name: 'Sunny Sunny' },
  { name: 'Garmi' },
  { name: 'Main Tera Boyfriend' },
  { name: 'Laal Ghaghra' },
  { name: 'Coca Cola' },
  { name: 'Aankh Marey Remix' },
  { name: 'Gal Ban Gayi' },
  { name: 'Aa Toh Sahi' },
  { name: 'Oonchi Hai Building 2.0' },
  { name: 'Hook Up Song' },
  { name: 'Aao Raja' },
  { name: 'Mehbooba' },
  { name: 'Teri Bhabhi' },
  { name: 'Lamborghini' },
  { name: 'Hauli Hauli' },
  { name: 'Bhangra Ta Sajda' },
  { name: 'Daaru Peeke Dance' },
  { name: 'Tension Wali Raat' },
  { name: 'Naughty No. 1' },
  { name: 'Gol Gappa' },
  { name: 'Maro Line' },
  { name: 'Beer Khole' },
  { name: 'I Am Single' },
];

const TONY_KAKKAR: PlaylistTrack[] = [
  { name: 'Coca Cola' },
  { name: 'Dheeme Dheeme' },
  { name: 'Mile Ho Tum' },
  { name: 'Khuda Bhi' },
  { name: 'Sawan Aaya Hai' },
  { name: 'Kanta Laga' },
  { name: 'Goa Beach' },
  { name: 'Phone Mein Teri Photo' },
  { name: 'Coca Cola Tu' },
  { name: 'Oh Humsafar' },
  { name: 'Saath Kya Nibhaoge' },
  { name: 'Zindagi Bata De' },
  { name: 'Akhiyan' },
  { name: 'Mile Ho Tum (Reprise)' },
  { name: 'Mohabbat Nasha Hai' },
  { name: 'Bheegi Bheegi' },
  { name: 'Chaand Mera Naraz Hai' },
  { name: 'Yaari Hai' },
  { name: 'Sardi Ki Raat' },
  { name: 'Lori Suna' },
];

const ROMANTIC_VIBE: PlaylistTrack[] = [
  { name: 'Tum Hi Ho', artist: 'Aashiqui 2' },
  { name: 'Galliyan', artist: 'Ek Villain' },
  { name: 'Makhna', artist: 'Drive' },
  { name: 'Qaafirana', artist: 'Kedarnath' },
  { name: 'Hareya', artist: 'Meri Pyaari Bindu' },
  { name: 'Hawayein', artist: 'Jab Harry Met Sejal' },
  { name: 'Shayad', artist: 'Love Aaj Kal' },
  { name: 'Nazm Nazm', artist: 'Bareilly Ki Barfi' },
  { name: 'Raatan Lambiyan', artist: 'Shershaah' },
  { name: 'Zaalima', artist: 'Raees' },
  { name: 'Saibo', artist: 'Shor in the City' },
  { name: 'Ishq Bulaava', artist: 'Hasee Toh Phasee' },
  { name: 'Apna Bana Le', artist: 'Bhediya' },
  { name: 'Tere Hawaale', artist: 'Laal Singh Chaddha' },
  { name: 'Pashmina', artist: 'Fitoor' },
  { name: 'Enna Sona', artist: 'OK Jaanu' },
  { name: 'Zehnaseeb', artist: 'Hasee Toh Phasee' },
  { name: 'Dil Diyan Gallan', artist: 'Tiger Zinda Hai' },
  { name: 'Subhanallah', artist: 'Yeh Jawaani Hai Deewani' },
  { name: 'Ranjha', artist: 'Shershaah' },
  { name: 'Meherbaan', artist: 'Bang Bang!' },
  { name: 'Tum Se', artist: 'Teri Baaton Mein Aisa Uljha Jiya' },
  { name: 'Hosanna', artist: 'Ekk Deewana Tha' },
  { name: 'Iktara', artist: 'Wake Up Sid' },
  { name: 'Humsafar', artist: 'Badrinath Ki Dulhania' },
  { name: 'Mast Magan', artist: '2 States' },
  { name: 'Bheegi Si Bhaagi Si', artist: 'Raajneeti' },
  { name: 'Te Amo', artist: 'Dum Maaro Dum' },
  { name: 'Jaan Nisaar', artist: 'Kedarnath' },
  { name: 'Sukoon Mila', artist: 'Mary Kom' },
  { name: 'Mere Bina', artist: 'Crook' },
  { name: 'Khairiyat', artist: 'Chhichhore' },
  { name: 'Aaj Din Chadheya', artist: 'Love Aaj Kal' },
  { name: 'Tum Mile (Love Reprise)', artist: 'Tum Mile' },
  { name: 'Rasiya', artist: 'Brahmastra' },
  { name: 'Tu Jo Mila', artist: 'Bajrangi Bhaijaan' },
  { name: 'Tum Tak', artist: 'Raanjhanaa' },
  { name: 'Mere Naam Tu', artist: 'Zero' },
  { name: 'Dekha Hazaro Dafa', artist: 'Rustom' },
  { name: 'O Saathi', artist: 'Baaghi 2' },
  { name: 'Sajni', artist: 'Laapataa Ladies' },
  { name: 'Pehli Dafa', artist: 'Atif Aslam' },
  { name: 'Tere Sang Yaara', artist: 'Rustom' },
  { name: 'Safarnama', artist: 'Tamasha' },
  { name: 'Sanam Re', artist: 'Sanam Re' },
  { name: 'Kinna Sona', artist: 'Marjaavaan' },
  { name: 'Ishq Wala Love', artist: 'Student of the Year' },
  { name: 'Tu Hai Ki Nahi', artist: 'Roy' },
  { name: 'Phir Kabhi', artist: 'M.S. Dhoni: The Untold Story' },
  { name: 'Chal Ghar Chalen', artist: 'Malang' },
];

const PLAYLIST_MONOGRAMS: Record<string, string> = {
  angrezi: 'AS',
  chatpata: 'CS',
  haryanvi: 'HB',
  bhojpuri: 'BB',
  honeysingh: 'YY',
  gururandhawa: 'GR',
  badshah: 'BD',
  karanaujla: 'KA',
  shubh: 'SH',
  nehakakkar: 'NK',
  tonykakkar: 'TK',
  romantic: 'RV',
};

const CURATED_PLAYLISTS: CuratedPlaylist[] = [
  { id: 'angrezi', name: 'Angrezi Spider', label: 'Global pop', tracks: ANGREZI_SPIDER },
  {
    id: 'chatpata',
    name: 'Chatpata Spider',
    label: 'Desi party',
    tracks: CHATPATA_SPIDER_NAMES.map((name) => ({ name })),
  },
  { id: 'haryanvi', name: 'Haryanvi Bangers', label: 'Desi heat', tracks: HARYANVI_BANGERS },
  { id: 'bhojpuri', name: 'Bhojpuri Bhaukal', label: 'Bihar heat', tracks: BHOJPURI_BHAUKAL },
  { id: 'honeysingh', name: 'Yo Yo Honey Singh', label: 'Hip Hop/Pop', tracks: YO_YO_HONEY_SINGH },
  { id: 'gururandhawa', name: 'Guru Randhawa', label: 'Punjabi/Pop', tracks: GURU_RANDHAWA },
  { id: 'badshah', name: 'Badshah', label: 'Rap/Party', tracks: BADSHAH },
  { id: 'karanaujla', name: 'Karan Aujla', label: 'Punjabi rap', tracks: KARAN_AUJLA },
  { id: 'shubh', name: 'Shubh', label: 'Punjabi wave', tracks: SHUBH },
  { id: 'nehakakkar', name: 'Neha Kakkar', label: 'Bollywood hits', tracks: NEHA_KAKKAR },
  { id: 'tonykakkar', name: 'Tony Kakkar', label: 'Pop melodies', tracks: TONY_KAKKAR },
  { id: 'romantic', name: 'Romantic Vibe', label: 'Love songs', tracks: ROMANTIC_VIBE },
];

function buildPlaylistQueue(collection: CuratedPlaylist): Song[] {
  return collection.tracks.map((track, index) => ({
    id: `${collection.id}-${index}`,
    name: track.name,
    artist: track.artist || collection.name,
    image: '',
    downloadUrl: '',
    duration: 0,
    query: [track.name, track.artist].filter(Boolean).join(' '),
  }));
}

/* ─── Format time ─── */
function fmt(s: number) {
  if (!s || isNaN(s) || !isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

/* ─── Equalizer bars ─── */
function Equalizer({ active }: { active: boolean }) {
  const bars = [
    { min: 3, max: 14, speed: 0.35 },
    { min: 5, max: 18, speed: 0.45 },
    { min: 2, max: 12, speed: 0.3 },
    { min: 6, max: 16, speed: 0.5 },
    { min: 4, max: 14, speed: 0.38 },
  ];
  return (
    <div className="equalizer">
      {bars.map((b, i) => (
        <div
          key={i}
          className={`eq-bar ${active ? 'active' : ''}`}
          style={{
            '--eq-min': `${b.min}px`,
            '--eq-max': `${b.max}px`,
            '--eq-speed': `${b.speed}s`,
            height: active ? undefined : `${b.min}px`,
            animationDelay: `${i * 0.08}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

/* ─── SVG Icons ─── */
const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-0.5">
    <path d="M8 5v14l11-7z" />
  </svg>
);
const PauseIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </svg>
);
const PrevIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
  </svg>
);
const NextIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M16 18h2V6h-2zM6 18l8.5-6L6 6z" />
  </svg>
);
const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const ListIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/* ─── Web Decoration ─── */
function WebDecoration() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
      {[15, 35, 60, 80].map((top, i) => (
        <div
          key={i}
          className="web-line"
          style={{
            top: `${top}%`,
            left: i % 2 === 0 ? '0' : '40%',
            width: i % 2 === 0 ? '30%' : '60%',
            transform: `rotate(${-5 + i * 3}deg)`,
          }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════ MAIN APP ═══════════════════════════════════ */
export default function App() {
  const LOCAL_KEY = 'spidey-one-more-song';

  const loadSaved = () => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };

  const saveState = useCallback((data: unknown) => {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(data)); } catch {}
  }, []);

  const [saved] = useState(() => loadSaved());
  const [showIntro, setShowIntro] = useState(saved ? false : true);
  const [introFading, setIntroFading] = useState(false);
  const [playlist, setPlaylist] = useState<Song[]>(() => {
    if (!Array.isArray(saved?.playlist) || !saved.playlist.length) return DEFAULT_PLAYLIST;
    return saved.playlist.map((song: Song) => ({ ...song, image: song.image || '', duration: song.duration || 0 }));
  });
  const [currentIdx, setCurrentIdx] = useState(() => Number.isInteger(saved?.currentIdx) ? saved.currentIdx : 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => Number(saved?.currentTime) || 0);
  const [duration, setDuration] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState(saved?.selectedCollectionId || CURATED_PLAYLISTS[0].id);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(saved?.activeCollectionId || null);
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);
  const [playlistMessage, setPlaylistMessage] = useState('');
  const [oneMoreCount, setOneMoreCount] = useState(() => Number(saved?.oneMoreCount) || 1);
  const [showSpideySense, setShowSpideySense] = useState(false);
  const [showThwip, setShowThwip] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyrics, setLyrics] = useState<{ time: number; text: string }[] | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsError, setLyricsError] = useState('');

  const audioRef = useRef<HTMLAudioElement>(null);
  const searchPopoverRef = useRef<HTMLDivElement>(null);
  const playlistPopoverRef = useRef<HTMLDivElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const playlistButtonRef = useRef<HTMLButtonElement>(null);
  const resolveRequestRef = useRef(0);
  const shouldAutoPlayRef = useRef(false);
  const introSongRef = useRef<Song | null>(null);
  const introInitializedRef = useRef(false);
  const lastSongIdRef = useRef<string | null>(null);
  const senseTimerRef = useRef<number | null>(null);
  const thwipTimerRef = useRef<number | null>(null);
  const persistenceTimerRef = useRef<number | null>(null);
  const pendingSeekRef = useRef(Number(saved?.currentTime) || 0);

  const currentSong = playlist[currentIdx] || DEFAULT_PLAYLIST[0];
  const selectedCollection = CURATED_PLAYLISTS.find(({ id }) => id === selectedCollectionId) || CURATED_PLAYLISTS[0];

  /* ─── Active lyric line index ─── */
  const activeLineIndex = useMemo(() => {
    if (!lyrics || lyrics.length === 0) return 0;
    let idx = 0;
    for (let i = 0; i < lyrics.length; i++) {
      if (currentTime >= lyrics[i].time) idx = i;
      else break;
    }
    return idx;
  }, [lyrics, currentTime]);

  /* ─── Lyrics Fetcher — Waterfall Strategy ─── */
  useEffect(() => {
    if (!showLyrics || !currentSong) return;
    let active = true;
    setLyricsLoading(true);
    setLyricsError('');
    setLyrics(null);

    const fetchLyrics = async () => {
      try {
        // Stage 1: Exact match
        const exactRes = await fetch(
          `https://lrclib.net/api/get?track_name=${encodeURIComponent(currentSong.name)}&artist_name=${encodeURIComponent(currentSong.artist)}`
        );
        if (exactRes.ok) {
          const data = await exactRes.json();
          if (data?.syncedLyrics) {
            if (active) { setLyrics(parseLrc(data.syncedLyrics)); setLyricsError(''); setLyricsLoading(false); }
            return;
          }
        }

        // Stage 2: Fuzzy search fallback
        const searchRes = await fetch(
          `https://lrclib.net/api/search?q=${encodeURIComponent(currentSong.name + ' ' + currentSong.artist)}`
        );
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (Array.isArray(searchData)) {
            const syncedResult = searchData.find((item: any) => item.syncedLyrics);
            if (syncedResult) {
              if (active) { setLyrics(parseLrc(syncedResult.syncedLyrics)); setLyricsError(''); setLyricsLoading(false); }
              return;
            }
          }
        }

        // Stage 3: Nothing found
        if (active) {
          setLyrics(null);
          setLyricsError('No synced lyrics available.');
          setLyricsLoading(false);
        }
      } catch {
        if (active) {
          setLyrics(null);
          setLyricsError('Failed to fetch lyrics.');
          setLyricsLoading(false);
        }
      }
    };

    fetchLyrics();
    return () => { active = false; };
  }, [showLyrics, currentSong]);

  const triggerSongFx = useCallback((songId: string, countChange: boolean) => {
    if (lastSongIdRef.current === songId) return;
    lastSongIdRef.current = songId;

    if (countChange) {
      setOneMoreCount((n) => n + 1);
    }

    setShowThwip(true);
    setShowSpideySense(true);

    if (thwipTimerRef.current) window.clearTimeout(thwipTimerRef.current);
    if (senseTimerRef.current) window.clearTimeout(senseTimerRef.current);

    thwipTimerRef.current = window.setTimeout(() => setShowThwip(false), 420);
    senseTimerRef.current = window.setTimeout(() => setShowSpideySense(false), 1600);
  }, []);

  useEffect(() => {
    return () => {
      if (senseTimerRef.current) window.clearTimeout(senseTimerRef.current);
      if (thwipTimerRef.current) window.clearTimeout(thwipTimerRef.current);
      if (persistenceTimerRef.current) window.clearTimeout(persistenceTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (showIntro) return;
    const songId = currentSong.id;
    if (!songId) return;
    const shouldCount = lastSongIdRef.current !== null && lastSongIdRef.current !== songId;
    triggerSongFx(songId, shouldCount);
  }, [currentSong.id, showIntro, triggerSongFx]);

  /* Preload the intro track while the welcome layer is still on screen. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const results = await searchSongs(SUNFLOWER_STARTER.query || SUNFLOWER_STARTER.name);
      if (!cancelled && results[0]?.downloadUrl) {
        introSongRef.current = { ...results[0], id: SUNFLOWER_STARTER.id, query: SUNFLOWER_STARTER.query };
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ── Audio event listeners ── */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setCurrentTime(audio.currentTime);
    const onDur = () => {
      setDuration(audio.duration || 0);
      if (pendingSeekRef.current > 0 && Number.isFinite(audio.duration)) {
        audio.currentTime = Math.min(pendingSeekRef.current, Math.max(0, audio.duration - 0.25));
        pendingSeekRef.current = 0;
      }
    };
    const onEnd = () => handleNext();
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onDur);
    audio.addEventListener('durationchange', onDur);
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onDur);
      audio.removeEventListener('durationchange', onDur);
      audio.removeEventListener('ended', onEnd);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, playlist]);

  /* ── Load song when index changes ── */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong.downloadUrl) return;
    if (audio.src !== currentSong.downloadUrl) {
      audio.src = currentSong.downloadUrl;
      audio.load();
    }
    if (isPlaying || shouldAutoPlayRef.current) {
      shouldAutoPlayRef.current = false;
      audio.play().catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, playlist]);

  /* ── Handlers ── */
  const handlePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong.downloadUrl) return;
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [currentSong]);

  const playQueueIndex = useCallback(async (index: number, queueOverride?: Song[]) => {
    const queue = queueOverride || playlist;
    const target = queue[index];
    if (!target) return;

    setCurrentIdx(index);
    setCurrentTime(0);
    setDuration(target.duration || 0);
    setPlaylistMessage('');

    if (target.downloadUrl) {
      shouldAutoPlayRef.current = true;
      setIsPlaying(true);
      return;
    }

    audioRef.current?.pause();
    setIsPlaying(false);
    setLoadingTrackId(target.id);
    const requestId = ++resolveRequestRef.current;
    const results = await searchSongs(target.query || `${target.name} ${target.artist}`);

    if (requestId !== resolveRequestRef.current) return;

    const match = results[0];
    if (!match?.downloadUrl) {
      setLoadingTrackId(null);
      setPlaylistMessage('This track is not available on NepoTune yet.');
      return;
    }

    const resolved: Song = { ...match, id: target.id, query: target.query };
    shouldAutoPlayRef.current = true;
    setPlaylist((current) => current.map((song) => song.id === target.id ? resolved : song));
    setLoadingTrackId(null);
    setIsPlaying(true);
  }, [playlist]);

  const handleNext = useCallback(() => {
    if (!playlist.length) return;
    if (currentSong.id === SUNFLOWER_STARTER.id) {
      setSelectedCollectionId('angrezi');
      setActiveCollectionId('angrezi');
    }
    void playQueueIndex((currentIdx + 1) % playlist.length);
  }, [currentIdx, currentSong.id, playQueueIndex, playlist.length]);

  const handlePrev = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    if (!playlist.length) return;
    void playQueueIndex((currentIdx - 1 + playlist.length) % playlist.length);
  }, [currentIdx, playQueueIndex, playlist.length]);

  const handleSeek = useCallback((value: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    const nextTime = Math.max(0, Math.min(value, audio.duration));
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const results = await searchSongs(searchQuery);
    setSearchResults(results);
    setSearching(false);
  }, [searchQuery]);

  const handlePlayFromSearch = useCallback((song: Song) => {
    // Add to playlist if not present
    const exists = playlist.find((s) => s.id === song.id);
    if (!exists) {
      setPlaylist((prev) => [...prev, song]);
      setCurrentIdx(playlist.length);
    } else {
      setCurrentIdx(playlist.findIndex((s) => s.id === song.id));
    }
    setActiveCollectionId(null);
    shouldAutoPlayRef.current = true;
    setIsPlaying(true);
    setShowSearch(false);
  }, [playlist]);

  const handlePlayCuratedTrack = useCallback((collection: CuratedPlaylist, index: number) => {
    const queue = buildPlaylistQueue(collection);
    resolveRequestRef.current += 1;
    setSelectedCollectionId(collection.id);
    setActiveCollectionId(collection.id);
    setPlaylist(queue);
    void playQueueIndex(index, queue);
  }, [playQueueIndex]);

  const initializePlayer = useCallback(() => {
    if (introInitializedRef.current) return;
    introInitializedRef.current = true;

    const angrezi = CURATED_PLAYLISTS.find(({ id }) => id === 'angrezi') || CURATED_PLAYLISTS[0];
    const queuedAngrezi = buildPlaylistQueue(angrezi).filter((track) => !track.name.toLowerCase().includes('sunflower'));
    const initialSong = introSongRef.current || SUNFLOWER_STARTER;
    const initialQueue = [initialSong, ...queuedAngrezi];

    resolveRequestRef.current += 1;
    setPlaylist(initialQueue);
    setCurrentIdx(0);
    setCurrentTime(0);
    setDuration(initialSong.duration || 0);
    setSelectedCollectionId('angrezi');
    setActiveCollectionId(null);
    setPlaylistMessage('');

    const audio = audioRef.current;
    if (initialSong.downloadUrl && audio) {
      audio.src = initialSong.downloadUrl;
      audio.load();
      setIsPlaying(true);
      audio.play().catch(() => {
        setIsPlaying(false);
        setPlaylistMessage('Tap play to begin Sunflower.');
      });
      return;
    }

    void playQueueIndex(0, initialQueue);
  }, [playQueueIndex]);

  /* Persist at most once per second so audio progress never causes storage jank. */
  useEffect(() => {
    if (persistenceTimerRef.current) return;
    persistenceTimerRef.current = window.setTimeout(() => {
      saveState({
        selectedCollectionId,
        activeCollectionId,
        currentIdx,
        currentTime,
        isPlaying,
        showIntro,
        oneMoreCount,
        playlist: playlist.map((s) => ({
          id: s.id,
          name: s.name,
          artist: s.artist,
          image: s.image || '',
          downloadUrl: s.downloadUrl || '',
          duration: s.duration || 0,
          query: s.query || '',
        })),
      });
      persistenceTimerRef.current = null;
    }, 1000);
  }, [selectedCollectionId, activeCollectionId, currentIdx, currentTime, isPlaying, showIntro, oneMoreCount, playlist, saveState]);

  const handleIntro = useCallback(() => {
    if (introFading) return;
    setIntroFading(true);
    initializePlayer();
    setTimeout(() => setShowIntro(false), 700);
  }, [initializePlayer, introFading]);

  const toggleSearch = useCallback(() => {
    setShowSearch((p) => !p);
    if (showPlaylist) setShowPlaylist(false);
  }, [showPlaylist]);

  const togglePlaylist = useCallback(() => {
    setShowPlaylist((p) => !p);
    if (showSearch) setShowSearch(false);
  }, [showSearch]);

  /* Close floating panels as soon as the user interacts anywhere outside them. */
  useEffect(() => {
    if (!showSearch && !showPlaylist) return;

    const dismissPopovers = (event: PointerEvent) => {
      const target = event.target as Node;
      const isInsideSearch = searchPopoverRef.current?.contains(target) || searchButtonRef.current?.contains(target);
      const isInsidePlaylist = playlistPopoverRef.current?.contains(target) || playlistButtonRef.current?.contains(target);

      if (showSearch && !isInsideSearch) setShowSearch(false);
      if (showPlaylist && !isInsidePlaylist) setShowPlaylist(false);
    };

    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowSearch(false);
        setShowPlaylist(false);
      }
    };

    document.addEventListener('pointerdown', dismissPopovers);
    document.addEventListener('keydown', dismissOnEscape);
    return () => {
      document.removeEventListener('pointerdown', dismissPopovers);
      document.removeEventListener('keydown', dismissOnEscape);
    };
  }, [showPlaylist, showSearch]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  /* ═══════════════════════════════════ RENDER ═══════════════════════════════════ */
  return (
    <div className="w-full h-full relative overflow-hidden select-none">
      {/* Hidden audio */}
      <audio ref={audioRef} preload="auto" crossOrigin="anonymous" />

      {/* ──── INTRO SCREEN ──── */}
      {showIntro && (
        <div
          className={`intro-screen ${introFading ? 'fade-out' : ''}`}
          onClick={handleIntro}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') handleIntro();
          }}
          role="button"
          tabIndex={0}
          aria-label="Start Spider-Man: One More Song"
        >
          <div
            className="intro-background"
            style={{ backgroundImage: `url(${BACKGROUND_IMAGE})` }}
          />
          <div className="intro-wash" />

          {/* Subtle web lines */}
          <div className="absolute inset-0 pointer-events-none opacity-10">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <line x1="50" y1="0" x2="0" y2="50" stroke="white" strokeWidth="0.1" />
              <line x1="50" y1="0" x2="100" y2="50" stroke="white" strokeWidth="0.1" />
              <line x1="50" y1="0" x2="30" y2="100" stroke="white" strokeWidth="0.1" />
              <line x1="50" y1="0" x2="70" y2="100" stroke="white" strokeWidth="0.1" />
              <line x1="0" y1="30" x2="100" y2="30" stroke="white" strokeWidth="0.05" opacity="0.5" />
              <line x1="0" y1="60" x2="100" y2="60" stroke="white" strokeWidth="0.05" opacity="0.3" />
            </svg>
          </div>

          <div className="intro-content">
            {/* Minimal premium intro: only pulse button + short label */}
            <div className="intro-pulse-btn mb-5" aria-hidden="true">
              <span className="intro-venom-web">🕸️</span>
            </div>

            <p className="text-white/40 text-[10px] tracking-[0.35em] uppercase mb-1">
              Spidey FM
            </p>
            <p className="text-white/30 text-[10px] tracking-[0.2em] uppercase animate-pulse">
              Tap to begin
            </p>
          </div>
        </div>
      )}

      {/* ──── MAIN SCREEN ──── */}
      {!showIntro && (
        <div className="w-full h-full main-fade-in">
          {/* Background image */}
            <div
             className="hero-background absolute inset-0 bg-cover bg-no-repeat"
            style={{
              backgroundImage: `url(${BACKGROUND_IMAGE})`,
            }}
          />
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/18 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />


          {/* ──── Floating Draggable Lyrics ──── */}
          {showLyrics && (
            <Draggable handle=".lyrics-drag-handle">
              <div
                className="absolute z-[100] left-4 bottom-32 flex flex-col items-center justify-center pointer-events-auto"
                style={{ width: 'min(90vw, 500px)', cursor: 'grab' }}
              >
                {/* Invisible drag handle — covers entire block */}
                <div className="lyrics-drag-handle w-full absolute inset-0 z-10" />

                {lyricsLoading ? (
                  <p className="text-white/50 text-sm text-center px-4 relative z-20 pointer-events-none">
                    Loading lyrics...
                  </p>
                ) : lyricsError ? (
                  <p className="text-white/50 text-sm text-center px-4 relative z-20 pointer-events-none">
                    {lyricsError}
                  </p>
                ) : lyrics ? (
                  <div
                    className="relative w-full h-[150px] overflow-hidden flex flex-col items-center pointer-events-none drop-shadow-md"
                  >
                    {lyrics.map((line, i) => {
                      const offset = i - activeLineIndex;
                      if (offset < -2 || offset > 2) return null;
                      const isCenter = offset === 0;
                      return (
                        <p
                          key={i}
                          className="absolute w-full text-center font-medium px-4"
                          style={{
                            height: '40px',
                            top: '55px',
                            transition: 'all 700ms cubic-bezier(0.2, 0.8, 0.2, 1)',
                            transform: `translateY(${offset * 40}px) scale(${isCenter ? 1 : 0.95})`,
                            transformOrigin: 'center center',
                            opacity: isCenter ? 1 : (Math.abs(offset) === 1 ? 0.4 : 0),
                            fontWeight: isCenter ? 800 : 500,
                            fontSize: isCenter ? '1.25rem' : '1rem',
                            color: 'white',
                            textShadow: isCenter
                              ? '0 0 15px rgba(255,255,255,0.5), 0 2px 8px rgba(0,0,0,0.8)'
                              : '0 1px 4px rgba(0,0,0,0.8)',
                          }}
                        >
                          {anyAscii(line.text)}
                        </p>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </Draggable>
          )}

          <WebDecoration />

          {/* Content container */}
          <div className="relative z-10 w-full h-full flex flex-col justify-between p-4 sm:p-6 md:p-8 lg:p-10" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}>
            <p className="top-brand">Spidey FM</p>
            <p className="maker-credit"><span>Made by :</span> <a href="https://www.instagram.com/ur.spideey" target="_blank" rel="noopener noreferrer" aria-label="Visit @ur.spideey on Instagram">@ur.spideey</a></p>

            <div className="flex-1" aria-hidden="true" />

            {/* ──── BOTTOM: MUSIC PLAYER ──── */}
            <div className="w-full flex justify-center relative">
              <p className="one-more-counter" aria-live="polite">
                ONE MORE SONG × {String(oneMoreCount).padStart(2, '0')}
              </p>
              {/* Popovers */}
              {showSearch && (
                <div ref={searchPopoverRef} className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-[min(92vw,380px)] popover-enter z-50">
                  <div className="glass-card rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-white/90">Find your next song</h3>
                      <button onClick={() => setShowSearch(false)} className="btn-hover text-white/50 hover:text-white/80 p-1">
                        <CloseIcon />
                      </button>
                    </div>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        placeholder="Song or artist"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="flex-1 bg-white/8 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-red-500/40 transition-colors"
                        autoFocus
                      />
                      <button
                        onClick={handleSearch}
                        disabled={searching}
                        className="btn-hover px-4 py-2 rounded-xl text-sm font-medium text-white"
                        style={{ background: 'linear-gradient(135deg, #e63946, #b71c1c)' }}
                      >
                        {searching ? '...' : 'Play'}
                      </button>
                    </div>
                    {searchResults.length > 0 && (
                      <div className="max-h-[35vh] overflow-y-auto custom-scrollbar space-y-1">
                        {searchResults.map((song) => (
                          <button
                            key={song.id}
                            onClick={() => handlePlayFromSearch(song)}
                            className="search-result-item w-full flex items-center gap-3 p-2 rounded-xl text-left"
                          >
                            {song.image ? (
                              <img src={song.image} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-white/10 flex-shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-white/90 truncate">{song.name}</p>
                              <p className="text-[10px] text-white/40 truncate">{song.artist}</p>
                            </div>
                            <span className="text-[10px] text-white/30 flex-shrink-0">{fmt(song.duration)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {showPlaylist && (
                <div ref={playlistPopoverRef} className="playlist-popover absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-[min(94vw,420px)] popover-enter z-50">
                  <div className="glass-card rounded-2xl p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2.5">
                      <div>
                        <h3 className="text-sm font-semibold text-white/90">Spidey's Picks</h3>
                        <p className="text-[9px] uppercase tracking-[0.18em] text-white/30">{CURATED_PLAYLISTS.length} playlists</p>
                      </div>
                      <button
                        onClick={() => setShowPlaylist(false)}
                        className="btn-hover text-white/50 hover:text-white/80 p-1"
                        aria-label="Close playlists"
                      >
                        <CloseIcon />
                      </button>
                    </div>

                    <div className="playlist-collection-grid mb-3">
                      {CURATED_PLAYLISTS.map((collection) => {
                        const selected = selectedCollection.id === collection.id;
                        return (
                          <button
                            key={collection.id}
                            onClick={() => {
                              setSelectedCollectionId(collection.id);
                              setPlaylistMessage('');
                            }}
                            className={`playlist-collection-button ${selected ? 'is-selected' : ''}`}
                            aria-pressed={selected}
                          >
                            <span className={`playlist-monogram ${collection.id}`}>
                              {PLAYLIST_MONOGRAMS[collection.id] || collection.name.slice(0, 2).toUpperCase()}
                            </span>
                            <span className="min-w-0 text-left">
                              <span className="block text-[11px] font-semibold text-white/90 truncate">{collection.name}</span>
                              <span className="block text-[9px] text-white/35 truncate">
                                {collection.label} / {collection.tracks.length} songs
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-end justify-between mb-1.5 px-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">
                        {selectedCollection.name}
                      </p>
                      <p className="text-[9px] text-white/25">Tap a track to play</p>
                    </div>

                    {playlistMessage && (
                      <p className="mb-1.5 px-2 py-1.5 rounded-lg bg-red-500/10 text-[10px] text-red-300/80">
                        {playlistMessage}
                      </p>
                    )}

                    <div className="playlist-track-list overflow-y-auto custom-scrollbar space-y-0.5">
                      {selectedCollection.tracks.map((track, idx) => {
                        const trackId = `${selectedCollection.id}-${idx}`;
                        const isCurrent = activeCollectionId === selectedCollection.id && currentSong.id === trackId;
                        const isLoading = loadingTrackId === trackId;
                        return (
                          <button
                            key={trackId}
                            onClick={() => handlePlayCuratedTrack(selectedCollection, idx)}
                            disabled={isLoading}
                            className={`playlist-track-button ${isCurrent ? 'is-current' : ''}`}
                            aria-label={`Play ${track.name}${track.artist ? ` by ${track.artist}` : ''}`}
                          >
                            <span className="w-6 flex-shrink-0 text-right text-[9px] tabular-nums text-white/25">
                              {(idx + 1).toString().padStart(2, '0')}
                            </span>
                            <span className="min-w-0 flex-1 text-left">
                              <span className={`block text-[11px] font-medium truncate ${isCurrent ? 'text-red-300' : 'text-white/80'}`}>
                                {track.name}
                              </span>
                              <span className="block text-[9px] text-white/30 truncate">
                                {track.artist || selectedCollection.label}
                              </span>
                            </span>
                            <span className="w-5 flex flex-shrink-0 justify-center text-white/25">
                              {isLoading ? (
                                <span className="track-loader" aria-label="Loading track" />
                              ) : isCurrent && isPlaying ? (
                                <Equalizer active={true} />
                              ) : (
                                <PlayIcon />
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Player card */}
              <div className={`player-shell ${showSpideySense ? 'sense-on' : ''} ${showThwip ? 'thwip-on' : ''}`}>
                {showSpideySense && (
                  <div className="spidey-sense-toast" aria-live="polite">
                    <strong>SPIDEY SENSE</strong>
                    <em>New banger detected.</em>
                  </div>
                )}
                {showThwip && <div className="thwip-flash" aria-hidden="true" />}
              <div className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-4 w-full max-w-[min(96vw,560px)]">
                <div className="flex items-center gap-3 sm:gap-4">
                  {/* Album art disc */}
                  <div className="flex-shrink-0 relative">
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden disc-spin ${!isPlaying ? 'paused' : ''}`}
                      style={{
                        boxShadow: '0 0 12px rgba(230,57,70,0.2), inset 0 0 8px rgba(0,0,0,0.3)',
                        border: '2px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      {currentSong.image ? (
                        <img src={currentSong.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-red-900 to-blue-900 flex items-center justify-center">
                          <span className="text-lg">🕷️</span>
                        </div>
                      )}
                      {/* Center hole */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-black/80 border border-white/10" />
                    </div>
                  </div>

                  {/* Song info + controls */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="min-w-0 flex-1 mr-2">
                        <p className="text-xs sm:text-sm font-semibold text-white/95 truncate">{currentSong.name}</p>
                        <p className="text-[10px] sm:text-xs text-white/45 truncate">{currentSong.artist}</p>
                      </div>
                      <Equalizer active={isPlaying} />
                    </div>

                    {/* Controls row */}
                    <div className="flex items-center gap-2 sm:gap-3 mb-2">
                      <button onClick={handlePrev} className="btn-hover text-white/60 hover:text-white p-1">
                        <PrevIcon />
                      </button>
                      <button
                        onClick={handlePlayPause}
                        className="btn-hover w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-white"
                        style={{
                          background: 'linear-gradient(135deg, #e63946, #c62828)',
                          boxShadow: '0 2px 12px rgba(230,57,70,0.35)',
                        }}
                      >
                        {isPlaying ? <PauseIcon /> : <PlayIcon />}
                      </button>
                      <button onClick={handleNext} className="btn-hover text-white/60 hover:text-white p-1">
                        <NextIcon />
                      </button>

                      {/* Spacer */}
                      <div className="flex-1" />

                      {/* Search & Playlist buttons */}
                      <button
                        ref={searchButtonRef}
                        onClick={toggleSearch}
                        className={`btn-hover p-1.5 rounded-lg transition-colors ${showSearch ? 'text-red-400 bg-red-500/10' : 'text-white/40 hover:text-white/70'}`}
                      >
                        <SearchIcon />
                      </button>
                      <button
                        ref={playlistButtonRef}
                        onClick={togglePlaylist}
                        className={`btn-hover p-1.5 rounded-lg transition-colors ${showPlaylist ? 'text-red-400 bg-red-500/10' : 'text-white/40 hover:text-white/70'}`}
                      >
                        <ListIcon />
                      </button>
                      <button
                        onClick={() => setShowLyrics(prev => !prev)}
                        aria-label="Toggle Lyrics"
                        title="Toggle Lyrics"
                        className={`btn-hover p-1.5 rounded-lg transition-colors ${showLyrics ? 'text-red-400 bg-red-500/10' : 'text-white/40 hover:text-white/70'}`}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 18V5l12-2v13"/>
                          <circle cx="6" cy="18" r="3"/>
                          <circle cx="18" cy="16" r="3"/>
                        </svg>
                      </button>
                    </div>

                    {/* Progress bar + time */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-white/35 tabular-nums w-8 text-right">{fmt(currentTime)}</span>
                      <input
                        className="progress-slider flex-1"
                        type="range"
                        min="0"
                        max={duration || 0}
                        step="0.1"
                        value={Math.min(currentTime, duration || 0)}
                        onChange={(event) => handleSeek(Number(event.target.value))}
                        style={{ '--progress': `${progress}%` } as React.CSSProperties}
                        aria-label="Song position"
                      />
                      <span className="text-[10px] text-white/35 tabular-nums w-8">{fmt(duration)}</span>
                    </div>
                  </div>
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
