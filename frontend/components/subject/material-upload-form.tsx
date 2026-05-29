"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { uploadSubjectMaterial } from "@/app/actions/contributions";

interface MaterialUploadFormProps {
  subjectId: string;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

export function MaterialUploadForm({ subjectId }: MaterialUploadFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.type !== "application/pdf") {
      setError("Povolene jsou pouze PDF soubory.");
      setSuccessMessage(null);
      setFile(null);
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`Soubor je příliš velký (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB). Maximální povolená velikost je 2 MB.`);
      setSuccessMessage(null);
      setFile(null);
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setFile(selectedFile);
    // Autofill title if empty
    if (!title) {
      setTitle(selectedFile.name.replace(/\.pdf$/i, "").replace(/[-_]/g, " "));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) return;

    setIsUploading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.set('subjectId', subjectId);
      formData.set('title', title.trim());
      formData.set('file', file);

      const result = await uploadSubjectMaterial(formData);
      if (!result.success) {
        throw new Error(result.error);
      }

      // Success
      setIsOpen(false);
      setFile(null);
      setTitle("");
      setSuccessMessage("Materiál byl nahrán a teď čeká na schválení moderátorem. Stav uvidíš v Mojí aktivitě.");
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
          className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-foreground hover:bg-muted/30 transition-all flex flex-col items-center justify-center gap-2"
        >
          <span className="text-xl">📄</span>
          <span className="text-sm font-medium">Nahrát studijní materiál (PDF)</span>
        </button>
        {successMessage && (
          <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
            {successMessage}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
      <div className="flex justify-between items-center border-b border-border pb-3">
        <h3 className="font-semibold">Nahrát nový materiál</h3>
        <button 
          onClick={() => setIsOpen(false)}
          className="text-muted-foreground hover:text-foreground text-xl leading-none"
        >
          ×
        </button>
      </div>

      <form onSubmit={handleUpload} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Název materiálu
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="např. Výpisky ke zkoušce (1. část)"
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            PDF Soubor (max 2 MB)
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
              cursor-pointer border border-border rounded-lg bg-background"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive font-medium bg-destructive/10 p-2 rounded">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
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
            {isUploading ? "Nahrávám..." : "Nahrát soubor"}
          </button>
        </div>
      </form>
    </div>
  );
}
