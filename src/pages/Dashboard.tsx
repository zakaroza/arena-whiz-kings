import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { GAME_TYPES } from "@/lib/game-types";
import { toast } from "sonner";
import { Plus, LogIn, LogOut, Loader2 } from "lucide-react";

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

const Dashboard = () => {
  const { user, username, signOut } = useAuth();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  // Create room state
  const [gameType, setGameType] = useState<string>(GAME_TYPES[0].id);
  const [maxPlayers, setMaxPlayers] = useState("20");
  const [rounds, setRounds] = useState("5");
  const [timePerQuestion, setTimePerQuestion] = useState("15");
  const [visibility, setVisibility] = useState<"private" | "public">("private");

  if (!user || !username) {
    navigate("/signin", { replace: true });
    return null;
  }

  const handleCreateRoom = async () => {
    setCreating(true);
    const roomCode = generateRoomCode();

    const { data: room, error } = await supabase
      .from("rooms")
      .insert({
        room_code: roomCode,
        host_id: user.id,
        game_type: gameType,
        settings: {
          max_players: parseInt(maxPlayers),
          rounds: parseInt(rounds),
          time_per_question: parseInt(timePerQuestion),
        },
        visibility,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create room");
      setCreating(false);
      return;
    }

    // Add host as first player
    await supabase.from("room_players").insert({
      room_id: room.id,
      player_id: user.id,
      join_order: 1,
    });

    setCreating(false);
    navigate(`/room/${room.room_code}`);
  };

  const handleJoinRoom = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;

    console.log("🔍 Attempting to join room:", code);
    setJoining(true);

    try {
      // Step 1: Try to find the room
      console.log("📡 Querying room with code:", code);
      const { data: room, error: roomError } = await supabase
        .from("rooms")
        .select("*")
        .eq("room_code", code)
        .single();

      console.log("📊 Room query result:", { room, roomError });

      if (roomError) {
        console.error("❌ Room query error:", roomError);
        toast.error(`Database error: ${roomError.message}`);
        setJoining(false);
        return;
      }

      if (!room) {
        console.warn("⚠️ Room not found for code:", code);
        toast.error("Room not found");
        setJoining(false);
        return;
      }

      console.log("✅ Room found:", room);

      // Step 2: Check if room is locked
      if (room.is_locked) {
        console.warn("🔒 Room is locked");
        toast.error("Room is locked");
        setJoining(false);
        return;
      }

      // Step 3: Check player count
      console.log("👥 Checking player count for room:", room.id);
      const { count, error: countError } = await supabase
        .from("room_players")
        .select("*", { count: "exact", head: true })
        .eq("room_id", room.id);

      if (countError) {
        console.error("❌ Count query error:", countError);
        toast.error(`Failed to check player count: ${countError.message}`);
        setJoining(false);
        return;
      }

      console.log("📊 Current player count:", count);

      const maxP = (room.settings as any)?.max_players ?? 20;
      if ((count ?? 0) >= maxP) {
        console.warn("⚠️ Room is full:", { current: count, max: maxP });
        toast.error("Room is full");
        setJoining(false);
        return;
      }

      // Step 4: Join or rejoin
      console.log("➕ Attempting to add player to room...");
      const { error: joinError } = await supabase.from("room_players").upsert(
        {
          room_id: room.id,
          player_id: user.id,
          join_order: (count ?? 0) + 1,
          status: "connected",
        },
        { onConflict: "room_id,player_id" }
      );

      if (joinError) {
        console.error("❌ Join error:", joinError);
        toast.error(`Failed to join room: ${joinError.message}`);
        setJoining(false);
        return;
      }

      console.log("✅ Successfully joined room! Navigating...");
      toast.success("Joined room successfully!");
      setJoining(false);
      navigate(`/room/${code}`);
    } catch (err) {
      console.error("💥 Unexpected error in handleJoinRoom:", err);
      toast.error(`Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setJoining(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <h1 className="font-display text-2xl font-bold uppercase text-primary">Footy Arena</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            Playing as <span className="font-semibold text-foreground">{username}</span>
          </span>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="mr-1 h-4 w-4" /> Sign Out
          </Button>
        </div>
      </header>

      {/* Main */}
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-12">
        <h2 className="font-display text-4xl font-bold uppercase">
          Welcome, <span className="text-primary">{username}</span>
        </h2>

        <div className="mt-6 grid w-full max-w-2xl gap-6 sm:grid-cols-2">
          {/* Create Room */}
          <Card className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10" onClick={() => setShowCreate(true)}>
            <CardHeader className="text-center">
              <Plus className="mx-auto mb-2 h-12 w-12 text-primary" />
              <CardTitle className="font-display text-xl uppercase">Create Room</CardTitle>
              <CardDescription>Host a new game for your mates</CardDescription>
            </CardHeader>
          </Card>

          {/* Join Room */}
          <Card className="transition-all hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10">
            <CardHeader className="text-center">
              <LogIn className="mx-auto mb-2 h-12 w-12 text-accent" />
              <CardTitle className="font-display text-xl uppercase">Join Room</CardTitle>
              <CardDescription>Enter a room code to join</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Room code..."
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="text-center text-lg font-mono uppercase"
                />
                <Button onClick={handleJoinRoom} disabled={joining || !joinCode.trim()}>
                  {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Create Room Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl uppercase">Create Room</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Game Mode</Label>
              <Select value={gameType} onValueChange={(v) => setGameType(v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GAME_TYPES.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.icon} {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Max Players</Label>
                <Input type="number" min={2} max={100} value={maxPlayers} onChange={(e) => setMaxPlayers(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Rounds</Label>
                <Input type="number" min={1} max={20} value={rounds} onChange={(e) => setRounds(e.target.value)} className="mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Time per Question (s)</Label>
                <Input type="number" min={5} max={60} value={timePerQuestion} onChange={(e) => setTimePerQuestion(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Visibility</Label>
                <Select value={visibility} onValueChange={(v) => setVisibility(v as "private" | "public")}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button className="w-full text-lg font-semibold" size="lg" onClick={handleCreateRoom} disabled={creating}>
              {creating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              Create Room
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
