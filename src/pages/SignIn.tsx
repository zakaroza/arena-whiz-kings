import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,16}$/;

const SignIn = () => {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn, user, username: existingUsername } = useAuth();

  // If already signed in, redirect
  if (user && existingUsername) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();

    if (!USERNAME_REGEX.test(trimmed)) {
      toast.error("Username must be 3–16 characters: letters, numbers, or underscore.");
      return;
    }

    setLoading(true);
    const { error } = await signIn(trimmed);
    setLoading(false);

    if (error) {
      toast.error(error);
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 text-4xl">⚽</div>
          <CardTitle className="font-display text-3xl uppercase">Sign In</CardTitle>
          <CardDescription>Pick a username to join the arena</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                placeholder="Enter username..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={16}
                autoFocus
                className="h-12 text-center text-lg"
              />
              <p className="mt-2 text-center text-xs text-muted-foreground">
                3–16 characters • Letters, numbers, underscore
              </p>
            </div>
            <Button
              type="submit"
              className="w-full text-lg font-semibold"
              size="lg"
              disabled={loading || !username.trim()}
            >
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              Enter Arena
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignIn;
