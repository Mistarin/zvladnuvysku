"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { uploadSubjectMaterial, createMaterialGroup } from "@/app/actions/contributions";
import { WelcomeDisplayNameModal } from "@/components/layout/welcome-display-name-modal";
import { FileText, FolderPlus, Info, Loader2, TriangleAlert, X } from "lucide-react";
import Link from "next/link";
import { analyticsEvents, trackEvent } from "@/lib/analytics";

interface MaterialUploadFormProps {
  subjectId: string;
  subjectName?: string;
  hasPublicProfileIdentity: boolean;
  initialDisplayName: string;
  initialFaculty: string | null;
  initialLegalAcceptedAt?: string | null;
  initialLegalAcceptedVersion?: string | null;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

export function MaterialUploadForm({
  subjectId,
  subjectName,
  hasPublicProfileIdentity: initialHasPublicProfileIdentity,
  initialDisplayName,
  initialFaculty,
  initialLegalAcceptedAt = null,
  initialLegalAcceptedVersion = null,
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
      trackEvent(analyticsEvents.uploadMaterial, {
        subject_id: subjectId,
        is_group_upload: isGroup,
        has_page_count: Boolean(pageCount),
      });
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
          className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-4 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/30 hover:text-foreground"
        >
          <FileText className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">Nahrát studijní materiál (PDF)</span>
        </button>
        {successMessage && (
          <p className="rounded-lg bg-[#70C96B]/10 px-3 py-2 text-sm text-[#70C96B]">
            {successMessage}
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5 rounded-lg border border-border bg-card p-6 ">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <h3 className="font-semibold">Nahrát nový materiál</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="text-muted-foreground hover:text-foreground text-xl leading-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Red disclaimer */}
        <div className="space-y-1.5 rounded-xl border border-[#F05D5E]/35 bg-[#F05D5E]/8 p-3.5">
          <p className="flex items-center gap-2 text-sm font-semibold text-[#F05D5E]"><TriangleAlert className="h-4 w-4" />Materiály jsou moderované</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Vyhni se AI slopu a odfláknutým materiálům. Takové vracíme ke kontrole.</li>
            <li>Radši nahraj víc stran pohromadě než několik drobných PDF zvlášť.</li>
            <li>XP se počítají přímo z bodů: 1 bod = 10 XP, 2 body = 20 XP, 3 body = 30 XP a 4 body = 40 XP.</li>
          </ul>
          <Link href="/jak-to-funguje" target="_blank" className="mt-0.5 inline-block text-xs text-primary hover:underline">
            Jak fungují body?
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
              className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none transition-colors focus:bg-background focus:ring-1 focus:ring-primary/50"
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
              className="w-32 rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none transition-colors focus:bg-background focus:ring-1 focus:ring-primary/50"
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
                cursor-pointer rounded-xl border border-border bg-input p-2 "
            />
          </div>

          {/* Group toggle */}
          <div className="space-y-3 rounded-2xl border border-border bg-background/50 p-4 ">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isGroup}
                onChange={(e) => setIsGroup(e.target.checked)}
                className="h-4 w-4 rounded accent-[var(--color-student-accent)]"
              />
              <FolderPlus className="h-4 w-4 text-[#F6B73C]" />
              <span className="text-sm font-medium">Přidat jako skupinu materiálů</span>
            </label>
            {isGroup && (
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Název skupiny</label>
                <input
                  type="text"
                  value={groupTitle}
                  onChange={(e) => setGroupTitle(e.target.value)}
                  placeholder={`např. ${subjectName ? subjectName + " … vše ke zkoušce" : "Statistika … vše ke státnicím"}`}
                  maxLength={120}
                  className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none transition-colors focus:bg-background focus:ring-1 focus:ring-[#F6B73C]/50"
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
            <p className="rounded bg-destructive/10 p-2 text-sm font-medium text-destructive">
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
              className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:opacity-90 flex items-center gap-2"
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
        initialLegalAcceptedAt={initialLegalAcceptedAt}
        initialLegalAcceptedVersion={initialLegalAcceptedVersion}
        onCompleted={() => {
          setHasPublicProfileIdentity(true);
        }}
      />
    </>
  );
}
