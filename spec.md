# TubeFlow

## Current State
TubeFlow uses Piped API for search (5 instances, filter=videos) and YouTube iframe API (YT.Player) for video playback. The player is a complex ExpandedPlayer with YouTube iframe embed. Search has a retry button but no dedicated error state. Playback works via YT.Player with full video.

## Requested Changes (Diff)

### Add
- `fetchStreamUrl(videoId)` in `lib/invidious.ts` racing all 7 Piped instances at `GET {instance}/streams/{videoId}`, returns `audioStreams[0].url`
- Audio-only playback via HTML `<audio>` element
- Clear error state in SearchPage with "Could not connect. Check your internet or try again." and Retry button
- Stream loading/error states in player with Retry button

### Modify
- `lib/invidious.ts`: Update instances to exactly these 7, change filter=all, add fetchStreamUrl
- `context/AppContext.tsx`: Replace YTPlayer ref with HTMLAudioElement ref; add streamLoading/streamError; on watchVideo fetch stream URL and set audio src
- `App.tsx`: Remove YouTubeManager, add hidden <audio> element
- `components/BottomPlayer.tsx`: Use audio element for progress/play state
- `components/ExpandedPlayer.tsx`: Replace iframe with thumbnail view, wire controls to audio element
- `pages/SearchPage.tsx`: Catch errors, show error+retry UI

### Remove
- YouTube iframe embed, window.YT / YT IFrame API, YouTubeManager, isYTReady

## Implementation Plan
1. Update lib/invidious.ts with new instances, filter=all, fetchStreamUrl
2. Refactor AppContext: audio ref, stream loading/error states, auto-fetch on watchVideo
3. Update App.tsx: remove YouTubeManager, add <audio> element
4. Update BottomPlayer: use audio element
5. Update ExpandedPlayer: thumbnail+audio controls
6. Update SearchPage: error+retry UI
7. Validate
