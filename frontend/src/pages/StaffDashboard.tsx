import { useEffect, useMemo, useState } from "react";
import { Search, Inbox, Loader2, Check, X, Eye, EyeOff, Trash2, MessageSquare, Megaphone, Send, Upload } from "lucide-react";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { BrandNav } from "@/components/BrandNav";
import { RejectDialog } from "@/components/RejectDialog";
import { pollEvery, useLiveRefresh } from "@/lib/liveUpdates";
import { SubmissionCard } from "@/components/SubmissionCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { api, formatRelative, type ApiSubmission } from "@/lib/api";
import { EventResetPanel } from "@/components/EventResetPanel";
import { ProjectorSettingsPanel } from "@/components/ProjectorSettingsPanel";
import { PricesPanel } from "@/components/PricesPanel";
import { ResultsPanel } from "@/components/ResultsPanel";
import { StaffFooter } from "@/components/StaffFooter";
import { STAFF_NAV } from "@/lib/staffNav";

type Tab = "new" | "approved" | "rejected" | "comm" | "projector" | "prices" | "results" | "eod";

const TAB_LABELS: Record<Tab, string> = {
  new: "New",
  approved: "Approved",
  rejected: "Rejected",
  comm: "Event Communications",
  projector: "Projector",
  prices: "Prices",
  results: "Results",
  eod: "End of Day",
};

/** Shown when a moderation tab is empty. */
const EMPTY_STATES: Record<"new" | "approved" | "rejected" | "comm", { title: string; body: string }> = {
  new: { title: "No new submissions", body: "When students upload, they'll appear here." },
  approved: { title: "Nothing approved yet", body: "Approved adverts appear here, in projector order." },
  rejected: { title: "Nothing rejected", body: "Rejected adverts appear here." },
  comm: { title: "No staff messages yet", body: "Upload an information image or send a message above." },
};

const StaffDashboard = () => {
  const moderationTabs: ("new" | "approved" | "rejected" | "comm")[] = ["new", "approved", "rejected", "comm"];
  const [tab, setTab] = useState<Tab>("new");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<ApiSubmission | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [freeText, setFreeText] = useState("");
  // Off by default: a FLASH item takes over the projector immediately, even when hidden.
  const [isFlash, setIsFlash] = useState(false);
  const [infoFile, setInfoFile] = useState<File | null>(null);

  const qc = useQueryClient();

  const user = api.getCurrentUser("STAFF");
  const staffName = user?.username || "staff";

  useEffect(() => {
    document.title = "Advert Dashboard · BT Enterprise Day News";
  }, []);

  // New uploads and colleagues' decisions show up the moment they happen (issue #43); polling is the
  // fallback while the live stream is down.
  const live = useLiveRefresh({
    adverts: [["submissions"], ["projector-images"]],
    prices: [["price-wobble"]],
    "projector-settings": [["projector-settings"]],
  });

  const queries = useQueries({
    queries: moderationTabs.map((kind) => ({
      queryKey: ["submissions", kind] as const,
      queryFn: async () => {
        if (kind === "comm") return api.listInfo(staffName);
        return api.list(kind as "new" | "approved" | "rejected", staffName);
      },
      refetchInterval: pollEvery(live, 15_000),
    })),
  });
  const [newQ, approvedQ, rejectedQ, commQ] = queries;

  const counts = {
    new: newQ.data?.length ?? 0,
    approved: approvedQ.data?.length ?? 0,
    rejected: rejectedQ.data?.length ?? 0,
    comm: commQ.data?.length ?? 0,
    projector: 0,
    prices: 0,
    results: 0,
    eod: 0,
  };

  const activeQuery = tab === "new" ? newQ : tab === "approved" ? approvedQ : tab === "rejected" ? rejectedQ : tab === "comm" ? commQ : { data: [], isLoading: false, isError: false, isPending: false };

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
    onError: (e: Error) => {
      toast({ title: "Approve failed", description: e.message, variant: "destructive" });
      refreshAll(); // usually another member of staff reviewed it first: show where it is now
    },
  });

  // Rejecting first asks why (issue #38); rejectTarget is the advert waiting for that answer.
  const [rejectTarget, setRejectTarget] = useState<ApiSubmission | null>(null);
  const askToReject = (id: number) => {
    const all = [...(newQ.data ?? []), ...(approvedQ.data ?? []), ...(rejectedQ.data ?? [])];
    setRejectTarget(all.find((s) => s.id === id) ?? ({ id } as ApiSubmission));
  };

  const reject = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string | null }) => {
      return api.reject(id, staffName, reason);
    },
    onSuccess: () => {
      toast({ title: "Rejected", description: "Submission moved to Rejected." });
      refreshAll();
      refreshProjector();
    },
    onError: (e: Error) => {
      toast({ title: "Reject failed", description: e.message, variant: "destructive" });
      refreshAll();
    },
  });

  const toggleDisplay = useMutation({
    mutationFn: async ({ id, display }: { id: number; display: boolean }) => {
      return api.toggleDisplay(id, display, staffName);
    },
    onSuccess: (data) => {
      // Keep the open preview in step with the change (its button label reads from it).
      setActive((a) => (a && a.id === data.id ? data : a));
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


  const uploadInfo = useMutation({
    mutationFn: async ({ file, flash }: { file: File; flash: boolean }) => {
      return api.uploadInfo(file, flash, staffName);
    },
    onSuccess: () => {
      toast({ title: "Uploaded", description: "Information message uploaded." });
      refreshAll();
      refreshProjector();
      setInfoFile(null);
    },
    onError: (e: Error) =>
      toast({ title: "Upload failed", description: e.message, variant: "destructive" }),
  });

  const postFreeText = useMutation({
    mutationFn: async ({ text, flash }: { text: string; flash: boolean }) => {
      return api.postFreeText(text, flash, staffName);
    },
    onSuccess: () => {
      toast({ title: "Sent", description: "Urgent message active on projector." });
      refreshAll();
      refreshProjector();
      setFreeText("");
    },
    onError: (e: Error) =>
      toast({ title: "Post failed", description: e.message, variant: "destructive" }),
  });

  const toggleFlash = useMutation({
    mutationFn: async ({ id, flash }: { id: number; flash: boolean }) => {
      return api.toggleFlash(id, flash, staffName);
    },
    onSuccess: () => {
      refreshAll();
      refreshProjector();
    },
    onError: (e: Error) =>
      toast({ title: "Flash toggle failed", description: e.message, variant: "destructive" }),
  });

  const busy = approve.isPending || reject.isPending || toggleDisplay.isPending || reorder.isPending || deleteSub.isPending || uploadInfo.isPending || postFreeText.isPending || toggleFlash.isPending;

  if (!user) return null;

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
      <BrandNav
        variant="light"
        links={STAFF_NAV}
      />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Moderation
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Advert Dashboard
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
            {(["new", "approved", "rejected", "comm", "projector", "prices", "results", "eod"] as Tab[]).map((k) => (
              <TabsTrigger
                key={k}
                value={k}
                className="gap-2 rounded-full px-4 capitalize data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                {TAB_LABELS[k]}
                {k !== "eod" && k !== "projector" && k !== "prices" && k !== "results" && (
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

          {moderationTabs.map((k) => (
            <TabsContent key={k} value={k} className="mt-6">
              {k === "comm" && (
                <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
                  <Card className="p-6">
                    <h3 className="flex items-center gap-2 font-display text-lg font-bold">
                      <Megaphone className="h-5 w-5 text-primary" /> Urgent Free Text
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Immediately takes over the projector in FLASH MODE.
                    </p>
                    <div className="mt-4 space-y-4">
                      <textarea
                        value={freeText}
                        onChange={(e) => setFreeText(e.target.value)}
                        placeholder="Type urgent message here..."
                        className="min-h-[100px] w-full rounded-xl border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <div className="flex gap-2">
                        <Button 
                          className="flex-1" 
                          disabled={!freeText.trim() || postFreeText.isPending}
                          onClick={() => postFreeText.mutate({ text: freeText, flash: true })}
                        >
                          <Send className="mr-2 h-4 w-4" /> Send Urgent Message
                        </Button>
                        {commQ.data?.some(m => m.isFlashMode && m.messageText) && (
                          <Button
                            variant="outline"
                            className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => {
                              const flashMsg = commQ.data?.find(m => m.isFlashMode && m.messageText);
                              if (flashMsg) setDeleteId(flashMsg.id); // confirm first, like every other delete
                            }}
                            disabled={deleteSub.isPending}
                            aria-label="Delete urgent message"
                            title="Delete urgent message"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <h3 className="flex items-center gap-2 font-display text-lg font-bold">
                      <MessageSquare className="h-5 w-5 text-primary" /> Upload Information
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Add an image to the info library. It stays hidden until you select Display, unless you tick Flash Mode (which takes over the projector straight away).
                    </p>
                    <div className="mt-4 space-y-4">
                       <Input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => setInfoFile(e.target.files?.[0] || null)}
                       />
                       <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            id="flash-check" 
                            checked={isFlash} 
                            onChange={(e) => setIsFlash(e.target.checked)}
                          />
                          <label htmlFor="flash-check" className="text-sm font-medium">Flash Mode</label>
                       </div>
                       <Button 
                        className="w-full" 
                        variant="secondary"
                        disabled={!infoFile || uploadInfo.isPending}
                        onClick={() => infoFile && uploadInfo.mutate({ file: infoFile, flash: isFlash })}
                      >
                        <Upload className="mr-2 h-4 w-4" /> Upload Info Image
                      </Button>
                    </div>
                  </Card>
                </div>
              )}

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
                  <p className="font-display text-lg font-semibold">{EMPTY_STATES[k].title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{EMPTY_STATES[k].body}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filtered.map((s: ApiSubmission) => (
                    <SubmissionCard
                      key={s.id}
                      submission={s}
                      busy={busy}
                      onApprove={(id) => approve.mutate(id)}
                      onReject={askToReject}
                      onDelete={(id) => setDeleteId(id)}
                      onToggleDisplay={(id, display) => toggleDisplay.mutate({ id, display })}
                      onToggleFlash={(id, flash) => toggleFlash.mutate({ id, flash })}
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

          <TabsContent value="projector" className="mt-6">
            <ProjectorSettingsPanel />
          </TabsContent>

          <TabsContent value="prices" className="mt-6">
            <PricesPanel />
          </TabsContent>

          <TabsContent value="results" className="mt-6">
            <ResultsPanel />
          </TabsContent>

          <TabsContent value="eod" className="mt-6">
            <EventResetPanel />
          </TabsContent>
        </Tabs>
      </main>
      <StaffFooter />

       <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
         <DialogContent className="max-w-2xl overflow-hidden p-0">
           {active && (
             <>
               {active.messageText ? (
                 <div className="flex min-h-[16rem] w-full items-center justify-center bg-indigo-900 p-8 text-center text-white">
                   <p className="font-display text-2xl font-bold">{active.messageText}</p>
                 </div>
               ) : (
                 <img
                   src={api.imageUrl(active)}
                   alt={`Submission by ${active.uploadedBy}`}
                   className="max-h-[60vh] w-full object-cover"
                 />
               )}
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
                         askToReject(active.id);
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
                         askToReject(active.id);
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

       <RejectDialog
         open={rejectTarget !== null}
         teamName={rejectTarget?.uploadedBy}
         onCancel={() => setRejectTarget(null)}
         onReject={(reason) => {
           if (rejectTarget) reject.mutate({ id: rejectTarget.id, reason });
           setRejectTarget(null);
         }}
       />

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

    </div>
  );
};

export default StaffDashboard;
