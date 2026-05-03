import { useEffect, useMemo, useState } from "react";
import { Search, Inbox, Loader2, Check, X, Eye, EyeOff } from "lucide-react";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { BrandNav } from "@/components/BrandNav";
import { SubmissionCard } from "@/components/SubmissionCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { api, formatRelative, type ApiSubmission } from "@/lib/api";

type Tab = "new" | "approved" | "rejected";

const StaffDashboard = () => {
  const [tab, setTab] = useState<Tab>("new");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<ApiSubmission | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    document.title = "Staff Dashboard · Enterprise Day News";
  }, []);

  const queries = useQueries({
    queries: (["new", "approved", "rejected"] as Tab[]).map((kind) => ({
      queryKey: ["submissions", kind] as const,
      queryFn: () => api.list(kind),
      refetchInterval: 15_000,
    })),
  });
  const [newQ, approvedQ, rejectedQ] = queries;

  const counts = {
    new: newQ.data?.length ?? 0,
    approved: approvedQ.data?.length ?? 0,
    rejected: rejectedQ.data?.length ?? 0,
  };

  const activeQuery = tab === "new" ? newQ : tab === "approved" ? approvedQ : rejectedQ;

  const filtered = useMemo(() => {
    const list = activeQuery.data ?? [];
    return list.filter((s) =>
      s.uploadedBy.toLowerCase().includes(query.toLowerCase())
    );
  }, [activeQuery.data, query]);

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["submissions"] });
  };

  const refreshProjector = () => {
    qc.refetchQueries({ queryKey: ["projector-images"] });
  };

  const approve = useMutation({
    mutationFn: (id: number) => api.approve(id),
    onSuccess: () => {
      toast({ title: "Approved", description: "Submission moved to Approved." });
      refreshAll();
      refreshProjector();
    },
    onError: (e: Error) =>
      toast({ title: "Approve failed", description: e.message, variant: "destructive" }),
  });

  const reject = useMutation({
    mutationFn: (id: number) => api.reject(id),
    onSuccess: () => {
      toast({ title: "Rejected", description: "Submission moved to Rejected." });
      refreshAll();
      refreshProjector();
    },
    onError: (e: Error) =>
      toast({ title: "Reject failed", description: e.message, variant: "destructive" }),
  });

  const toggleDisplay = useMutation({
    mutationFn: ({ id, display }: { id: number; display: boolean }) =>
      api.toggleDisplay(id, display),
    onSuccess: (data) => {
      toast({
        title: data.display ? "Displayed" : "Hidden",
        description: data.display ? "Image will appear on projector." : "Image hidden from projector.",
      });
      refreshAll();
      refreshProjector();
    },
    onError: (e: Error) =>
      toast({ title: "Toggle failed", description: e.message, variant: "destructive" }),
  });

  const busy = approve.isPending || reject.isPending || toggleDisplay.isPending;

  return (
    <div className="min-h-screen bg-background">
      <BrandNav variant="light" />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Moderation
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Staff Dashboard
            </h1>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Review student submissions before they appear on the projector.
            </p>
          </div>

          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by student name…"
              className="h-11 rounded-full border-border/80 bg-card pl-9"
            />
          </div>
        </div>

        {activeQuery.isError && (
          <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Couldn't reach the backend at <code>{import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080"}</code>.
            Check it's running and CORS allows this origin.
          </div>
        )}

        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="mt-8">
          <TabsList className="h-12 rounded-full bg-secondary p-1">
            {(["new", "approved", "rejected"] as Tab[]).map((k) => (
              <TabsTrigger
                key={k}
                value={k}
                className="gap-2 rounded-full px-4 capitalize data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                {k}
                <Badge
                  variant="secondary"
                  className="h-5 min-w-[1.25rem] justify-center rounded-full bg-foreground/10 px-1.5 text-[10px] font-semibold"
                >
                  {counts[k]}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {(["new", "approved", "rejected"] as Tab[]).map((k) => (
            <TabsContent key={k} value={k} className="mt-6">
              {activeQuery.isLoading ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-72 rounded-xl" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-20 text-center">
                  <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-muted-foreground">
                    <Inbox className="h-6 w-6" />
                  </div>
                  <p className="font-display text-lg font-semibold">No {k} submissions</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {k === "new"
                      ? "When students upload, they'll appear here."
                      : `Nothing ${k} yet.`}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filtered.map((s) => (
                    <SubmissionCard
                      key={s.id}
                      submission={s}
                      busy={busy}
                      onApprove={(id) => approve.mutate(id)}
                      onReject={(id) => reject.mutate(id)}
                      onToggleDisplay={(id, display) => toggleDisplay.mutate({ id, display })}
                      onClick={setActive}
                    />
                  ))}
                </div>
              )}

              {busy && (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating…
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </main>

       <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
         <DialogContent className="max-w-2xl overflow-hidden p-0">
           {active && (
             <>
               <img
                 src={api.imageUrl(active.filePath)}
                 alt={`Submission by ${active.uploadedBy}`}
                 className="max-h-[60vh] w-full object-cover"
               />
               <DialogHeader className="space-y-4 p-6">
                 <div>
                   <DialogTitle className="font-display text-2xl">{active.uploadedBy}</DialogTitle>
                   <DialogDescription>
                     {active.originalFileName} · {formatRelative(active.uploadedAt)}
                   </DialogDescription>
                 </div>

                 {active.status === "NEW" && (
                   <div className="flex gap-2">
                     <Button
                       disabled={busy}
                       className="flex-1 bg-success text-success-foreground hover:bg-success/90"
                       onClick={() => {
                         approve.mutate(active.id);
                         setActive(null);
                       }}
                     >
                       <Check className="mr-2 h-4 w-4" /> Approve
                     </Button>
                     <Button
                       disabled={busy}
                       variant="outline"
                       className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                       onClick={() => {
                         reject.mutate(active.id);
                         setActive(null);
                       }}
                     >
                       <X className="mr-2 h-4 w-4" /> Reject
                     </Button>
                   </div>
                 )}

                 {active.status === "APPROVED" && (
                   <div className="space-y-2">
                     <Button
                       disabled={busy}
                       variant={active.display ? "default" : "outline"}
                       className="w-full"
                       onClick={() => {
                         toggleDisplay.mutate({ id: active.id, display: !active.display });
                       }}
                     >
                       {active.display ? (
                         <>
                           <Eye className="mr-2 h-4 w-4" /> Hide from Projector
                         </>
                       ) : (
                         <>
                           <EyeOff className="mr-2 h-4 w-4" /> Display on Projector
                         </>
                       )}
                     </Button>
                     <Button
                       disabled={busy}
                       variant="outline"
                       className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                       onClick={() => {
                         reject.mutate(active.id);
                         setActive(null);
                       }}
                     >
                       <X className="mr-2 h-4 w-4" /> Reject
                     </Button>
                   </div>
                 )}

                 {active.status === "REJECTED" && (
                   <div className="flex gap-2">
                     <Button
                       disabled={busy}
                       className="flex-1 bg-success text-success-foreground hover:bg-success/90"
                       onClick={() => {
                         approve.mutate(active.id);
                         setActive(null);
                       }}
                     >
                       <Check className="mr-2 h-4 w-4" /> Approve
                     </Button>
                   </div>
                 )}
               </DialogHeader>
             </>
           )}
         </DialogContent>
       </Dialog>
    </div>
  );
};

export default StaffDashboard;
