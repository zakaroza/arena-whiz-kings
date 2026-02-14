import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { Trophy, Users, Zap, GamepadIcon } from "lucide-react";

const Index = () => {
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const navigate = useNavigate();
  const { user, username } = useAuth();

  const handleSignIn = () => {
    if (user && username) {
      navigate("/dashboard");
    } else {
      navigate("/signin");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      {/* Decorative elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <main className="relative z-10 flex flex-col items-center text-center">
        <div className="mb-2 text-6xl">⚽</div>
        <h1 className="font-display text-6xl font-bold uppercase tracking-tight text-foreground sm:text-8xl">
          Footy <span className="text-primary">Arena</span>
        </h1>
        <p className="mt-4 max-w-md text-lg text-muted-foreground">
          The ultimate football knowledge party game. Challenge your mates in real-time!
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Button
            size="lg"
            className="min-w-[200px] animate-pulse-glow text-lg font-semibold"
            onClick={handleSignIn}
          >
            {user && username ? "Go to Dashboard" : "Sign In"}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="min-w-[200px] text-lg font-semibold"
            onClick={() => setShowHowItWorks(true)}
          >
            How It Works
          </Button>
        </div>
      </main>

      <Dialog open={showHowItWorks} onOpenChange={setShowHowItWorks}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl uppercase">How It Works</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            {[
              { icon: <Users className="h-8 w-8 text-primary" />, title: "Pick a Username", desc: "Sign in with just a username — no password needed." },
              { icon: <GamepadIcon className="h-8 w-8 text-primary" />, title: "Create or Join a Room", desc: "Host a room and pick a game, or join with a room code." },
              { icon: <Zap className="h-8 w-8 text-accent" />, title: "Play 8 Game Modes", desc: "Penalty Quiz, Quickfire Duel, Who Am I, and more!" },
              { icon: <Trophy className="h-8 w-8 text-accent" />, title: "Climb the Leaderboard", desc: "Score points, earn speed bonuses, and crown the winner." },
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  {step.icon}
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
