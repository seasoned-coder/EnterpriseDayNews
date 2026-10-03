import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MonitorPlay, Save } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { api, type ProjectorSettings } from "@/lib/api";

type Editable = Omit<ProjectorSettings, "id">;

/** Must match DisplaySettingsService on the backend. */
const FIELDS: { key: keyof Editable; label: string; help: string; min: number; max: number }[] = [
  {
    key: "intervalSpeedSeconds",
    label: "Staff content interval (seconds)",
    help:
      "Event Communications items that are set to Display slip in between student adverts once this many " +
      "seconds of adverts have played. 0 = after every advert.",
    min: 0,
    max: 3600,
  },
  {
    key: "displayDurationSeconds",
    label: "Staff item display time (seconds)",
    help: "How long each staff item stays on screen. Student adverts always get the time they paid for.",
    min: 3,
    max: 120,
  },
  {
    key: "imageRefreshSeconds",
    label: "Projector refresh (seconds)",
    help: "How often the projector checks for newly approved, hidden or removed items.",
    min: 2,
    max: 60,
  },
];

export const ProjectorSettingsPanel = () => {
  const qc = useQueryClient();
  const settingsQ = useQuery({ queryKey: ["projector-settings"], queryFn: () => api.projectorSettings() });
  const [form, setForm] = useState<Record<keyof Editable, string> | null>(null);

  useEffect(() => {
    if (settingsQ.data && form === null) {
      setForm({
        intervalSpeedSeconds: String(settingsQ.data.intervalSpeedSeconds),
        displayDurationSeconds: String(settingsQ.data.displayDurationSeconds),
        imageRefreshSeconds: String(settingsQ.data.imageRefreshSeconds),
      });
    }
  }, [settingsQ.data, form]);

  const save = useMutation({
    mutationFn: (values: Editable) => api.updateProjectorSettings(values),
    onSuccess: (saved) => {
      qc.setQueryData(["projector-settings"], saved);
      toast({ title: "Projector settings saved", description: "The projector picks them up within a minute." });
    },
    onError: (e: Error) => toast({ title: "Couldn't save settings", description: e.message, variant: "destructive" }),
  });

  if (!form) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading projector settings…
      </div>
    );
  }

  const errors = FIELDS.filter(({ key, min, max }) => {
    const n = Number(form[key]);
    return form[key].trim() === "" || !Number.isInteger(n) || n < min || n > max;
  }).map((f) => f.key);

  return (
    <Card className="max-w-2xl p-6">
      <h3 className="flex items-center gap-2 font-display text-lg font-bold">
        <MonitorPlay className="h-5 w-5 text-primary" /> Projector settings
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Student adverts play in the order on the Approved tab. Each advert appears once per priority point
        (priority 4 = four times per rotation) for the duration the student chose.
      </p>
      <form
        className="mt-6 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (errors.length > 0) return;
          save.mutate({
            intervalSpeedSeconds: Number(form.intervalSpeedSeconds),
            displayDurationSeconds: Number(form.displayDurationSeconds),
            imageRefreshSeconds: Number(form.imageRefreshSeconds),
          });
        }}
      >
        {FIELDS.map(({ key, label, help, min, max }) => (
          <div key={key} className="space-y-1.5">
            <label htmlFor={key} className="text-sm font-medium">
              {label}
            </label>
            <Input
              id={key}
              type="number"
              inputMode="numeric"
              min={min}
              max={max}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              aria-invalid={errors.includes(key)}
              className="max-w-[10rem]"
            />
            <p className={`text-xs ${errors.includes(key) ? "text-destructive" : "text-muted-foreground"}`}>
              {errors.includes(key) ? `Enter a whole number from ${min} to ${max}.` : help}
            </p>
          </div>
        ))}
        <Button type="submit" disabled={save.isPending || errors.length > 0}>
          {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save settings
        </Button>
      </form>
    </Card>
  );
};
