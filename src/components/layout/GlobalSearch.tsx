import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { Users, FileText, FileCheck, CreditCard, Loader2 } from "lucide-react";

interface Result {
  id: string;
  label: string;
  sub?: string;
  type: "cliente" | "contrato" | "proforma" | "pago";
  route: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      return;
    }
  }, [open]);

  useEffect(() => {
    const run = async () => {
      if (!debounced || debounced.length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      const like = `%${debounced}%`;
      try {
        const [clientes, contratos, proformas, pagos] = await Promise.all([
          supabase
            .from("clientes")
            .select("id, codigo, razon_social, nombre_persona_natural")
            .or(
              `razon_social.ilike.${like},codigo.ilike.${like},nombre_persona_natural.ilike.${like}`
            )
            .limit(8),
          supabase
            .from("contratos")
            .select("id, numero, descripcion")
            .or(`numero.ilike.${like},descripcion.ilike.${like}`)
            .limit(8),
          supabase
            .from("proformas")
            .select("id, numero, tipo")
            .ilike("numero", like)
            .limit(8),
          supabase
            .from("pagos")
            .select("id, numero_comprobante, serie_comprobante, referencia")
            .or(
              `numero_comprobante.ilike.${like},serie_comprobante.ilike.${like},referencia.ilike.${like}`
            )
            .limit(8),
        ]);

        const out: Result[] = [];
        (clientes.data || []).forEach((c: any) =>
          out.push({
            id: c.id,
            label: c.razon_social || c.nombre_persona_natural || c.codigo,
            sub: c.codigo,
            type: "cliente",
            route: `/clientes?cliente=${c.id}`,
          })
        );
        (contratos.data || []).forEach((c: any) =>
          out.push({
            id: c.id,
            label: c.numero,
            sub: c.descripcion,
            type: "contrato",
            route: `/contratos?contrato=${c.id}`,
          })
        );
        (proformas.data || []).forEach((p: any) =>
          out.push({
            id: p.id,
            label: p.numero,
            sub: p.tipo,
            type: "proforma",
            route: `/proformas?proforma=${p.id}`,
          })
        );
        (pagos.data || []).forEach((p: any) =>
          out.push({
            id: p.id,
            label:
              [p.serie_comprobante, p.numero_comprobante].filter(Boolean).join("-") ||
              p.referencia ||
              "Pago",
            sub: p.referencia || undefined,
            type: "pago",
            route: `/calendario-pagos?pago=${p.id}`,
          })
        );
        setResults(out);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [debounced]);

  const grouped = useMemo(() => {
    const g: Record<string, Result[]> = {
      cliente: [],
      contrato: [],
      proforma: [],
      pago: [],
    };
    results.forEach((r) => g[r.type].push(r));
    return g;
  }, [results]);

  const go = (route: string) => {
    onOpenChange(false);
    navigate(route);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Buscar clientes, contratos, proformas, pagos..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {loading && (
          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Buscando...
          </div>
        )}
        {!loading && debounced.length < 2 && (
          <CommandEmpty>Escribe al menos 2 caracteres</CommandEmpty>
        )}
        {!loading && debounced.length >= 2 && results.length === 0 && (
          <CommandEmpty>Sin resultados</CommandEmpty>
        )}
        {grouped.cliente.length > 0 && (
          <CommandGroup heading="Clientes">
            {grouped.cliente.map((r) => (
              <CommandItem key={r.id} value={`cliente-${r.id}-${r.label}`} onSelect={() => go(r.route)}>
                <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="flex-1">{r.label}</span>
                {r.sub && <span className="text-xs text-muted-foreground">{r.sub}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {grouped.contrato.length > 0 && (
          <CommandGroup heading="Contratos">
            {grouped.contrato.map((r) => (
              <CommandItem key={r.id} value={`contrato-${r.id}-${r.label}`} onSelect={() => go(r.route)}>
                <FileCheck className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="flex-1">{r.label}</span>
                {r.sub && <span className="text-xs text-muted-foreground truncate max-w-[40%]">{r.sub}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {grouped.proforma.length > 0 && (
          <CommandGroup heading="Proformas">
            {grouped.proforma.map((r) => (
              <CommandItem key={r.id} value={`proforma-${r.id}-${r.label}`} onSelect={() => go(r.route)}>
                <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="flex-1">{r.label}</span>
                {r.sub && <span className="text-xs text-muted-foreground">{r.sub}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {grouped.pago.length > 0 && (
          <CommandGroup heading="Pagos">
            {grouped.pago.map((r) => (
              <CommandItem key={r.id} value={`pago-${r.id}-${r.label}`} onSelect={() => go(r.route)}>
                <CreditCard className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="flex-1">{r.label}</span>
                {r.sub && <span className="text-xs text-muted-foreground">{r.sub}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}