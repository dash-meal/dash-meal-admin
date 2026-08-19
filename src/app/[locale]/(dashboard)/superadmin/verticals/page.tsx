"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Barcode, Ruler, Package } from "lucide-react";

interface BranchVertical {
  id: string;
  key: string;
  name_fr: string;
  name_en: string;
  description: string | null;
  decrement_on_order: boolean;
  requires_barcode: boolean;
  requires_unit_type: boolean;
  low_stock_default_threshold: number;
  is_active: boolean;
}

interface VerticalForm {
  key: string;
  name_fr: string;
  name_en: string;
  description: string;
  decrement_on_order: boolean;
  requires_barcode: boolean;
  requires_unit_type: boolean;
  low_stock_default_threshold: string;
}

const EMPTY_FORM: VerticalForm = {
  key: "",
  name_fr: "",
  name_en: "",
  description: "",
  decrement_on_order: true,
  requires_barcode: false,
  requires_unit_type: false,
  low_stock_default_threshold: "5",
};

export default function VerticalsPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BranchVertical | null>(null);
  const [form, setForm] = useState<VerticalForm>(EMPTY_FORM);

  const { data: verticals = [], isLoading } = useQuery<BranchVertical[]>({
    queryKey: ["branch-verticals"],
    queryFn: () => apiGet("/branch-verticals"),
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiPost("/branch-verticals", body),
    onSuccess: () => {
      toast.success("Vertical créé");
      qc.invalidateQueries({ queryKey: ["branch-verticals"] });
      closeDialog();
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? "Échec de création"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => apiPatch(`/branch-verticals/${id}`, body),
    onSuccess: () => {
      toast.success("Vertical mis à jour");
      qc.invalidateQueries({ queryKey: ["branch-verticals"] });
      closeDialog();
    },
    onError: (err: any) => toast.error(err?.response?.data?.error?.message ?? "Échec de mise à jour"),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      is_active ? apiPatch(`/branch-verticals/${id}`, { is_active: true }) : apiPatch(`/branch-verticals/${id}/deactivate`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branch-verticals"] });
    },
    onError: () => toast.error("Échec de la mise à jour du statut"),
  });

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setDialogOpen(true); };
  const openEdit = (v: BranchVertical) => {
    setEditing(v);
    setForm({
      key: v.key,
      name_fr: v.name_fr,
      name_en: v.name_en,
      description: v.description ?? "",
      decrement_on_order: v.decrement_on_order,
      requires_barcode: v.requires_barcode,
      requires_unit_type: v.requires_unit_type,
      low_stock_default_threshold: String(v.low_stock_default_threshold),
    });
    setDialogOpen(true);
  };
  const closeDialog = () => { setDialogOpen(false); setEditing(null); setForm(EMPTY_FORM); };

  const handleSave = () => {
    if (!form.name_fr || !form.name_en) { toast.error("Nom (FR et EN) requis"); return; }
    const threshold = parseInt(form.low_stock_default_threshold);
    if (isNaN(threshold) || threshold < 0) { toast.error("Seuil d'alerte invalide"); return; }

    const body = {
      name_fr: form.name_fr,
      name_en: form.name_en,
      description: form.description || undefined,
      decrement_on_order: form.decrement_on_order,
      requires_barcode: form.requires_barcode,
      requires_unit_type: form.requires_unit_type,
      low_stock_default_threshold: threshold,
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, body });
    } else {
      if (!form.key) { toast.error("Clé requise (ex: pharmacy)"); return; }
      createMutation.mutate({ ...body, key: form.key });
    }
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Verticals</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Profils qui pilotent le comportement du stock par type d&apos;agence (restaurant, supermarché, hypermarché...)
          </p>
        </div>
        <Button size="sm" className="bg-brand-600 hover:bg-brand-700" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" />
          Nouveau vertical
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Clé</TableHead>
                <TableHead>Décrément auto</TableHead>
                <TableHead>Code-barres</TableHead>
                <TableHead>Unité</TableHead>
                <TableHead>Seuil alerte</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : verticals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-slate-400 py-8">
                    Aucun vertical
                  </TableCell>
                </TableRow>
              ) : (
                verticals.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium text-slate-800">
                      {v.name_fr}
                      {v.description && <p className="text-xs text-slate-400 mt-0.5">{v.description}</p>}
                    </TableCell>
                    <TableCell><code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{v.key}</code></TableCell>
                    <TableCell>{v.decrement_on_order ? <Badge className="bg-green-100 text-green-800">Oui</Badge> : <Badge className="bg-slate-100 text-slate-600">Non</Badge>}</TableCell>
                    <TableCell>{v.requires_barcode ? <Barcode className="h-4 w-4 text-brand-600" /> : <span className="text-slate-300">—</span>}</TableCell>
                    <TableCell>{v.requires_unit_type ? <Ruler className="h-4 w-4 text-brand-600" /> : <span className="text-slate-300">—</span>}</TableCell>
                    <TableCell>{v.low_stock_default_threshold}</TableCell>
                    <TableCell>
                      <Switch
                        checked={v.is_active}
                        onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: v.id, is_active: checked })}
                      />
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => openEdit(v)}>Modifier</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              {editing ? "Modifier le vertical" : "Nouveau vertical"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editing && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">Clé (identifiant technique, non modifiable ensuite)</label>
                <Input
                  value={form.key}
                  onChange={(e) => setForm((f) => ({ ...f, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") }))}
                  placeholder="ex: pharmacy, restaurant_delivery_only"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">Nom (FR)</label>
                <Input value={form.name_fr} onChange={(e) => setForm((f) => ({ ...f, name_fr: e.target.value }))} placeholder="Pharmacie" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">Nom (EN)</label>
                <Input value={form.name_en} onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))} placeholder="Pharmacy" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Description (optionnel)</label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Seuil d&apos;alerte stock bas (par défaut)</label>
              <Input
                type="number" min={0}
                value={form.low_stock_default_threshold}
                onChange={(e) => setForm((f) => ({ ...f, low_stock_default_threshold: e.target.value }))}
              />
            </div>
            <div className="space-y-2.5 rounded-lg bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700">Décrémenter le stock à la commande</span>
                <Switch checked={form.decrement_on_order} onCheckedChange={(c) => setForm((f) => ({ ...f, decrement_on_order: c }))} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700">Code-barres requis sur les produits</span>
                <Switch checked={form.requires_barcode} onCheckedChange={(c) => setForm((f) => ({ ...f, requires_barcode: c }))} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700">Unité de mesure structurée (kg/L/pièce...)</span>
                <Switch checked={form.requires_unit_type} onCheckedChange={(c) => setForm((f) => ({ ...f, requires_unit_type: c }))} />
              </div>
            </div>
            <Button className="w-full bg-brand-600 hover:bg-brand-700" disabled={saving} onClick={handleSave}>
              {saving ? "Enregistrement..." : editing ? "Enregistrer" : "Créer le vertical"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
