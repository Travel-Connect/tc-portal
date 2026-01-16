// Supabase Storage utility functions

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

/**
 * Get public URL for a file in Supabase Storage
 * @param bucket - Storage bucket name
 * @param path - File path within the bucket
 * @returns Full public URL
 */
export function getStoragePublicUrl(bucket: string, path: string): string {
  if (!SUPABASE_URL) {
    console.error("NEXT_PUBLIC_SUPABASE_URL is not set");
    return "";
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

/**
 * Get public URL for a tool icon
 * @param path - Icon path stored in tools.icon_path
 * @returns Full public URL for the icon
 */
export function getToolIconUrl(path: string): string {
  return getStoragePublicUrl("tool-icons", path);
}
