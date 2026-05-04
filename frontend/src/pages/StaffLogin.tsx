import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { BrandNav } from "@/components/BrandNav";

const StaffLogin = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setIsLoading(true);
    try {
      await api.login(username.trim(), "STAFF", password.trim());
      toast({
        title: "Staff Access Granted",
        description: `Welcome, ${username.trim()}`,
      });
      navigate("/staff");
    } catch (err: any) {
      toast({
        title: "Access Denied",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />

      <div className="relative z-10">
        <BrandNav variant="light" />

        <main className="mx-auto max-w-xl px-4 pt-24 pb-24 sm:px-6 sm:pt-32">
          <div className="fade-in">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Enterprise Day · Staff Dashboard
            </div>

            <h1 className="font-display text-5xl font-extrabold tracking-tight sm:text-7xl">
              Staff <br />
              <span className="text-primary">Console.</span>
            </h1>
            <p className="mt-4 max-w-md text-base text-muted-foreground sm:text-lg">
              Authorized access only. Identify yourself to manage the live news feed and moderate student content.
            </p>

            <form onSubmit={handleLogin} className="mt-10 space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="staff-id"
                  className="text-sm font-medium uppercase tracking-wider text-muted-foreground"
                >
                  Staff Username
                </label>
                <input
                  id="staff-id"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. staff1"
                  autoFocus
                  className="h-14 w-full rounded-xl border border-input bg-background px-4 text-lg outline-none ring-offset-background transition focus:ring-2 focus:ring-primary focus:ring-offset-2"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="staff-password"
                  className="text-sm font-medium uppercase tracking-wider text-muted-foreground"
                >
                  Password
                </label>
                <input
                  id="staff-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-14 w-full rounded-xl border border-input bg-background px-4 text-lg outline-none ring-offset-background transition focus:ring-2 focus:ring-primary focus:ring-offset-2"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading || !username.trim() || !password.trim()}
                className="h-14 w-full rounded-xl text-lg font-bold"
              >
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    Sign In <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default StaffLogin;
