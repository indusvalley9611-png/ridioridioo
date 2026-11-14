/**
 * NEXORA RIDE — Supabase Storage Service
 *
 * Handles file and document uploads to Supabase Storage:
 * 1. Avatars Bucket (Public): Profile pictures for passengers and drivers
 * 2. Driver Documents Bucket (Private): DL and RC documents with signed URLs
 *
 * Implements graceful fallback when Supabase is not yet configured.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

export type DocumentType = 'license' | 'rc' | 'aadhaar';

class StorageService {
  private readonly AVATARS_BUCKET = 'avatars';
  private readonly DOCUMENTS_BUCKET = 'driver-documents';

  /**
   * Upload user profile avatar to the public 'avatars' bucket
   */
  async uploadAvatar(
    userId: string,
    fileBody: ArrayBuffer | Blob | Uint8Array,
    fileExt = 'jpg'
  ): Promise<UploadResult> {
    if (!isSupabaseConfigured()) {
      return {
        success: true,
        url: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80`,
        path: `${userId}/avatar.${fileExt}`,
      };
    }

    try {
      const filePath = `${userId}/avatar_${Date.now()}.${fileExt}`;
      const contentType = fileExt === 'png' ? 'image/png' : fileExt === 'webp' ? 'image/webp' : 'image/jpeg';

      const { data, error } = await supabase.storage
        .from(this.AVATARS_BUCKET)
        .upload(filePath, fileBody, {
          contentType,
          upsert: true,
        });

      if (error) {
        return { success: false, error: error.message };
      }

      // Get public URL for avatar
      const { data: publicData } = supabase.storage
        .from(this.AVATARS_BUCKET)
        .getPublicUrl(data.path);

      return {
        success: true,
        url: publicData.publicUrl,
        path: data.path,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Avatar upload failed' };
    }
  }

  /**
   * Upload driver verification document (DL, RC) to private 'driver-documents' bucket
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
        return { success: false, error: error.message };
      }

      // Generate a temporary signed URL (valid for 1 hour) since this bucket is private
      const { data: signedData, error: signError } = await supabase.storage
        .from(this.DOCUMENTS_BUCKET)
        .createSignedUrl(data.path, 3600);

      if (signError) {
        return { success: true, path: data.path };
      }

      return {
        success: true,
        url: signedData.signedUrl,
        path: data.path,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Document upload failed' };
    }
  }

  /**
   * Generate a fresh signed URL for a private document
   */
  async getDocumentSignedUrl(path: string, expiresInSeconds = 3600): Promise<string | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }

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
}

export const storageService = new StorageService();
