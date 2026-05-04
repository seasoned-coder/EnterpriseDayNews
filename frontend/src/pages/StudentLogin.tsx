import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { BrandNav } from "@/components/BrandNav";

const StudentLogin = () => {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !password.trim()) return;

    setIsLoading(true);
    try {
      await api.login(name.trim(), "STUDENT", password.trim());
      toast({
        title: "Welcome back!",
        description: `Signed in as ${name.trim()}`,
      });
      navigate("/student");
    } catch (err: any) {
      toast({
        title: "Login failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-student-bg text-student-ink">
      <div className="aurora" />
      <div className="grain absolute inset-0" />

      <div className="relative z-10">
        <BrandNav variant="dark" />

        <main className="mx-auto max-w-xl px-4 pt-24 pb-24 sm:px-6 sm:pt-32">
          <div className="fade-in">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-student-border bg-white/[0.04] px-3 py-1 text-xs font-medium text-student-muted backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-neon-2" />
              BT Enterprise Day · Student Portal
            </div>

            <h1 className="font-display text-5xl font-extrabold leading-[0.95] sm:text-7xl">
              Identify <br />
              <span className="text-gradient-neon">yourself.</span>
            </h1>
            <p className="mt-4 max-w-md text-base text-student-muted sm:text-lg">
              Enter your name to start sharing your stories with the whole school.
            </p>

            <form onSubmit={handleLogin} className="mt-10 space-y-4">
              <div className="relative">
                <input
                  id="student-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder=" "
                  autoFocus
                  className="peer h-16 w-full rounded-2xl border border-student-border bg-white/[0.04] px-5 pt-5 text-lg text-student-ink placeholder-transparent outline-none ring-0 transition focus:border-neon-2 focus:bg-white/[0.07] focus:shadow-[0_0_0_4px_hsl(var(--neon-2)/0.15)]"
                />
                <label
                  htmlFor="student-name"
                  className="pointer-events-none absolute left-5 top-2 text-xs font-medium uppercase tracking-wider text-student-muted transition-all peer-placeholder-shown:top-5 peer-placeholder-shown:text-base peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-2 peer-focus:text-xs peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-neon-2"
                >
                  Your Name
                </label>
              </div>

              <div className="relative">
                <input
                  id="student-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=" "
                  className="peer h-16 w-full rounded-2xl border border-student-border bg-white/[0.04] px-5 pt-5 text-lg text-student-ink placeholder-transparent outline-none ring-0 transition focus:border-neon-2 focus:bg-white/[0.07] focus:shadow-[0_0_0_4px_hsl(var(--neon-2)/0.15)]"
                />
                <label
                  htmlFor="student-password"
                  className="pointer-events-none absolute left-5 top-2 text-xs font-medium uppercase tracking-wider text-student-muted transition-all peer-placeholder-shown:top-5 peer-placeholder-shown:text-base peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-2 peer-focus:text-xs peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-neon-2"
                >
                  Event Code
                </label>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !name.trim() || !password.trim()}
                className="h-16 w-full rounded-2xl bg-gradient-neon text-lg font-bold text-student-bg hover:opacity-90 active:scale-[0.98] transition-all"
              >
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    Enter Portal <ArrowRight className="ml-2 h-5 w-5" />
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

export default StudentLogin;
