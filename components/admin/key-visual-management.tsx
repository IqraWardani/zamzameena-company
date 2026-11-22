"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useRef,
  useState,
  useEffect,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  deleteEventKeyVisual,
  uploadEventKeyVisual,
  type KeyVisualActionState,
} from "@/app/admin/key-visual/actions";
import {
  isSupportedKeyVisualMetadata,
  MAX_KEY_VISUAL_BYTES,
  MAX_KEY_VISUAL_RESOLUTION_LABEL,
} from "@/lib/key-visual/validation";

export type KeyVisualItem = {
  id: string;
  originalFilename: string;
  contentType: string;
  byteSize: number;
  url: string;
  isActive: boolean;
  createdAt: string;
  deletedAt: string | null;
};

function formatBytes(bytes: number): string {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 1,
  }).format(bytes / 1024) + " KB";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Makassar",
  }).format(new Date(value));
}

function statusLabel(item: KeyVisualItem): string {
  if (item.deletedAt) return "Dihapus";
  return item.isActive ? "Aktif" : "Riwayat";
}

export function KeyVisualManagement({
  eventId,
  activeVisual,
  history,
}: {
  eventId: string;
  activeVisual: KeyVisualItem | null;
  history: KeyVisualItem[];
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<KeyVisualActionState>({});
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;
    setFeedback({});
    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }
    if (!isSupportedKeyVisualMetadata(file.name, file.type)) {
      setFeedback({ error: "Pilih file PNG, JPG, atau WEBP yang valid." });
      event.currentTarget.value = "";
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }
    if (!file.size || file.size > MAX_KEY_VISUAL_BYTES) {
      setFeedback({ error: "Ukuran file harus 1 byte hingga 8 MB." });
      event.currentTarget.value = "";
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
    setSelectedFile(file);
  }

  function cancelSelection() {
    setSelectedFile(null);
    setPreviewUrl(null);
    setFeedback({});
    if (fileInput.current) fileInput.current.value = "";
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile || inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setFeedback({});
    const data = new FormData();
    data.set("keyVisual", selectedFile, selectedFile.name);
    data.set("keyVisualFilename", selectedFile.name);
    try {
      const result = await uploadEventKeyVisual(eventId, data);
      setFeedback(result);
      if (result.message && !result.error) {
        cancelSelection();
      }
    } catch {
      setFeedback({
        error: "Upload gagal diproses. File tetap dipilih; periksa koneksi lalu coba kembali.",
      });
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  async function handleDelete(item: KeyVisualItem) {
    const confirmation = window.confirm(
      `Hapus Key Visual "${item.originalFilename}"? File ini tidak lagi tersedia di website.`,
    );
    if (!confirmation || inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setFeedback({});
    try {
      const result = await deleteEventKeyVisual(eventId, item.id);
      setFeedback(result);
      router.refresh();
    } catch {
      setFeedback({ error: "Key Visual belum berhasil dihapus. Silakan coba kembali." });
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <div className="zas-key-visual-management">
      <section aria-labelledby="active-key-visual-heading" className="zas-key-visual-active">
        <div className="zas-key-visual-section-heading">
          <div>
            <p className="zas-admin-eyebrow">KEY VISUAL SAAT INI</p>
            <h2 id="active-key-visual-heading">Key Visual aktif</h2>
          </div>
          {activeVisual && <span className="zas-admin-status is-published">Aktif</span>}
        </div>
        {activeVisual ? (
          <div className="zas-key-visual-current">
            <div className="zas-key-visual-image">
              <Image
                alt={`Key Visual aktif ${activeVisual.originalFilename}`}
                height={600}
                src={activeVisual.url}
                unoptimized
                width={1000}
              />
            </div>
            <dl className="zas-admin-details">
              <div><dt>Nama file</dt><dd>{activeVisual.originalFilename}</dd></div>
              <div><dt>Ukuran</dt><dd>{formatBytes(activeVisual.byteSize)}</dd></div>
              <div><dt>Diunggah</dt><dd>{formatDate(activeVisual.createdAt)} WITA</dd></div>
            </dl>
            <button
              className="zas-admin-danger-button"
              disabled={pending}
              onClick={() => handleDelete(activeVisual)}
              type="button"
            >
              Hapus Key Visual
            </button>
          </div>
        ) : (
          <div className="zas-key-visual-empty">
            <p>Belum ada Key Visual aktif untuk event ini.</p>
          </div>
        )}
      </section>

      <section aria-labelledby="upload-key-visual-heading" className="zas-key-visual-upload">
        <p className="zas-admin-eyebrow">ASSET BARU</p>
        <h2 id="upload-key-visual-heading">Upload Key Visual baru</h2>
        <p className="zas-key-visual-upload-description">
          Format PNG, JPG, JPEG, atau WEBP · Maksimal 8 MB · Resolusi maksimal {MAX_KEY_VISUAL_RESOLUTION_LABEL}. Key Visual aktif tidak berubah jika upload gagal.
        </p>
        {feedback.error && <p className="zas-key-visual-feedback is-error" role="alert">{feedback.error}</p>}
        {feedback.message && <p className="zas-key-visual-feedback" role="status">{feedback.message}</p>}
        <form onSubmit={handleUpload}>
          <label className="zas-key-visual-file-label" htmlFor="key-visual-file">Pilih gambar</label>
          <input
            accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
            disabled={pending}
            id="key-visual-file"
            onChange={chooseFile}
            ref={fileInput}
            type="file"
          />
          {selectedFile && (
            <div className="zas-key-visual-selected">
              {previewUrl && (
                <div className="zas-key-visual-image is-preview">
                  <Image
                    alt="Pratinjau Key Visual yang dipilih"
                    height={600}
                    src={previewUrl}
                    unoptimized
                    width={1000}
                  />
                </div>
              )}
              <p>
                <strong>{selectedFile.name}</strong>
                <span>{formatBytes(selectedFile.size)} · Siap diunggah</span>
              </p>
            </div>
          )}
          <div className="zas-key-visual-actions">
            <button className="zas-admin-primary-link" disabled={!selectedFile || pending} type="submit">
              {pending ? "Mengunggah..." : "Upload dan Aktifkan"}
            </button>
            <button className="zas-admin-secondary-button" disabled={!selectedFile || pending} onClick={cancelSelection} type="button">
              Cancel
            </button>
          </div>
        </form>
      </section>

      <section aria-labelledby="key-visual-history-heading" className="zas-key-visual-history">
        <div className="zas-key-visual-section-heading">
          <div>
            <p className="zas-admin-eyebrow">ASSET ARCHIVE</p>
            <h2 id="key-visual-history-heading">Riwayat Key Visual</h2>
          </div>
          <span>{history.length} file</span>
        </div>
        {history.length === 0 ? (
          <p>Belum ada riwayat upload.</p>
        ) : (
          <div className="zas-key-visual-history-list">
            {history.map((item) => (
              <article className="zas-key-visual-history-item" key={item.id}>
                <div>
                  <strong>{item.originalFilename}</strong>
                  <p>{formatBytes(item.byteSize)} · {formatDate(item.createdAt)} WITA</p>
                </div>
                <span className={item.isActive ? "is-active" : item.deletedAt ? "is-deleted" : ""}>
                  {statusLabel(item)}
                </span>
                {!item.deletedAt && (
                  <button
                    className="zas-admin-danger-button"
                    disabled={pending}
                    onClick={() => handleDelete(item)}
                    type="button"
                  >
                    Hapus
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
