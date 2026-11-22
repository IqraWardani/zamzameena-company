import "server-only";

import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  deletePrivateObject,
  readLegacyEventKeyVisualObject,
} from "@/lib/payments/storage";

const SUPABASE_OBJECT_PREFIX = "supabase/";

type SupabaseStorageConfig = {
  bucket: string;
  client: SupabaseClient;
};

let storageConfig: SupabaseStorageConfig | undefined;

function getSupabaseStorageConfig(): SupabaseStorageConfig {
  if (storageConfig) return storageConfig;

  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  if (!url || !secretKey || !bucket) {
    const missing = [
      !url && "SUPABASE_URL",
      !secretKey && "SUPABASE_SECRET_KEY",
      !bucket && "SUPABASE_STORAGE_BUCKET",
    ].filter(Boolean);
    throw new Error(`Supabase Key Visual storage is not fully configured: ${missing.join(", ")}.`);
  }

  storageConfig = {
    bucket,
    client: createClient(url, secretKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    }),
  };
  return storageConfig;
}

function isSupabaseObjectKey(key: string): boolean {
  return key.startsWith(SUPABASE_OBJECT_PREFIX);
}

function supabaseObjectPath(key: string): string {
  if (!isSupabaseObjectKey(key)) {
    throw new Error("Invalid Supabase Key Visual object path.");
  }
  return key.slice(SUPABASE_OBJECT_PREFIX.length);
}

export function createEventKeyVisualObjectKey(
  eventId: string,
  contentType: "image/png" | "image/jpeg" | "image/webp",
): string {
  const extension = contentType === "image/jpeg"
    ? "jpg"
    : contentType === "image/png"
      ? "png"
      : "webp";
  return `${SUPABASE_OBJECT_PREFIX}event-key-visuals/${eventId}/${randomUUID()}.${extension}`;
}

export async function uploadEventKeyVisualObject(input: {
  key: string;
  bytes: Uint8Array;
  contentType: "image/png" | "image/jpeg" | "image/webp";
}): Promise<void> {
  const config = getSupabaseStorageConfig();
  const { error } = await config.client.storage
    .from(config.bucket)
    .upload(supabaseObjectPath(input.key), input.bytes, {
      cacheControl: "300",
      contentType: input.contentType,
      upsert: false,
    });
  if (error) throw error;
}

export async function readEventKeyVisualObject(
  key: string,
  maximumBytes: number,
): Promise<Uint8Array> {
  if (!isSupabaseObjectKey(key)) {
    return readLegacyEventKeyVisualObject(key, maximumBytes);
  }

  const config = getSupabaseStorageConfig();
  const { data, error } = await config.client.storage
    .from(config.bucket)
    .download(supabaseObjectPath(key));
  if (error) throw error;
  if (data.size > maximumBytes) {
    throw new Error("Stored Key Visual exceeds the maximum permitted size.");
  }
  return new Uint8Array(await data.arrayBuffer());
}

export async function deleteEventKeyVisualObject(key: string): Promise<void> {
  if (!isSupabaseObjectKey(key)) {
    await deletePrivateObject(key);
    return;
  }

  const config = getSupabaseStorageConfig();
  const { error } = await config.client.storage
    .from(config.bucket)
    .remove([supabaseObjectPath(key)]);
  if (error) throw error;
}
