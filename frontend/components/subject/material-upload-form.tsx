"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { uploadSubjectMaterial, createMaterialGroup } from "@/app/actions/contributions";
import { WelcomeDisplayNameModal } from "@/components/layout/welcome-display-name-modal";
import { FolderPlus, Info, Loader2 } from "lucide-react";
import Link from "next/link";

interface MaterialUploadFormProps {
  subjectId: string;
  subjectName?: string;
  hasPublicProfileIdentity: boolean;
  initialDisplayName: string;
  initialFaculty: string | null;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

export function MaterialUploadForm({
  subjectId,
  subjectName,
  hasPublicProfileIdentity: initialHasPublicProfileIdentity,
  initialDisplayName,
  initialFaculty,
}: MaterialUploadFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [pageCount, setPageCount] = useState<string>("");
  const [isGroup, setIsGroup] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasPublicProfileIdentity, setHasPublicProfileIdentity] = useState(initialHasPublicProfileIdentity);
  const [showDisplayNameModal, setShowDisplayNameModal] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.type !== "application/pdf") {
      setError("Povoleny jsou pouze PDF soubory.");
      setFile(null);
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`Soubor je příliš velký (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB). Maximální povolená velikost je 2 MB.`);
      setFile(null);
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setFile(selectedFile);
    if (!title) {
      setTitle(selectedFile.name.replace(/\.pdf$/i, "").replace(/[-_]/g, " "));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) return;
    if (!hasPublicProfileIdentity) {
      setShowDisplayNameModal(true);
      return;
    }

    if (isGroup && !groupTitle.trim()) {
      setError("Zadej název skupiny.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      let groupId: string | null = null;

      // Create group first if needed
      if (isGroup) {
        const groupResult = await createMaterialGroup({
          title: groupTitle.trim(),
          subjectId,
        });
        if (!groupResult.success) {
          setError(groupResult.error);
          setIsUploading(false);
          return;
        }
        groupId = groupResult.groupId;
      }

      const formData = new FormData();
      formData.set("subjectId", subjectId);
      formData.set("title", title.trim());
      formData.set("file", file);
      if (groupId) formData.set("groupId", groupId);
      if (pageCount) formData.set("pageCount", pageCount);

      const result = await uploadSubjectMaterial(formData);
      if (!result.success) {
        throw new Error(result.error);
      }

      setIsOpen(false);
      setFile(null);
      setTitle("");
      setPageCount("");
      setIsGroup(false);
      setGroupTitle("");
      setSuccessMessage("Materiál byl nahrán a čeká na schválení moderátorem. Stav uvidíš v Mojí aktivitě.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nastala neočekávaná chyba.");
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setIsOpen(true)}
          className="w-full py-4 px-4 rounded-[1.5rem] border-2 border-dashed border-white/10 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-muted/30 transition-all flex flex-col items-center justify-center gap-2"
        >
          <span className="text-xl">📄</span>
          <span className="text-sm font-medium">Nahrát studijní materiál (PDF)</span>
        </button>
        {successMessage && (
          <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
            {successMessage}
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="p-6 rounded-[2rem] border border-white/5 bg-card/40 backdrop-blur-md shadow-sm space-y-5">
        <div className="flex justify-between items-center border-b border-white/5 pb-4">
          <h3 className="font-semibold">Nahrát nový materiál</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="text-muted-foreground hover:text-foreground text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Red disclaimer */}
        <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-3.5 space-y-1.5">
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">⚠️ Materiály jsou moderované</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Vyhni se AI slopu a odfláknutým materiálům. Takové vracíme ke kontrole.</li>
            <li>Radši nahraj víc stran pohromadě než několik drobných PDF zvlášť.</li>
            <li>XP se počítají přímo z bodů: 1 bod = 10 XP, 2 body = 20 XP, 3 body = 30 XP a 4 body = 40 XP.</li>
          </ul>
          <Link href="/jak-to-funguje" target="_blank" className="text-xs text-primary hover:underline inline-block mt-0.5">
            Jak fungují body? →
          </Link>
        </div>

        <form onSubmit={handleUpload} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Název materiálu
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="např. Výpisky ke zkoušce"
              required
              className="w-full rounded-xl border border-white/5 bg-muted/30 shadow-inner px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-primary/50 focus:bg-background transition-all"
            />
          </div>

          {/* Page count */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
              Počet stránek dokumentu
              <span className="text-xs text-muted-foreground font-normal">(ovlivňuje přidělené body)</span>
            </label>
            <input
              type="number"
              min="1"
              max="9999"
              value={pageCount}
              onChange={(e) => setPageCount(e.target.value)}
              placeholder="např. 42"
              className="w-32 rounded-xl border border-white/5 bg-muted/30 shadow-inner px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-primary/50 focus:bg-background transition-all"
            />
          </div>

          {/* File */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              PDF Soubor <span className="text-xs text-muted-foreground font-normal">(max 2 MB)</span>
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              required
              className="block w-full text-sm text-muted-foreground
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-primary/10 file:text-primary
                hover:file:bg-primary/20 file:cursor-pointer file:transition-colors
                cursor-pointer border border-white/5 rounded-xl shadow-inner bg-muted/30 p-2"
            />
          </div>

          {/* Group toggle */}
          <div className="rounded-2xl border border-white/5 bg-background/50 shadow-sm p-4 space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isGroup}
                onChange={(e) => setIsGroup(e.target.checked)}
                className="w-4 h-4 rounded accent-amber-500"
              />
              <FolderPlus className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium">Přidat jako skupinu materiálů</span>
            </label>
            {isGroup && (
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Název skupiny</label>
                <input
                  type="text"
                  value={groupTitle}
                  onChange={(e) => setGroupTitle(e.target.value)}
                  placeholder={`např. ${subjectName ? subjectName + " — vše ke zkoušce" : "Statistika — vše ke státnicím"}`}
                  maxLength={120}
                  className="w-full rounded-xl border border-white/5 bg-muted/30 shadow-inner px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-amber-500/50 focus:bg-background transition-all"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Další soubory do skupiny přidáš postupně přes &quot;Nahrát další do skupiny&quot;
                </p>
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive font-medium bg-destructive/10 p-2 rounded">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Zrušit
            </button>
            <button
              type="submit"
              disabled={!file || !title || isUploading}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:opacity-90 flex items-center gap-2"
            >
              {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isUploading ? "Nahrávám..." : isGroup ? "Nahrát a vytvořit skupinu" : "Nahrát soubor"}
            </button>
          </div>
        </form>
      </div>

      <WelcomeDisplayNameModal
        open={showDisplayNameModal}
        onOpenChange={setShowDisplayNameModal}
        initialDisplayName={initialDisplayName}
        initialFaculty={initialFaculty}
        onCompleted={() => {
          setHasPublicProfileIdentity(true);
        }}
      />
    </>
  );
}
