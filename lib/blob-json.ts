import "server-only";

import { get, put, type PutBlobResult } from "@vercel/blob";

export interface BlobJson<T> {
  value: T;
  etag: string;
  pathname: string;
}

export async function readBlobJson<T>(pathname: string, useCache = false): Promise<BlobJson<T> | null> {
  const result = await get(pathname, { access: "private", useCache });
  if (!result || result.statusCode !== 200) return null;
  const value = (await new Response(result.stream).json()) as T;
  return { value, etag: result.blob.etag, pathname: result.blob.pathname };
}

export function putImmutableJson(pathname: string, value: unknown): Promise<PutBlobResult> {
  return put(pathname, JSON.stringify(value), {
    access: "private",
    addRandomSuffix: false,
    contentType: "application/json",
    cacheControlMaxAge: 31_536_000,
  });
}

export function putMutableJson(pathname: string, value: unknown, ifMatch?: string): Promise<PutBlobResult> {
  return put(pathname, JSON.stringify(value), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: Boolean(ifMatch),
    ifMatch,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
}

export function overwriteJson(pathname: string, value: unknown): Promise<PutBlobResult> {
  return put(pathname, JSON.stringify(value), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
}
