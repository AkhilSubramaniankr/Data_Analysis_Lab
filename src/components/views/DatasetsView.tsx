"use client";

/**
 * DatasetsView — Dataset Explorer (Phase 2).
 *
 * Replaces the Phase 1 stub with real, interactive content:
 *   - Built-in dataset selector (3 datasets + the messy variant for Module 2).
 *   - Real preview table (paginated, sortable).
 *   - Real data dictionary.
 *   - Real dimensions, dtypes, known issues, analytical questions,
 *     feature-engineering opportunities, limitations.
 *   - CSV upload (1 MB cap, client-side parsing, clear error messages).
 *
 * Every number is computed from the actual dataset rows — no fabrication.
 */

import * as React from "react";
import {
  Database,
  FileSpreadsheet,
  Upload,
  AlertCircle,
  Hash,
  Columns3,
  CheckCircle2,
  TriangleAlert,
} from "lucide-react";
import { useNavigation } from "@/lib/store/navigation";
import { BUILT_IN_DATASETS, LAB_DATASETS, getDatasetById } from "@/lib/data/datasets";
import { DataFrame } from "@/lib/data/frame";
import type { DatasetSpec } from "@/lib/data/types";
import { handleCsvUpload, CSV_MAX_BYTES } from "@/lib/data/csv";
import { SectionContainer } from "@/components/learning/SectionContainer";
import { PageHeader } from "@/components/learning/PageHeader";
import { DatasetTable } from "@/components/data/DatasetTable";
import { DataDictionaryTable } from "@/components/data/DataDictionaryTable";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export function DatasetsView() {
  const setView = useNavigation((s) => s.setView);
  const openModule = useNavigation((s) => s.openModule);
  const [selectedId, setSelectedId] = React.useState<string>("retail");
  const [uploadedSpec, setUploadedSpec] = React.useState<DatasetSpec | null>(null);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [uploadInfo, setUploadInfo] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const allSpecs = React.useMemo(
    () => [...BUILT_IN_DATASETS, ...LAB_DATASETS],
    []
  );

  const activeSpec = uploadedSpec ?? allSpecs.find((d) => d.id === selectedId) ?? allSpecs[0];
  const df = React.useMemo(() => DataFrame.fromRows(activeSpec.rows), [activeSpec]);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setUploadError(null);
    setUploadInfo(null);
    const result = await handleCsvUpload(file);
    if (result.ok && result.spec) {
      setUploadedSpec(result.spec);
      setUploadInfo(
        `Parsed ${result.rowsParsed ?? 0} rows · delimiter: ${result.delimiter ?? ","}`
          + (result.warning ? ` · ${result.warning}` : "")
      );
    } else {
      setUploadError(result.error ?? "Unknown error");
    }
  };

  const onSelectBuiltIn = (id: string) => {
    setUploadedSpec(null);
    setSelectedId(id);
    setUploadError(null);
    setUploadInfo(null);
  };

  return (
    <SectionContainer className="py-8">
      <PageHeader
        eyebrow="Dataset Explorer"
        title="Built-in and uploaded datasets"
        subtitle="Pick a built-in dataset or upload your own CSV (1 MB max, processed in your browser only). Every preview, dictionary, and statistic is computed from the actual rows — no fabrication."
      />

      {/* Ethical warning for the employee dataset */}
      {activeSpec.id === "employees" && activeSpec.ethicalWarning && (
        <Alert className="mt-5 border-[var(--color-role-warning)]/40 bg-[color-mix(in_oklch,var(--color-role-warning)_8%,transparent)]">
          <AlertCircle className="h-4 w-4 text-[var(--color-role-warning)]" />
          <AlertTitle className="text-[var(--color-role-warning)]">
            About the employee dataset
          </AlertTitle>
          <AlertDescription className="text-sm text-foreground/80">
            {activeSpec.ethicalWarning}
          </AlertDescription>
        </Alert>
      )}

      <section aria-labelledby="pick-h" className="mt-6">
        <h2 id="pick-h" className="text-lg font-semibold">Built-in datasets</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {allSpecs.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => onSelectBuiltIn(d.id)}
              aria-pressed={activeSpec.id === d.id && !uploadedSpec}
              className={cn(
                "flex flex-col gap-1 rounded-lg border bg-card p-3 text-left shadow-sm transition hover:shadow-md",
                activeSpec.id === d.id && !uploadedSpec
                  ? "border-[var(--color-ai-blue)] ring-1 ring-[var(--color-ai-blue)]/30"
                  : "border-border"
              )}
            >
              <span className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-[var(--color-ai-blue)]" aria-hidden />
                <span className="text-sm font-semibold">{d.name}</span>
              </span>
              <span className="text-xs text-muted-foreground line-clamp-2">{d.context}</span>
              <span className="mt-1 text-mono text-[10px] text-muted-foreground">
                {d.rows.length} rows · {d.columns.length} cols
              </span>
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="upload-h" className="mt-8">
        <h2 id="upload-h" className="text-lg font-semibold">Upload your own CSV</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Files are processed entirely in your browser. Hard limit: {(CSV_MAX_BYTES / 1024).toFixed(0)} KB.
          No external transmission. Clear, actionable error messages for the wrong
          delimiter, missing columns, or oversized uploads.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            className="sr-only"
            aria-label="Upload CSV file"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="gap-1.5"
          >
            <Upload className="h-4 w-4" aria-hidden />
            Choose CSV file
          </Button>
          {uploadedSpec && (
            <Button variant="ghost" size="sm" onClick={() => setUploadedSpec(null)} className="gap-1.5">
              Use built-in dataset instead
            </Button>
          )}
        </div>
        {uploadError && (
          <Alert className="mt-3 border-[var(--color-role-error)]/40 bg-[color-mix(in_oklch,var(--color-role-error)_8%,transparent)]">
            <AlertCircle className="h-4 w-4 text-[var(--color-role-error)]" />
            <AlertTitle className="text-[var(--color-role-error)]">Upload failed</AlertTitle>
            <AlertDescription className="text-sm">{uploadError}</AlertDescription>
          </Alert>
        )}
        {uploadInfo && (
          <Alert className="mt-3 border-[var(--color-role-validated)]/40 bg-[color-mix(in_oklch,var(--color-role-validated)_8%,transparent)]">
            <CheckCircle2 className="h-4 w-4 text-[var(--color-role-validated)]" />
            <AlertTitle className="text-[var(--color-role-validated)]">Uploaded</AlertTitle>
            <AlertDescription className="text-sm">{uploadInfo}</AlertDescription>
          </Alert>
        )}
      </section>

      <section aria-labelledby="active-h" className="mt-10">
        <h2 id="active-h" className="text-2xl font-bold tracking-tight">{activeSpec.name}</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground sm:text-base">{activeSpec.context}</p>

        {/* Quick stats */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat icon={Hash} label="Rows" value={df.shape[0].toLocaleString()} tone="data" />
          <Stat icon={Columns3} label="Columns" value={String(df.shape[1])} tone="data" />
          <Stat icon={Database} label="Memory" value={`${(df.info().memoryBytes / 1024).toFixed(1)} KB`} tone="stats" />
          <Stat
            icon={activeSpec.knownIssues.length > 0 ? TriangleAlert : CheckCircle2}
            label="Known issues"
            value={String(activeSpec.knownIssues.length)}
            tone={activeSpec.knownIssues.length > 0 ? "warning" : "validated"}
          />
        </div>

        <Tabs defaultValue="preview" className="mt-5">
          <TabsList>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="dictionary">Data dictionary</TabsTrigger>
            <TabsTrigger value="quality">Quality</TabsTrigger>
            <TabsTrigger value="insights">Analytical use</TabsTrigger>
          </TabsList>
          <TabsContent value="preview" className="mt-3">
            <DatasetTable df={df} pageSize={10} caption={`${activeSpec.name} — first rows`} />
          </TabsContent>
          <TabsContent value="dictionary" className="mt-3">
            <DataDictionaryTable spec={activeSpec} />
          </TabsContent>
          <TabsContent value="quality" className="mt-3">
            <QualityTab spec={activeSpec} df={df} />
          </TabsContent>
          <TabsContent value="insights" className="mt-3">
            <InsightsTab spec={activeSpec} onOpenModule={openModule} onGoRoadmap={() => setView("roadmap")} />
          </TabsContent>
        </Tabs>
      </section>
    </SectionContainer>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: string; tone: "data" | "stats" | "validated" | "warning" }) {
  return (
    <div className={`rounded-md border border-border bg-card p-3 role-${tone}`}>
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </div>
      <p className="text-mono mt-1 text-lg font-bold text-role">{value}</p>
    </div>
  );
}

function QualityTab({ spec, df }: { spec: DatasetSpec; df: DataFrame }) {
  const issues = spec.knownIssues;
  const nullCount = df.isnaCount();
  const totalNulls = Object.values(nullCount).reduce((a, b) => a + b, 0);
  const dupCount = df.countDuplicates();

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat icon={TriangleAlert} label="Total missing cells" value={totalNulls.toLocaleString()} tone={totalNulls > 0 ? "warning" : "validated"} />
        <Stat icon={TriangleAlert} label="Duplicate rows" value={dupCount.toLocaleString()} tone={dupCount > 0 ? "warning" : "validated"} />
        <Stat icon={Columns3} label="Columns with nulls" value={String(Object.values(nullCount).filter((n) => n > 0).length)} tone="data" />
      </div>
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Known issues (documented)</p>
        </div>
        <ul className="divide-y divide-border/50">
          {issues.map((i, idx) => (
            <li key={idx} className="flex items-start gap-2 px-3 py-1.5 text-xs">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-role-warning)]" aria-hidden />
              <span className="text-foreground/80">{i}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function InsightsTab({
  spec,
  onOpenModule,
  onGoRoadmap,
}: {
  spec: DatasetSpec;
  onOpenModule: (id: string) => void;
  onGoRoadmap: () => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Analytical questions</CardTitle>
          <CardDescription>What this dataset can answer.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-1 text-xs">
            {spec.analyticalQuestions.map((q, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-mono text-muted-foreground">{i + 1}.</span>
                <span className="text-foreground/80">{q}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Feature-engineering opportunities</CardTitle>
          <CardDescription>Where to create new features — and the assumptions to validate.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-1 text-xs">
            {spec.featureOpportunities.map((q, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-mono text-muted-foreground">{i + 1}.</span>
                <span className="text-foreground/80">{q}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Limitations</CardTitle>
          <CardDescription>What this dataset does NOT tell you.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-1 text-xs">
            {spec.limitations.map((q, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-mono text-muted-foreground">{i + 1}.</span>
                <span className="text-foreground/80">{q}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Next steps</CardTitle>
          <CardDescription>Where to take this dataset next.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenModule("dataset-exploration")}>
            Open Module 1 — Dataset Exploration →
          </Button>
          <Button variant="outline" size="sm" onClick={() => onOpenModule("data-quality")}>
            Open Module 2 — Data Quality →
          </Button>
          <Button variant="ghost" size="sm" onClick={onGoRoadmap}>
            See the full roadmap
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
