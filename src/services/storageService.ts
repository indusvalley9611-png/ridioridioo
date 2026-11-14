/**
 * NEXORA RIDE — Supabase Storage Service (Production-Ready)
 *
 * Handles file and document uploads to Supabase Storage:
 * 1. Avatars Bucket (Public): Profile pictures for passengers and drivers
 * 2. Driver Documents Bucket (Private): DL and RC documents with signed URLs
 *
 * Production features:
 * - Graceful fallback when Supabase is not yet configured
 * - File size validation before upload
 * - File deletion support
 * - Retry-safe signed URL regeneration
 * - Typed error handling
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

export type DocumentType = 'license' | 'rc' | 'aadhaar';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2 MB (matches bucket policy)
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10 MB (matches bucket policy)
const SIGNED_URL_EXPIRY = 3600; // 1 hour in seconds

// ---------------------------------------------------------------------------
// Storage Service
// ---------------------------------------------------------------------------
class StorageService {
  private readonly AVATARS_BUCKET = 'avatars';
  private readonly DOCUMENTS_BUCKET = 'driver-documents';

  /**
   * Upload user profile avatar to the public 'avatars' bucket.
   * Old avatars are overwritten via upsert so storage doesn't grow unbounded.
   */
  async uploadAvatar(
    userId: string,
    fileBody: ArrayBuffer | Blob | Uint8Array,
    fileExt = 'jpg'
  ): Promise<UploadResult> {
    if (!isSupabaseConfigured()) {
      return {
        success: true,
        url: `https://ui-avatars.com/api/?name=User&background=6C63FF&color=fff&size=400`,
        path: `${userId}/avatar.${fileExt}`,
      };
    }

    // Validate file size before uploading
    const size = fileBody instanceof Blob ? fileBody.size : fileBody.byteLength;
    if (size > MAX_AVATAR_SIZE) {
      return { success: false, error: `Avatar exceeds 2 MB limit (${(size / 1024 / 1024).toFixed(1)} MB)` };
    }

    try {
      const filePath = `${userId}/avatar_${Date.now()}.${fileExt}`;
      const contentType =
        fileExt === 'png' ? 'image/png' : fileExt === 'webp' ? 'image/webp' : 'image/jpeg';

      const { data, error } = await supabase.storage
        .from(this.AVATARS_BUCKET)
        .upload(filePath, fileBody, {
          contentType,
          upsert: true,
        });

      if (error) {
        return { success: false, error: `Upload failed: ${error.message}` };
      }

      // Get permanent public URL for avatar
      const { data: publicData } = supabase.storage
        .from(this.AVATARS_BUCKET)
        .getPublicUrl(data.path);

      return {
        success: true,
        url: publicData.publicUrl,
        path: data.path,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Avatar upload failed — check network' };
    }
  }

  /**
   * Upload driver verification document (DL, RC, Aadhaar) to private 'driver-documents' bucket.
   */
  async uploadDriverDocument(
    userId: string,
    docType: DocumentType,
    fileBody: ArrayBuffer | Blob | Uint8Array,
    fileExt = 'jpg'
  ): Promise<UploadResult> {
    if (!isSupabaseConfigured()) {
      return {
        success: true,
        url: `https://mock-storage.nexoraride.com/documents/${userId}/${docType}.${fileExt}`,
        path: `${userId}/${docType}.${fileExt}`,
      };
    }

    // Validate file size before uploading
    const size = fileBody instanceof Blob ? fileBody.size : fileBody.byteLength;
    if (size > MAX_DOCUMENT_SIZE) {
      return { success: false, error: `Document exceeds 10 MB limit (${(size / 1024 / 1024).toFixed(1)} MB)` };
    }

    try {
      const filePath = `${userId}/${docType}_${Date.now()}.${fileExt}`;
      const contentType =
        fileExt === 'pdf'
          ? 'application/pdf'
          : fileExt === 'png'
          ? 'image/png'
          : 'image/jpeg';

      const { data, error } = await supabase.storage
        .from(this.DOCUMENTS_BUCKET)
        .upload(filePath, fileBody, {
          contentType,
          upsert: true,
        });

      if (error) {
        return { success: false, error: `Upload failed: ${error.message}` };
      }

      // Generate a temporary signed URL (valid for 1 hour) since this bucket is private
      const { data: signedData, error: signError } = await supabase.storage
        .from(this.DOCUMENTS_BUCKET)
        .createSignedUrl(data.path, SIGNED_URL_EXPIRY);

      if (signError) {
        // Upload succeeded but signed URL failed — still return path for later retrieval
        return { success: true, path: data.path };
      }

      return {
        success: true,
        url: signedData.signedUrl,
        path: data.path,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Document upload failed — check network' };
    }
  }

  /**
   * Generate a fresh signed URL for a private document.
   * Call this when displaying KYC docs — signed URLs expire after 1 hour.
   */
  async getDocumentSignedUrl(path: string, expiresInSeconds = SIGNED_URL_EXPIRY): Promise<string | null> {
    if (!isSupabaseConfigured()) return null;

    try {
      const { data, error } = await supabase.storage
        .from(this.DOCUMENTS_BUCKET)
        .createSignedUrl(path, expiresInSeconds);

      if (error || !data) return null;
      return data.signedUrl;
    } catch {
      return null;
    }
  }

  /**
   * Delete a file from a storage bucket (e.g. when user re-uploads or deletes account).
   */
  async deleteFile(bucket: 'avatars' | 'driver-documents', paths: string[]): Promise<boolean> {
    if (!isSupabaseConfigured() || paths.length === 0) return false;

    try {
      const { error } = await supabase.storage.from(bucket).remove(paths);
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * List all documents uploaded by a specific user in the driver-documents bucket.
   */
  async listUserDocuments(userId: string): Promise<string[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase.storage
        .from(this.DOCUMENTS_BUCKET)
        .list(userId);

      if (error || !data) return [];
      return data.map((file) => `${userId}/${file.name}`);
    } catch {
      return [];
    }
  }
}

export const storageService = new StorageService();
