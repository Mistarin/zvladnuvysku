"use client";

import { useState, useTransition } from "react";
import { proposeTeacher } from "@/app/ucitele/actions";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Loader2 } from "lucide-react";

interface TeacherProposalDialogProps {
  trigger?: React.ReactNode;
}

const FACULTIES = ["FSS", "FU", "FF", "LF", "PdF", "PřF"];

export function TeacherProposalDialog({ trigger }: TeacherProposalDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    faculty: "FSS",
    department: "",
  });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setFormData((prev) => ({ ...prev, name: newName }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("Jméno je povinné");
      return;
    }

    startTransition(async () => {
      const result = await proposeTeacher(formData);

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setTimeout(() => {
          setIsOpen(false);
          setSuccess(false);
          setFormData({ name: "", faculty: "FSS", department: "" });
        }, 2000);
      }
    });
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 animate-in fade-in" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-card p-6 shadow-lg sm:rounded-xl animate-in fade-in zoom-in-95">
          <div className="flex flex-col space-y-1.5 text-center sm:text-left">
            <Dialog.Title className="text-lg font-semibold leading-none tracking-tight">
              Navrhnout vyučujícího
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              Pokud zde chybí vyučující, můžete ho přidat. Po schválení se ukáže všem.
            </Dialog.Description>
          </div>

          {success ? (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 animate-in zoom-in">
              <div className="w-12 h-12 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xl">
                ✓
              </div>
              <div>
                <p className="font-semibold">Děkujeme za návrh!</p>
                <p className="text-sm text-muted-foreground">Moderátor brzy vyučujícího schválí.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              {error && (
                <div className="p-3 text-sm rounded-md bg-destructive/10 text-destructive border border-destructive/20">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">Jméno s tituly</label>
                <input
                  id="name"
                  value={formData.name}
                  onChange={handleNameChange}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50"
                  placeholder="např. doc. RNDr. Jan Novák, Ph.D."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="faculty" className="text-sm font-medium">Fakulta</label>
                  <select
                    id="faculty"
                    value={formData.faculty}
                    onChange={(e) => setFormData(prev => ({ ...prev, faculty: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50"
                  >
                    {FACULTIES.map(fac => (
                      <option key={fac} value={fac}>{fac}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="department" className="text-sm font-medium">Katedra</label>
                  <input
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50"
                    placeholder="Zkratka nebo název"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium border border-border rounded-md hover:bg-muted transition-colors"
                  >
                    Zrušit
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
                >
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Odeslat návrh
                </button>
              </div>
            </form>
          )}

          <Dialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
            <X className="h-4 w-4" />
            <span className="sr-only">Zavřít</span>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
