import { useEffect, useMemo, useState } from "react";
import { Search, Inbox, Loader2, Check, X, Eye, EyeOff, Trash2, CalendarX } from "lucide-react";
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

type Tab = "new" | "approved" | "rejected" | "eod";

const StaffDashboard = () => {
  const [tab, setTab] = useState<Tab>("new");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<ApiSubmission | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [clearDownOpen, setClearDownOpen] = useState(false);
  const [clearDownConfirm, setClearDownConfirm] = useState("");
  const qc = useQueryClient();

  const user = api.getCurrentUser();
  const staffName = user?.username || "staff";

  useEffect(() => {
    document.title = "Staff Dashboard · BT Enterprise Day News";
  }, []);

  const queries = useQueries({
    queries: (["new", "approved", "rejected"] as Tab[]).map((kind) => ({
      queryKey: ["submissions", kind] as const,
      queryFn: async () => {
        return api.list(kind, staffName);
      },
      refetchInterval: 15_000,
    })),
  });
  const [newQ, approvedQ, rejectedQ] = queries;

  const counts = {
    new: newQ.data?.length ?? 0,
    approved: approvedQ.data?.length ?? 0,
    rejected: rejectedQ.data?.length ?? 0,
    eod: 0,
  };

  const activeQuery = tab === "new" ? newQ : tab === "approved" ? approvedQ : tab === "rejected" ? rejectedQ : { data: [], isLoading: false, isError: false };

  const filtered = useMemo(() => {
    const list = (activeQuery as any).data ?? [];
    return list.filter((s: ApiSubmission) =>
      s.uploadedBy.toLowerCase().includes(query.toLowerCase())
    );
  }, [activeQuery, query]);

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["submissions"] });
  };

  const refreshProjector = () => {
    qc.refetchQueries({ queryKey: ["projector-images"] });
  };

  const [draggedId, setDraggedId] = useState<number | null>(null);

  const handleDragStart = (id: number) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (dropId: number) => {
    if (draggedId === null || draggedId === dropId) return;
    const items = [...(approvedQ.data ?? [])];
    const draggedIdx = items.findIndex(i => i.id === draggedId);
    const dropIdx = items.findIndex(i => i.id === dropId);
    
    if (draggedIdx === -1 || dropIdx === -1) return;

    const [draggedItem] = items.splice(draggedIdx, 1);
    items.splice(dropIdx, 0, draggedItem);
    reorder.mutate(items.map(i => i.id));
    setDraggedId(null);
  };

  const approve = useMutation({
    mutationFn: async (id: number) => {
      return api.approve(id, staffName);
    },
    onSuccess: () => {
      toast({ title: "Approved", description: "Submission moved to Approved." });
      refreshAll();
      refreshProjector();
    },
    onError: (e: Error) =>
      toast({ title: "Approve failed", description: e.message, variant: "destructive" }),
  });

  const reject = useMutation({
    mutationFn: async (id: number) => {
      return api.reject(id, staffName);
    },
    onSuccess: () => {
      toast({ title: "Rejected", description: "Submission moved to Rejected." });
      refreshAll();
      refreshProjector();
    },
    onError: (e: Error) =>
      toast({ title: "Reject failed", description: e.message, variant: "destructive" }),
  });

  const toggleDisplay = useMutation({
    mutationFn: async ({ id, display }: { id: number; display: boolean }) => {
      return api.toggleDisplay(id, display, staffName);
    },
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

  const reorder = useMutation({
    mutationFn: async (ids: number[]) => {
      return api.updateDisplayOrder(ids, staffName);
    },
    onSuccess: () => {
      toast({ title: "Order updated", description: "Projector display order changed." });
      refreshAll();
      refreshProjector();
    },
    onError: (e: Error) =>
      toast({ title: "Reorder failed", description: e.message, variant: "destructive" }),
  });

  const deleteSub = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(id, staffName);
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: "Submission permanently deleted." });
      refreshAll();
      refreshProjector();
      setDeleteId(null);
    },
    onError: (e: Error) =>
      toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  const clearDown = useMutation({
    mutationFn: async () => {
      return api.deleteAll(staffName);
    },
    onSuccess: () => {
      toast({ title: "Cleared", description: "All submissions and files have been cleared." });
      refreshAll();
      refreshProjector();
      setClearDownOpen(false);
      setClearDownConfirm("");
    },
    onError: (e: Error) =>
      toast({ title: "Clear down failed", description: e.message, variant: "destructive" }),
  });

  const busy = approve.isPending || reject.isPending || toggleDisplay.isPending || reorder.isPending || deleteSub.isPending || clearDown.isPending;

  // Helper to reorder approved images
  const moveApprovedImage = (id: number, direction: "up" | "down") => {
    const approved = approvedQ.data ?? [];
    const index = approved.findIndex(i => i.id === id);
    if (index === -1) return;

    if (direction === "up" && index > 0) {
      const newOrder = [...approved];
      [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
      reorder.mutate(newOrder.map(i => i.id));
    } else if (direction === "down" && index < approved.length - 1) {
      const newOrder = [...approved];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      reorder.mutate(newOrder.map(i => i.id));
    }
  };

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
            {(["new", "approved", "rejected", "eod"] as Tab[]).map((k) => (
              <TabsTrigger
                key={k}
                value={k}
                className="gap-2 rounded-full px-4 capitalize data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                {k === "eod" ? "End of Day" : k}
                {k !== "eod" && (
                  <Badge
                    variant="secondary"
                    className="h-5 min-w-[1.25rem] justify-center rounded-full bg-foreground/10 px-1.5 text-[10px] font-semibold"
                  >
                    {counts[k]}
                  </Badge>
                )}
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
                  {filtered.map((s: ApiSubmission, idx: number) => (
                    <SubmissionCard
                      key={s.id}
                      submission={s}
                      busy={busy}
                      onApprove={(id) => approve.mutate(id)}
                      onReject={(id) => reject.mutate(id)}
                      onDelete={(id) => setDeleteId(id)}
                      onToggleDisplay={(id, display) => toggleDisplay.mutate({ id, display })}
                      onMoveUp={tab === "approved" ? () => moveApprovedImage(s.id, "up") : undefined}
                      onMoveDown={tab === "approved" ? () => moveApprovedImage(s.id, "down") : undefined}
                      canMoveUp={tab === "approved" && (approvedQ.data?.findIndex(i => i.id === s.id) ?? -1) > 0}
                      canMoveDown={tab === "approved" && (approvedQ.data?.findIndex(i => i.id === s.id) ?? -1) < (approvedQ.data?.length ?? 0) - 1}
                      onDragStart={tab === "approved" ? () => handleDragStart(s.id) : undefined}
                      onDragOver={tab === "approved" ? handleDragOver : undefined}
                      onDrop={tab === "approved" ? () => handleDrop(s.id) : undefined}
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

          <TabsContent value="eod" className="mt-6">
            <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-20 text-center">
              <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
                <CalendarX className="h-6 w-6" />
              </div>
              <p className="font-display text-lg font-semibold text-destructive">Clear All Submissions</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                This will permanently delete ALL database records and ALL physical images from the storage.
                This action is irreversible.
              </p>
              <Button
                variant="destructive"
                className="mt-6"
                onClick={() => setClearDownOpen(true)}
              >
                Clear Down
              </Button>
            </div>
          </TabsContent>
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
                     <Button
                       disabled={busy}
                       variant="outline"
                       className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                       onClick={() => {
                         setDeleteId(active.id);
                         setActive(null);
                       }}
                     >
                       <Trash2 className="mr-2 h-4 w-4" /> Delete
                     </Button>
                   </div>
                 )}
               </DialogHeader>
             </>
           )}
         </DialogContent>
       </Dialog>

       <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Are you sure?</DialogTitle>
             <DialogDescription>
               This will permanently delete the database record and the physical image. This action cannot be undone.
             </DialogDescription>
           </DialogHeader>
           <div className="flex justify-end gap-3 mt-4">
             <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
             <Button
                variant="destructive"
                disabled={busy}
                onClick={() => deleteId && deleteSub.mutate(deleteId)}
             >
               {deleteSub.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
               Yes, Delete Permanently
             </Button>
           </div>
         </DialogContent>
       </Dialog>

       <Dialog open={clearDownOpen} onOpenChange={(o) => !o && setClearDownOpen(false)}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle className="text-destructive">Are you absolutely sure?</DialogTitle>
             <DialogDescription>
               This will wipe ALL submissions and images from the entire system.
               To confirm, please type <span className="font-bold text-foreground">clear down</span> below.
             </DialogDescription>
           </DialogHeader>
           <div className="space-y-4 mt-4">
             <Input
               value={clearDownConfirm}
               onChange={(e) => setClearDownConfirm(e.target.value)}
               placeholder="Type 'clear down' to confirm"
               className="border-destructive/30 focus-visible:ring-destructive"
             />
             <div className="flex justify-end gap-3">
               <Button variant="outline" onClick={() => setClearDownOpen(false)}>Cancel</Button>
               <Button
                  variant="destructive"
                  disabled={busy || clearDownConfirm !== "clear down"}
                  onClick={() => clearDown.mutate()}
               >
                 {clearDown.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 Confirm Clear Down
               </Button>
             </div>
           </div>
         </DialogContent>
       </Dialog>
    </div>
  );
};

export default StaffDashboard;
