import { useEffect, useRef, useState } from 'react';
import {
  Plus, Trash2, FileText, Wand2, Upload, Loader2, File as FileIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { workflowsApi } from '@/lib/workflowsApi';

interface UploadedSop {
  url: string;
  name: string;
  size: number;
}

const ACCEPTED_SOP_TYPES = '.pdf,.docx,.doc,.xlsx,.xls,.html,.htm';

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

interface AddSopsDialogProps {
  open: boolean;
  busy: boolean;
  /** Pre-check the auto-build toggle when the workflow was auto-built. */
  defaultAutoBuild: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (urls: string[], autoBuild: boolean) => void;
}

export default function AddSopsDialog({
  open,
  busy,
  defaultAutoBuild,
  onOpenChange,
  onAdd,
}: AddSopsDialogProps) {
  const [urls, setUrls] = useState<string[]>(['']);
  const [autoBuild, setAutoBuild] = useState(defaultAutoBuild);
  const [uploads, setUploads] = useState<UploadedSop[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setUrls(['']);
      setAutoBuild(defaultAutoBuild);
      setUploads([]);
      setUploadError(null);
    }
  }, [open, defaultAutoBuild]);

  const pushUrl = () => setUrls((u) => [...u, '']);
  const removeUrl = (i: number) => setUrls((u) => u.filter((_, idx) => idx !== i));
  const updateUrl = (i: number, v: string) =>
    setUrls((u) => u.map((x, idx) => (idx === i ? v : x)));

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setUploading(true);
    try {
      const done: UploadedSop[] = [];
      for (const file of Array.from(files)) {
        done.push(await workflowsApi.uploadSopDocument(file));
      }
      setUploads((u) => [...u, ...done]);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Upload failed. Please try again.',
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeUpload = (i: number) =>
    setUploads((u) => u.filter((_, idx) => idx !== i));

  const cleanUrls = [
    ...urls.map((u) => u.trim()).filter(Boolean),
    ...uploads.map((u) => u.url),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Add SOP Documents
          </DialogTitle>
          <DialogDescription>
            Attach SOP links or upload PDFs/documents to this workflow. Each is
            crawled and ingested; the workflow can hold any number of SOPs, and
            a PDF builds the same step-by-step canvas as an HTML link.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {urls.map((url, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={url}
                onChange={(e) => updateUrl(i, e.target.value)}
                placeholder="https://example.com/sop.html"
                className="text-sm"
                autoFocus={i === 0}
              />
              {urls.length > 1 && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => removeUrl(i)}
                  className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}

          <Button type="button" size="sm" variant="outline" onClick={pushUrl}>
            <Plus className="h-3 w-3 mr-1" /> Add another link
          </Button>

          <label
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFiles(e.dataTransfer.files);
            }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-3 py-5 transition-colors ${
              dragOver
                ? 'border-primary bg-primary/10'
                : 'border-primary/40 bg-primary/5 hover:bg-primary/10'
            }`}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : (
              <Upload className="h-5 w-5 text-primary" />
            )}
            <span className="text-xs font-medium">
              {uploading ? 'Uploading…' : 'Upload SOP files'}
            </span>
            <span className="text-[11px] text-muted-foreground">
              Drag &amp; drop or click — PDF, DOCX, XLSX, HTML
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_SOP_TYPES}
              multiple
              className="sr-only"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>

          {uploads.length > 0 && (
            <div className="space-y-1.5">
              {uploads.map((u, i) => (
                <div
                  key={u.url}
                  className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-1.5"
                >
                  <FileIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="flex-1 truncate text-sm" title={u.name}>
                    {u.name}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {formatBytes(u.size)}
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeUpload(i)}
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          {uploadError && (
            <p className="text-[11px] text-destructive">{uploadError}</p>
          )}

          <label className="mt-2 flex cursor-pointer items-start gap-2.5 rounded-md border border-border bg-muted/30 p-3">
            <input
              type="checkbox"
              checked={autoBuild}
              onChange={(e) => setAutoBuild(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
            />
            <span className="space-y-0.5">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <Wand2 className="h-3.5 w-3.5 text-primary" />
                Auto-build nodes from these SOPs
              </span>
              <span className="block text-[11px] text-muted-foreground">
                When ingestion finishes the canvas is rebuilt with one column
                per SOP — every step becomes a node with its rules attached.
                Note: a rebuild regenerates the auto-built nodes.
              </span>
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={() => onAdd(cleanUrls, autoBuild)}
            disabled={busy || cleanUrls.length === 0}
          >
            {busy
              ? 'Adding…'
              : `Ingest ${cleanUrls.length || ''} SOP${cleanUrls.length === 1 ? '' : 's'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
