import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { GAME_TYPES } from "@/lib/game-types";
import { toast } from "sonner";
import { Copy, Lock, Unlock, Play, LogOut, Crown, UserMinus, Loader2 } from "lucide-react";

interface RoomData {
  id: string;
  room_code: string;
  host_id: string;
  game_type: string;
  settings: any;
  status: string;
  is_locked: boolean;
}

interface PlayerData {
  id: string;
  player_id: string;
  join_order: number;
  status: string;
  profile?: { username: string; avatar_color: string };
}

const RoomLobby = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { user, username } = useAuth();
  const [room, setRoom] = useState<RoomData | null>(null);
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);

  const isHost = room?.host_id === user?.id;
  const gameInfo = GAME_TYPES.find((g) => g.id === room?.game_type);

  useEffect(() => {
    if (!roomCode || !user) return;

    const fetchRoom = async () => {
      const { data: roomData } = await supabase
        .from("rooms")
        .select("*")
        .eq("room_code", roomCode)
        .single();

      if (!roomData) {
        toast.error("Room not found");
        navigate("/dashboard");
        return;
      }

      setRoom(roomData as RoomData);
      await fetchPlayers(roomData.id);
      setLoading(false);
    };

    fetchRoom();

    // Subscribe to room changes
    const roomChannel = supabase
      .channel(`room-${roomCode}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `room_code=eq.${roomCode}` }, (payload) => {
        if (payload.eventType === "UPDATE") {
          setRoom(payload.new as RoomData);
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "room_players" }, () => {
        if (room?.id) fetchPlayers(room.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [roomCode, user]);

  // Re-fetch players when room id changes
  useEffect(() => {
    if (room?.id) fetchPlayers(room.id);
  }, [room?.id]);

  const fetchPlayers = async (roomId: string) => {
    const { data } = await supabase
      .from("room_players")
      .select("id, player_id, join_order, status")
      .eq("room_id", roomId)
      .order("join_order");

    if (data) {
      // Fetch profiles for all players
      const playerIds = data.map((p) => p.player_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_color")
        .in("id", playerIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);
      setPlayers(
        data.map((p) => ({
          ...p,
          profile: profileMap.get(p.player_id) as { username: string; avatar_color: string } | undefined,
        }))
      );
    }
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode ?? "");
    toast.success("Room code copied!");
  };

  const toggleLock = async () => {
    if (!room) return;
    await supabase.from("rooms").update({ is_locked: !room.is_locked }).eq("id", room.id);
  };

  const kickPlayer = async (playerId: string) => {
    if (!room) return;
    await supabase.from("room_players").delete().eq("room_id", room.id).eq("player_id", playerId);
    toast.success("Player kicked");
  };

  const transferHost = async (playerId: string) => {
    if (!room) return;
    await supabase.from("rooms").update({ host_id: playerId }).eq("id", room.id);
    toast.success("Host transferred");
  };

  const leaveRoom = async () => {
    if (!room || !user) return;
    await supabase.from("room_players").delete().eq("room_id", room.id).eq("player_id", user.id);
    navigate("/dashboard");
  };

  const startGame = async () => {
    if (!room) return;
    if (players.length < 2) {
      toast.error("Need at least 2 players to start");
      return;
    }
    await supabase.from("rooms").update({ status: "playing", is_locked: true }).eq("id", room.id);
    navigate(`/game/${room.room_code}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <h1 className="font-display text-2xl font-bold uppercase text-primary">Room Lobby</h1>
        <Button variant="ghost" size="sm" onClick={leaveRoom}>
          <LogOut className="mr-1 h-4 w-4" /> Leave
        </Button>
      </header>

      <main className="flex flex-1 flex-col items-center gap-8 px-4 py-8">
        {/* Room Code */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Room Code</p>
          <button onClick={copyRoomCode} className="group mt-1 flex items-center gap-2">
            <span className="font-display text-5xl font-bold tracking-widest text-accent">{roomCode}</span>
            <Copy className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-accent" />
          </button>
        </div>

        {/* Game Info */}
        <div className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2">
          <span className="text-xl">{gameInfo?.icon}</span>
          <span className="font-display text-lg font-semibold">{gameInfo?.name}</span>
        </div>

        <div className="grid w-full max-w-3xl gap-6 md:grid-cols-2">
          {/* Players */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-xl uppercase">
                Players ({players.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {players.map((p) => {
                const isPlayerHost = p.player_id === room?.host_id;
                return (
                  <div key={p.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-background"
                        style={{ backgroundColor: p.profile?.avatar_color ?? "#22c55e" }}
                      >
                        {p.profile?.username?.charAt(0).toUpperCase() ?? "?"}
                      </div>
                      <span className="font-medium">
                        {p.profile?.username ?? "Unknown"}
                        {isPlayerHost && <Crown className="ml-1 inline h-4 w-4 text-accent" />}
                      </span>
                    </div>
                    {isHost && !isPlayerHost && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => transferHost(p.player_id)} title="Transfer host">
                          <Crown className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => kickPlayer(p.player_id)} title="Kick player">
                          <UserMinus className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Host Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-xl uppercase">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Players</span>
                  <span>{(room?.settings as any)?.max_players ?? 20}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rounds</span>
                  <span>{(room?.settings as any)?.rounds ?? 5}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time/Question</span>
                  <span>{(room?.settings as any)?.time_per_question ?? 15}s</span>
                </div>
              </div>

              {isHost && (
                <div className="space-y-3 border-t border-border pt-4">
                  <Button className="w-full font-semibold" size="lg" onClick={startGame} disabled={players.length < 2}>
                    <Play className="mr-2 h-5 w-5" /> Start Game
                  </Button>
                  <Button variant="outline" className="w-full" onClick={toggleLock}>
                    {room?.is_locked ? <Unlock className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
                    {room?.is_locked ? "Unlock Room" : "Lock Room"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default RoomLobby;
