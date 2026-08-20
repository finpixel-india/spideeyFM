# POPFM Lyrics Feature — Full Replication Prompt

Use this prompt to implement the exact same lyrics feature in another React + Vite + TypeScript project.

---

## PROMPT (Copy and paste this)

> I have a React + Vite + TypeScript music player web app. I want you to add a **synced, floating, draggable lyrics feature** exactly like the following specification. Please implement all of it carefully.
>
> ---
>
> ### 1. Install Dependencies
>
> Install these two npm packages:
> - `react-draggable` — for making the lyrics block draggable anywhere on screen
> - `any-ascii` — for converting non-English text (Hindi, Japanese, Cyrillic, etc.) into readable English characters (transliteration, NOT translation)
>
> ```bash
> npm install react-draggable any-ascii
> ```
>
> Also add TypeScript types if needed:
> ```bash
> npm install -D @types/react-draggable
> ```
>
> ---
>
> ### 2. Imports
>
> At the top of `App.tsx`, add:
> ```tsx
> import Draggable from 'react-draggable';
> import anyAscii from 'any-ascii';
> ```
> Also make sure `useMemo` is imported from React (add it to the existing React import line).
>
> ---
>
> ### 3. LRC Parser Utility
>
> Add this utility function near the top of the file (outside the component):
>
> ```ts
> function parseLrc(lrc: string): { time: number; text: string }[] {
>   return lrc
>     .split('\n')
>     .map(line => {
>       const match = line.match(/^\[(\d+):(\d+\.\d+)\](.*)/);
>       if (!match) return null;
>       const time = parseInt(match[1]) * 60 + parseFloat(match[2]);
>       const text = match[3].trim();
>       return text ? { time, text } : null;
>     })
>     .filter(Boolean) as { time: number; text: string }[];
> }
> ```
>
> ---
>
> ### 4. State Variables
>
> Inside the main App component, add these state variables:
>
> ```tsx
> const [showLyrics, setShowLyrics] = useState(false);
> const [lyrics, setLyrics] = useState<{ time: number; text: string }[] | null>(null);
> const [lyricsLoading, setLyricsLoading] = useState(false);
> const [lyricsError, setLyricsError] = useState('');
> ```
>
> ---
>
> ### 5. Active Line Index (sync logic)
>
> Add this `useMemo` to compute which lyric line is currently active based on `currentTime`:
>
> ```tsx
> const activeLineIndex = useMemo(() => {
>   if (!lyrics || lyrics.length === 0) return 0;
>   let idx = 0;
>   for (let i = 0; i < lyrics.length; i++) {
>     if (currentTime >= lyrics[i].time) idx = i;
>     else break;
>   }
>   return idx;
> }, [lyrics, currentTime]);
> ```
>
> (`currentTime` should be the current playback position in seconds from the audio element.)
>
> ---
>
> ### 6. Lyrics Fetcher — Waterfall Strategy
>
> Add this `useEffect` that implements a **2-stage waterfall fetch**:
> - **Stage 1:** Exact match from `lrclib.net`
> - **Stage 2:** Fuzzy search fallback from `lrclib.net` (finds songs even with slightly different titles like "Morni Banke (From Badhaai Ho)")
>
> ```tsx
> useEffect(() => {
>   if (!showLyrics || !currentSong) return;
>   let active = true;
>   setLyricsLoading(true);
>   setLyricsError('');
>   setLyrics(null);
>
>   const fetchLyrics = async () => {
>     try {
>       // Stage 1: Exact match
>       const exactRes = await fetch(
>         `https://lrclib.net/api/get?track_name=${encodeURIComponent(currentSong.name)}&artist_name=${encodeURIComponent(currentSong.artist)}`
>       );
>       if (exactRes.ok) {
>         const data = await exactRes.json();
>         if (data?.syncedLyrics) {
>           if (active) { setLyrics(parseLrc(data.syncedLyrics)); setLyricsError(''); setLyricsLoading(false); }
>           return;
>         }
>       }
>
>       // Stage 2: Fuzzy search fallback
>       const searchRes = await fetch(
>         `https://lrclib.net/api/search?q=${encodeURIComponent(currentSong.name + ' ' + currentSong.artist)}`
>       );
>       if (searchRes.ok) {
>         const searchData = await searchRes.json();
>         if (Array.isArray(searchData)) {
>           const syncedResult = searchData.find((item: any) => item.syncedLyrics);
>           if (syncedResult) {
>             if (active) { setLyrics(parseLrc(syncedResult.syncedLyrics)); setLyricsError(''); setLyricsLoading(false); }
>             return;
>           }
>         }
>       }
>
>       // Stage 3: Nothing found
>       if (active) {
>         setLyrics(null);
>         setLyricsError('No synced lyrics available.');
>         setLyricsLoading(false);
>       }
>     } catch {
>       if (active) {
>         setLyrics(null);
>         setLyricsError('Failed to fetch lyrics.');
>         setLyricsLoading(false);
>       }
>     }
>   };
>
>   fetchLyrics();
>   return () => { active = false; };
> }, [showLyrics, currentSong]);
> ```
>
> ---
>
> ### 7. The Lyrics UI — Floating, Draggable, 3-Line Format
>
> Place this **inside the main full-screen container** (NOT inside the player controls div). Default position is bottom-left, above the player controls.
>
> **Key design rules:**
> - No box, no background, no glass card — lyrics float freely over the video background
> - 3 lines only: previous (faded), current (bright + glowing), next (faded)
> - Lines roll upward smoothly with a cubic-bezier animation
> - Middle line is bold, large, white with a glow text-shadow (Instagram stories style)
> - Text is center-aligned
> - Any non-English script is automatically transliterated to English characters using `anyAscii()`
> - The entire block is draggable anywhere on screen using `react-draggable`
>
> ```tsx
> {showLyrics && (
>   <Draggable handle=".lyrics-drag-handle">
>     <div
>       className="absolute z-[100] left-4 bottom-32 flex flex-col items-center justify-center pointer-events-auto"
>       style={{ width: 'min(90vw, 500px)', cursor: 'grab' }}
>     >
>       {/* Invisible drag handle — covers entire block */}
>       <div className="lyrics-drag-handle w-full absolute inset-0 z-10" />
>
>       {lyricsLoading ? (
>         <p className="text-white/50 text-sm text-center px-4 relative z-20 pointer-events-none">
>           Loading lyrics...
>         </p>
>       ) : lyricsError ? (
>         <p className="text-white/50 text-sm text-center px-4 relative z-20 pointer-events-none">
>           {lyricsError}
>         </p>
>       ) : lyrics ? (
>         <div
>           className="relative w-full h-[150px] overflow-hidden flex flex-col items-center pointer-events-none drop-shadow-md"
>         >
>           {lyrics.map((line, i) => {
>             const offset = i - activeLineIndex;
>             if (offset < -2 || offset > 2) return null;
>             const isCenter = offset === 0;
>             return (
>               <p
>                 key={i}
>                 className="absolute w-full text-center font-medium px-4"
>                 style={{
>                   height: '40px',
>                   top: '55px',
>                   transition: 'all 700ms cubic-bezier(0.2, 0.8, 0.2, 1)',
>                   transform: `translateY(${offset * 40}px) scale(${isCenter ? 1 : 0.95})`,
>                   transformOrigin: 'center center',
>                   opacity: isCenter ? 1 : (Math.abs(offset) === 1 ? 0.4 : 0),
>                   fontWeight: isCenter ? 800 : 500,
>                   fontSize: isCenter ? '1.25rem' : '1rem',
>                   color: 'white',
>                   textShadow: isCenter
>                     ? '0 0 15px rgba(255,255,255,0.5), 0 2px 8px rgba(0,0,0,0.8)'
>                     : '0 1px 4px rgba(0,0,0,0.8)',
>                 }}
>               >
>                 {anyAscii(line.text)}
>               </p>
>             );
>           })}
>         </div>
>       ) : null}
>     </div>
>   </Draggable>
> )}
> ```
>
> ---
>
> ### 8. Toggle Button
>
> Add a toggle button in your player controls. Use a **music note SVG icon** (NOT a chat bubble):
>
> ```tsx
> <button
>   onClick={() => setShowLyrics(prev => !prev)}
>   aria-label="Toggle Lyrics"
>   title="Toggle Lyrics"
>   style={{ opacity: showLyrics ? 1 : 0.5 }}
> >
>   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
>     <path d="M9 18V5l12-2v13"/>
>     <circle cx="6" cy="18" r="3"/>
>     <circle cx="18" cy="16" r="3"/>
>   </svg>
> </button>
> ```
>
> ---
>
> ### Summary of What This Feature Does
> - Tapping the music note button shows/hides synced lyrics
> - Lyrics appear floating over the background (no box)
> - Only 3 lines visible at a time — scroll smoothly as the song plays
> - The current line is bold, bright, and glowing (Instagram style)
> - The user can click and drag the lyrics anywhere on screen
> - All non-English text (Hindi, etc.) is shown in English characters automatically
> - If exact match fails, it falls back to a fuzzy search before giving up
