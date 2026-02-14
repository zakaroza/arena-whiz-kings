

# Footy Arena — Implementation Plan

## Overview
A real-time multiplayer web app where players sign in with a username, create or join rooms, and play 8 different football knowledge party games with any number of players. Built with React + Tailwind frontend and Supabase backend (Postgres database, auth, realtime channels, edge functions).

---

## 1. Landing Page
- Bold "Footy Arena" branding with dark football-themed design
- Two prominent buttons: **Sign In** and **How It Works**
- "How It Works" opens a modal/section explaining the game flow with icons

## 2. Username-Based Auth
- Simple sign-in screen — username only (3–16 chars, letters/numbers/underscore)
- Uses Supabase anonymous auth + a `profiles` table to store usernames
- JWT session persists across refresh
- Duplicate username check with clear error messaging
- After login → redirect to Dashboard

## 3. Dashboard
- Welcome message with username
- Two main action cards: **Create Room** and **Join Room**
- **Create Room** flow:
  - Auto-generates a short room code (e.g. ABC123)
  - Host picks a game mode from all 8 options
  - Configurable settings: max players (up to 100), rounds, time per question, difficulty mix, room visibility (public/private)
  - Creates room in database → navigates to Room Lobby
- **Join Room** flow:
  - Input room code field
  - Validation: room exists, not full, not locked
  - Rejoin support if disconnected within 2 minutes

## 4. Room Lobby
- Large room code with copy-to-clipboard button
- Shows selected game mode, host name, and settings
- Live player list with avatar initials, join order, and connection status (powered by Supabase Realtime Presence)
- **Host controls**: Start Game (requires 2+ players), Lock Room, Kick Player, Transfer Host
- Leave Room button for all players
- Optional chat panel using Supabase Realtime Broadcast

## 5. Game Engine (Core)
- Centralized game state managed via Supabase Realtime channels (broadcast + presence)
- Server-side answer validation via Supabase Edge Functions (prevents cheating — answers only accepted within time window)
- Each round: question display → timer → collect answers → reveal correct answer + explanation → show leaderboard (3 seconds) → next round
- Scoring: correct = points, speed bonus for fastest, no negative points (unless penalty mode enabled by host)
- Final screen: leaderboard, winner, MVP (fastest correct count), action buttons (Play Again, Change Game, Back to Dashboard)

## 6. All 8 Game Modes

### A. Penalty Shootout Quiz
- Multiple choice question shown to all players simultaneously
- Correct = 1 goal, speed bonus +0.5 for top 3 fastest
- Visual "goal scored" animation per round

### B. Quickfire Duel
- Free-text answer, first correct gets 2 points, others get 1
- Real-time "buzz-in" feel

### C. Who Am I (Party Mode)
- Random player becomes clue giver, sees a secret footballer card
- Others ask yes/no questions in chat (45 seconds)
- Everyone submits a guess — correct = 2 pts, clue giver gets 1 pt if anyone guesses right
- Rotates each round

### D. Career Path Challenge
- Club path clues revealed gradually to all players
- Anyone can buzz in to guess — wrong guess = 10 second lockout
- First correct = 3 pts, second within 5 sec = 1 pt

### E. Last Man Standing
- Category-based, turn-based answers in lobby order
- 10 seconds per turn, duplicates invalid, timeout/invalid = elimination
- Last player standing gets 3 pts per round
- Optional classic elimination mode (whole match)

### F. Higher or Lower
- Compare two player/team stats
- Everyone picks higher or lower
- Correct = 1 pt, top 3 fastest get +0.5 bonus

### G. You Are The Ref
- Scenario with 4 options
- Everyone picks, correct = 1 pt
- Short explanation of the football law/decision shown after

### H. Football Word Game (Party Mode)
- Random player becomes solver, guesses footballer name in 5 tries (Wordle-style)
- Others watch live progress
- Solver succeeds = 3 pts; if solver fails, room gets one collective guess (1 pt each correct)
- Rotates solver each round

## 7. Question Bank
- Seeded as structured JSON data, inserted into Supabase database tables
- 80+ questions across all 8 game modes
- Each question tagged with difficulty (easy/medium/hard) and category
- Host can choose difficulty mix before starting

## 8. Admin Panel
- Hidden route `/admin`, accessible only when username is "admin"
- CRUD interface for questions: add, edit, delete across all game modes
- Changes persist in database, reflected immediately

## 9. Match History
- Match results saved to database: room code, game type, player list, scores, timestamp, duration, settings
- Viewable from Dashboard (past matches section)

## 10. Database Schema (Supabase)
- `profiles` — username, avatar color, created_at
- `rooms` — room_code, host_id, game_type, settings, status, visibility
- `room_players` — room_id, player_id, join_order, status, score
- `questions` — game_type, content (JSON), difficulty, category
- `matches` — room_code, game_type, players_scores (JSON), timestamp, duration, settings

## 11. Real-Time Architecture
- **Supabase Realtime Presence** for player connection status in rooms
- **Supabase Realtime Broadcast** for game state sync (questions, answers, timer, leaderboard updates, chat)
- **Edge Functions** for server-side answer validation, scoring, and anti-cheat timing checks

## 12. UI/UX Design
- Dark theme with football/stadium-inspired color palette (deep greens, blacks, gold accents)
- Mobile-first responsive design
- Large tappable buttons, card-based layouts
- Clear leaderboard with player rankings and point animations
- Loading states, error toasts, and smooth transitions between game phases
- Room code displayed prominently with easy copy functionality

## 13. Security & Validation
- Server-side input validation via Edge Functions
- Rate limiting on room creation, joining, and answer submissions
- Answers only accepted within server-tracked time windows
- Minimum player check before game start
- Graceful disconnect/rejoin handling
- RLS policies on all database tables

