import React from "react";
import { Link } from "react-router-dom";
import { GraduationCap, Briefcase, MonitorPlay, Newspaper, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const Landing = () => {
  return (
    <div className="relative min-h-screen bg-slate-950 text-white selection:bg-primary/30">
      {/* Background patterns */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] h-[40%] w-[40%] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] h-[50%] w-[50%] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute -bottom-[10%] left-[20%] h-[40%] w-[40%] rounded-full bg-purple-600/10 blur-[120px]" />
        <div className="grid-bg absolute inset-0 opacity-20" />
      </div>

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center fade-in">
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-foreground shadow-2xl shadow-primary/20">
            <Newspaper className="h-10 w-10 text-white" />
          </div>
          <h1 className="font-display text-6xl font-black tracking-tight sm:text-8xl">
            BT Enterprise <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-primary">Day News</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400 sm:text-xl">
            The beating heart of our school event. Share your stories, manage the feed, and watch it all live on the BT big screen.
          </p>
        </div>

        <div className="mt-24 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <LandingCard
            to="/student/login"
            icon={<GraduationCap className="h-8 w-8" />}
            title="Student Portal"
            description="Snap it, upload it, and get featured on the live stream. Share your event highlights."
            variant="student"
            delay="100ms"
          />
          <LandingCard
            to="/staff/login"
            icon={<Briefcase className="h-8 w-8" />}
            title="Staff Console"
            description="Moderate content, manage the display queue, and keep the news flowing smoothly."
            variant="staff"
            delay="200ms"
          />
          <LandingCard
            to="/projector"
            icon={<MonitorPlay className="h-8 w-8" />}
            title="Live Projector"
            description="The full-screen live feed optimized for projectors and big screens. No login required."
            variant="projector"
            delay="300ms"
          />
        </div>

        <footer className="mt-32 text-center text-slate-500 fade-in" style={{ animationDelay: "400ms" }}>
          <p className="text-sm font-medium uppercase tracking-widest">BT Enterprise Day News System</p>
        </footer>
      </main>
    </div>
  );
};

interface LandingCardProps {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  variant: "student" | "staff" | "projector";
  delay: string;
}

const LandingCard = ({ to, icon, title, description, variant, delay }: LandingCardProps) => {
  const styles = {
    student: "hover:border-neon-2/50 hover:shadow-neon-2/10",
    staff: "hover:border-primary/50 hover:shadow-primary/10",
    projector: "hover:border-blue-500/50 hover:shadow-blue-500/10",
  };

  const iconStyles = {
    student: "bg-neon-2/10 text-neon-2",
    staff: "bg-primary/10 text-primary",
    projector: "bg-blue-500/10 text-blue-500",
  };

  return (
    <Link
      to={to}
      style={{ animationDelay: delay }}
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-white/5 bg-white/5 p-8 transition-all hover:-translate-y-1 hover:bg-white/[0.08] fade-in",
        styles[variant]
      )}
    >
      <div className={cn("mb-6 flex h-16 w-16 items-center justify-center rounded-2xl transition-transform group-hover:scale-110 group-hover:rotate-3", iconStyles[variant])}>
        {icon}
      </div>
      <h3 className="text-2xl font-bold">{title}</h3>
      <p className="mt-3 text-slate-400 leading-relaxed">
        {description}
      </p>
      <div className="mt-8 flex items-center text-sm font-bold uppercase tracking-wider opacity-0 transition-opacity group-hover:opacity-100">
        Enter Room <ArrowRight className="ml-2 h-4 w-4" />
      </div>
    </Link>
  );
};

export default Landing;
