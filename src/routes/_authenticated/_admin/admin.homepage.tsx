import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, Save, RefreshCw, ImageIcon, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAllHomepageContent, useUpsertHomepageSection, DEFAULT_HOMEPAGE_CONTENT } from "@/hooks/useHomepageContent";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/_admin/admin/homepage")({
  component: AdminHomepage,
});

// ─── Image input (supports local file or URL link) ───────────────────────────
function ImageInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const [mode, setMode] = useState<"url" | "file">("url");
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // Convert to base64 data URL (works without Supabase storage configured)
      const reader = new FileReader();
      reader.onload = (ev) => {
        onChange(ev.target?.result as string);
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Failed to read image");
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {label && <Label className="text-sm font-medium">{label}</Label>}
      <div className="flex gap-2 mb-2">
        <button
          type="button"
          onClick={() => setMode("url")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${mode === "url" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
        >
          <LinkIcon className="h-3 w-3" /> URL
        </button>
        <button
          type="button"
          onClick={() => setMode("file")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${mode === "file" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
        >
          <ImageIcon className="h-3 w-3" /> Upload file
        </button>
      </div>
      {mode === "url" ? (
        <Input
          placeholder="https://images.unsplash.com/..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-sm"
        />
      ) : (
        <div className="flex items-center gap-2">
          <label className="flex-1 cursor-pointer rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 p-3 text-center transition-colors">
            <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
            <div className="text-xs text-muted-foreground">
              {uploading ? "Loading…" : "Click to select an image"}
            </div>
          </label>
        </div>
      )}
      {value && (
        <div className="relative overflow-hidden rounded-lg border aspect-video w-full max-w-sm">
          <img src={value} alt="Preview" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-1 right-1 bg-black/60 hover:bg-destructive text-white rounded-full p-1 transition-colors"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Hero section editor ──────────────────────────────────────────────────────
function HeroEditor({ initial }: { initial: Record<string, unknown> }) {
  const upsert = useUpsertHomepageSection();
  const [form, setForm] = useState({ ...initial } as Record<string, string>);
  const f = (key: string) => form[key] ?? "";
  const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const save = async () => {
    try {
      await upsert.mutateAsync({ sectionKey: "hero", data: form });
      toast.success("Hero section saved!");
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not save homepage content. Please try again."));
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Badge text</Label>
          <Input value={f("badge")} onChange={(e) => set("badge", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Heading line 1</Label>
          <Input value={f("heading_line1")} onChange={(e) => set("heading_line1", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Heading accent (italic coloured)</Label>
          <Input value={f("heading_accent")} onChange={(e) => set("heading_accent", e.target.value)} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Subtext / description</Label>
          <Textarea rows={2} value={f("subtext")} onChange={(e) => set("subtext", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Stat: Properties count</Label>
          <Input value={f("stat_properties")} onChange={(e) => set("stat_properties", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Stat: Happy clients</Label>
          <Input value={f("stat_clients")} onChange={(e) => set("stat_clients", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Stat: Verified agents</Label>
          <Input value={f("stat_agents")} onChange={(e) => set("stat_agents", e.target.value)} />
        </div>
      </div>
      <ImageInput
        label="Background image"
        value={f("background_image")}
        onChange={(v) => set("background_image", v)}
      />
      <Button onClick={save} disabled={upsert.isPending} className="gap-2">
        <Save className="h-4 w-4" /> {upsert.isPending ? "Saving…" : "Save Hero section"}
      </Button>
    </div>
  );
}

// ─── Browse categories editor ─────────────────────────────────────────────────
type Category = { type: string; label: string; icon: string; desc: string; img: string; count: string };

function CategoriesEditor({ initial }: { initial: Record<string, unknown> }) {
  const upsert = useUpsertHomepageSection();
  const [heading, setHeading] = useState(String(initial.heading ?? ""));
  const [subtext, setSubtext] = useState(String(initial.subtext ?? ""));
  const [categories, setCategories] = useState<Category[]>((initial.categories as Category[]) ?? []);

  const updateCat = (i: number, key: keyof Category, val: string) => {
    setCategories((cats) => cats.map((c, j) => j === i ? { ...c, [key]: val } : c));
  };
  const removeCat = (i: number) => setCategories((cats) => cats.filter((_, j) => j !== i));
  const addCat = () => setCategories((cats) => [
    ...cats,
    { type: "house", label: "New Category", icon: "🏠", desc: "Description", img: "", count: "0+" },
  ]);

  const save = async () => {
    try {
      await upsert.mutateAsync({ sectionKey: "browse_categories", data: { heading, subtext, categories } });
      toast.success("Categories section saved!");
    } catch (e) { toast.error(getErrorMessage(e, "Could not save homepage content. Please try again.")); }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Section heading</Label>
          <Input value={heading} onChange={(e) => setHeading(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Subtext</Label>
          <Input value={subtext} onChange={(e) => setSubtext(e.target.value)} />
        </div>
      </div>

      <div className="space-y-4">
        {categories.map((cat, i) => (
          <div key={i} className="rounded-xl border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">Category {i + 1}</span>
              <Button size="sm" variant="ghost" className="text-destructive h-7 px-2" onClick={() => removeCat(i)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">Label</Label>
                <Input className="h-8 text-sm" value={cat.label} onChange={(e) => updateCat(i, "label", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Icon (emoji)</Label>
                <Input className="h-8 text-sm" value={cat.icon} onChange={(e) => updateCat(i, "icon", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Count label</Label>
                <Input className="h-8 text-sm" value={cat.count} onChange={(e) => updateCat(i, "count", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Input className="h-8 text-sm" value={cat.desc} onChange={(e) => updateCat(i, "desc", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Type (house/apartment/land/commercial)</Label>
                <Input className="h-8 text-sm" value={cat.type} onChange={(e) => updateCat(i, "type", e.target.value)} />
              </div>
            </div>
            <ImageInput label="Category image" value={cat.img} onChange={(v) => updateCat(i, "img", v)} />
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addCat} className="gap-2">
          <Plus className="h-4 w-4" /> Add category
        </Button>
      </div>
      <Button onClick={save} disabled={upsert.isPending} className="gap-2">
        <Save className="h-4 w-4" /> {upsert.isPending ? "Saving…" : "Save Categories section"}
      </Button>
    </div>
  );
}

// ─── How it works editor ──────────────────────────────────────────────────────
type Step = { step: string; title: string; desc: string };

function HowItWorksEditor({ initial }: { initial: Record<string, unknown> }) {
  const upsert = useUpsertHomepageSection();
  const [heading, setHeading] = useState(String(initial.heading ?? ""));
  const [subtext, setSubtext] = useState(String(initial.subtext ?? ""));
  const [steps, setSteps] = useState<Step[]>((initial.steps as Step[]) ?? []);

  const updateStep = (i: number, key: keyof Step, val: string) =>
    setSteps((s) => s.map((st, j) => j === i ? { ...st, [key]: val } : st));
  const removeStep = (i: number) => setSteps((s) => s.filter((_, j) => j !== i));
  const addStep = () => setSteps((s) => [...s, { step: `0${s.length + 1}`, title: "New Step", desc: "Description" }]);

  const save = async () => {
    try {
      await upsert.mutateAsync({ sectionKey: "how_it_works", data: { heading, subtext, steps } });
      toast.success("How it works section saved!");
    } catch (e) { toast.error(getErrorMessage(e, "Could not save homepage content. Please try again.")); }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2"><Label>Heading</Label><Input value={heading} onChange={(e) => setHeading(e.target.value)} /></div>
        <div className="space-y-2"><Label>Subtext</Label><Input value={subtext} onChange={(e) => setSubtext(e.target.value)} /></div>
      </div>
      <div className="space-y-3">
        {steps.map((st, i) => (
          <div key={i} className="rounded-xl border bg-muted/30 p-4 grid gap-3 md:grid-cols-3">
            <div className="space-y-1"><Label className="text-xs">Step number</Label><Input className="h-8 text-sm" value={st.step} onChange={(e) => updateStep(i, "step", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Title</Label><Input className="h-8 text-sm" value={st.title} onChange={(e) => updateStep(i, "title", e.target.value)} /></div>
            <div className="space-y-1 md:col-span-2"><Label className="text-xs">Description</Label><Input className="h-8 text-sm" value={st.desc} onChange={(e) => updateStep(i, "desc", e.target.value)} /></div>
            <div className="flex items-end"><Button size="sm" variant="ghost" className="text-destructive h-7 px-2" onClick={() => removeStep(i)}><Trash2 className="h-3.5 w-3.5" /></Button></div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addStep} className="gap-2"><Plus className="h-4 w-4" /> Add step</Button>
      </div>
      <Button onClick={save} disabled={upsert.isPending} className="gap-2"><Save className="h-4 w-4" /> {upsert.isPending ? "Saving…" : "Save How It Works"}</Button>
    </div>
  );
}

// ─── Why us editor ────────────────────────────────────────────────────────────
type Feature = { title: string; desc: string };

function WhyUsEditor({ initial }: { initial: Record<string, unknown> }) {
  const upsert = useUpsertHomepageSection();
  const [heading, setHeading] = useState(String(initial.heading ?? ""));
  const [features, setFeatures] = useState<Feature[]>((initial.features as Feature[]) ?? []);

  const updateFeature = (i: number, key: keyof Feature, val: string) =>
    setFeatures((f) => f.map((ft, j) => j === i ? { ...ft, [key]: val } : ft));
  const removeFeature = (i: number) => setFeatures((f) => f.filter((_, j) => j !== i));
  const addFeature = () => setFeatures((f) => [...f, { title: "New Feature", desc: "Description" }]);

  const save = async () => {
    try {
      await upsert.mutateAsync({ sectionKey: "why_us", data: { heading, features } });
      toast.success("Why Us section saved!");
    } catch (e) { toast.error(getErrorMessage(e, "Could not save homepage content. Please try again.")); }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2"><Label>Section heading</Label><Input value={heading} onChange={(e) => setHeading(e.target.value)} /></div>
      <div className="space-y-3">
        {features.map((ft, i) => (
          <div key={i} className="rounded-xl border bg-muted/30 p-4 grid gap-3 md:grid-cols-2">
            <div className="space-y-1"><Label className="text-xs">Title</Label><Input className="h-8 text-sm" value={ft.title} onChange={(e) => updateFeature(i, "title", e.target.value)} /></div>
            <div className="space-y-1 md:col-span-2"><Label className="text-xs">Description</Label><Input className="h-8 text-sm" value={ft.desc} onChange={(e) => updateFeature(i, "desc", e.target.value)} /></div>
            <div><Button size="sm" variant="ghost" className="text-destructive h-7 px-2" onClick={() => removeFeature(i)}><Trash2 className="h-3.5 w-3.5" /></Button></div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addFeature} className="gap-2"><Plus className="h-4 w-4" /> Add feature</Button>
      </div>
      <Button onClick={save} disabled={upsert.isPending} className="gap-2"><Save className="h-4 w-4" /> {upsert.isPending ? "Saving…" : "Save Why Us"}</Button>
    </div>
  );
}

// ─── Testimonials editor ──────────────────────────────────────────────────────
type Testimonial = { name: string; role: string; rating: number; text: string };

function TestimonialsEditor({ initial }: { initial: Record<string, unknown> }) {
  const upsert = useUpsertHomepageSection();
  const [heading, setHeading] = useState(String(initial.heading ?? ""));
  const [items, setItems] = useState<Testimonial[]>((initial.items as Testimonial[]) ?? []);

  const updateItem = (i: number, key: keyof Testimonial, val: string | number) =>
    setItems((ts) => ts.map((t, j) => j === i ? { ...t, [key]: val } : t));
  const removeItem = (i: number) => setItems((ts) => ts.filter((_, j) => j !== i));
  const addItem = () => setItems((ts) => [...ts, { name: "New Person", role: "Buyer", rating: 5, text: "Great experience!" }]);

  const save = async () => {
    try {
      await upsert.mutateAsync({ sectionKey: "testimonials", data: { heading, items } });
      toast.success("Testimonials section saved!");
    } catch (e) { toast.error(getErrorMessage(e, "Could not save homepage content. Please try again.")); }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2"><Label>Section heading</Label><Input value={heading} onChange={(e) => setHeading(e.target.value)} /></div>
      <div className="space-y-4">
        {items.map((t, i) => (
          <div key={i} className="rounded-xl border bg-muted/30 p-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1"><Label className="text-xs">Name</Label><Input className="h-8 text-sm" value={t.name} onChange={(e) => updateItem(i, "name", e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Role / title</Label><Input className="h-8 text-sm" value={t.role} onChange={(e) => updateItem(i, "role", e.target.value)} /></div>
              <div className="space-y-1">
                <Label className="text-xs">Rating (1-5)</Label>
                <Input className="h-8 text-sm" type="number" min={1} max={5} value={t.rating} onChange={(e) => updateItem(i, "rating", Number(e.target.value))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Testimonial text</Label>
              <Textarea rows={2} className="text-sm" value={t.text} onChange={(e) => updateItem(i, "text", e.target.value)} />
            </div>
            <Button size="sm" variant="ghost" className="text-destructive h-7 px-2" onClick={() => removeItem(i)}><Trash2 className="h-3.5 w-3.5 mr-1" /> Remove</Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addItem} className="gap-2"><Plus className="h-4 w-4" /> Add testimonial</Button>
      </div>
      <Button onClick={save} disabled={upsert.isPending} className="gap-2"><Save className="h-4 w-4" /> {upsert.isPending ? "Saving…" : "Save Testimonials"}</Button>
    </div>
  );
}

// ─── Cities editor ────────────────────────────────────────────────────────────
type CityItem = { city: string; state: string; count: string; img: string };

function CitiesEditor({ initial }: { initial: Record<string, unknown> }) {
  const upsert = useUpsertHomepageSection();
  const [heading, setHeading] = useState(String(initial.heading ?? ""));
  const [locations, setLocations] = useState<CityItem[]>((initial.locations as CityItem[]) ?? []);

  const updateLoc = (i: number, key: keyof CityItem, val: string) =>
    setLocations((ls) => ls.map((l, j) => j === i ? { ...l, [key]: val } : l));
  const removeLoc = (i: number) => setLocations((ls) => ls.filter((_, j) => j !== i));
  const addLoc = () => setLocations((ls) => [...ls, { city: "New City", state: "State", count: "0+", img: "" }]);

  const save = async () => {
    try {
      await upsert.mutateAsync({ sectionKey: "cities", data: { heading, locations } });
      toast.success("Cities section saved!");
    } catch (e) { toast.error(getErrorMessage(e, "Could not save homepage content. Please try again.")); }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2"><Label>Section heading</Label><Input value={heading} onChange={(e) => setHeading(e.target.value)} /></div>
      <div className="space-y-4">
        {locations.map((loc, i) => (
          <div key={i} className="rounded-xl border bg-muted/30 p-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1"><Label className="text-xs">City</Label><Input className="h-8 text-sm" value={loc.city} onChange={(e) => updateLoc(i, "city", e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">State</Label><Input className="h-8 text-sm" value={loc.state} onChange={(e) => updateLoc(i, "state", e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Count label</Label><Input className="h-8 text-sm" value={loc.count} onChange={(e) => updateLoc(i, "count", e.target.value)} /></div>
            </div>
            <ImageInput label="City image" value={loc.img} onChange={(v) => updateLoc(i, "img", v)} />
            <Button size="sm" variant="ghost" className="text-destructive h-7 px-2" onClick={() => removeLoc(i)}><Trash2 className="h-3.5 w-3.5 mr-1" /> Remove</Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addLoc} className="gap-2"><Plus className="h-4 w-4" /> Add city</Button>
      </div>
      <Button onClick={save} disabled={upsert.isPending} className="gap-2"><Save className="h-4 w-4" /> {upsert.isPending ? "Saving…" : "Save Cities"}</Button>
    </div>
  );
}

// ─── Agent CTA editor ─────────────────────────────────────────────────────────
function AgentCtaEditor({ initial }: { initial: Record<string, unknown> }) {
  const upsert = useUpsertHomepageSection();
  const [form, setForm] = useState({ ...initial } as Record<string, string>);
  const f = (key: string) => form[key] ?? "";
  const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const save = async () => {
    try {
      await upsert.mutateAsync({ sectionKey: "agent_cta", data: form });
      toast.success("CTA section saved!");
    } catch (e) { toast.error(getErrorMessage(e, "Could not save homepage content. Please try again.")); }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2"><Label>Agent CTA heading</Label><Input value={f("heading")} onChange={(e) => set("heading", e.target.value)} /></div>
        <div className="space-y-2 md:col-span-2"><Label>Agent CTA subtext</Label><Textarea rows={2} value={f("subtext")} onChange={(e) => set("subtext", e.target.value)} /></div>
        <div className="space-y-2"><Label>Contact heading</Label><Input value={f("contact_heading")} onChange={(e) => set("contact_heading", e.target.value)} /></div>
        <div className="space-y-2 md:col-span-2"><Label>Contact subtext</Label><Textarea rows={2} value={f("contact_subtext")} onChange={(e) => set("contact_subtext", e.target.value)} /></div>
        <div className="space-y-2"><Label>Phone</Label><Input value={f("phone")} onChange={(e) => set("phone", e.target.value)} /></div>
        <div className="space-y-2"><Label>Email</Label><Input value={f("email")} onChange={(e) => set("email", e.target.value)} /></div>
        <div className="space-y-2"><Label>Office hours</Label><Input value={f("hours")} onChange={(e) => set("hours", e.target.value)} /></div>
      </div>
      <Button onClick={save} disabled={upsert.isPending} className="gap-2"><Save className="h-4 w-4" /> {upsert.isPending ? "Saving…" : "Save CTA section"}</Button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
function AdminHomepage() {
  const { data: content, isLoading, refetch } = useAllHomepageContent();

  const get = (key: string) => (content?.[key] ?? DEFAULT_HOMEPAGE_CONTENT[key]) as Record<string, unknown>;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-20 justify-center">
        <RefreshCw className="h-4 w-4 animate-spin" /> Loading homepage content…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Every change here updates the live homepage in real-time.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <Tabs defaultValue="hero">
        <TabsList className="flex-wrap h-auto gap-1 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="hero" className="rounded-lg text-xs">🏠 Hero</TabsTrigger>
          <TabsTrigger value="categories" className="rounded-lg text-xs">🗂 Categories</TabsTrigger>
          <TabsTrigger value="how" className="rounded-lg text-xs">📋 How it Works</TabsTrigger>
          <TabsTrigger value="why" className="rounded-lg text-xs">⚡ Why Us</TabsTrigger>
          <TabsTrigger value="testimonials" className="rounded-lg text-xs">💬 Testimonials</TabsTrigger>
          <TabsTrigger value="cities" className="rounded-lg text-xs">🗺 Cities</TabsTrigger>
          <TabsTrigger value="cta" className="rounded-lg text-xs">📣 CTA</TabsTrigger>
        </TabsList>

        <TabsContent value="hero" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hero Section</CardTitle>
              <CardDescription>The main banner at the top of the homepage — headline, description, stats, and background image.</CardDescription>
            </CardHeader>
            <CardContent><HeroEditor initial={get("hero")} /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Browse by Property Type</CardTitle>
              <CardDescription>The category cards section showing house, apartment, land, and commercial listings.</CardDescription>
            </CardHeader>
            <CardContent><CategoriesEditor initial={get("browse_categories")} /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="how" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">How It Works</CardTitle>
              <CardDescription>The step-by-step process section explaining how the platform works.</CardDescription>
            </CardHeader>
            <CardContent><HowItWorksEditor initial={get("how_it_works")} /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="why" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Why AbodeSpot</CardTitle>
              <CardDescription>The features/advantages section with icon cards.</CardDescription>
            </CardHeader>
            <CardContent><WhyUsEditor initial={get("why_us")} /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testimonials" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Testimonials</CardTitle>
              <CardDescription>Customer reviews and quotes shown on the homepage.</CardDescription>
            </CardHeader>
            <CardContent><TestimonialsEditor initial={get("testimonials")} /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cities" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Cities</CardTitle>
              <CardDescription>City spotlight cards that link to property searches by city.</CardDescription>
            </CardHeader>
            <CardContent><CitiesEditor initial={get("cities")} /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cta" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Agent & Contact CTA</CardTitle>
              <CardDescription>The "List your property" and "Need help?" call-to-action section at the bottom.</CardDescription>
            </CardHeader>
            <CardContent><AgentCtaEditor initial={get("agent_cta")} /></CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
