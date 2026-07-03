/**
 * WebCraft Finance - supabaseClient.js
 * Initializes the Supabase client using CDN UMD library.
 * Sanitizes URLs automatically.
 * Runs directly in browser via file:// (no ES module CORS issues).
 */
(function() {
  let supabaseUrl = 'https://qldhrvwgqleyoicdugcw.supabase.co/rest/v1/';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsZGhydndncWxleW9pY2R1Z2N3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2ODM5ODUsImV4cCI6MjA5ODI1OTk4NX0.LYteGh6Zf-U9NSmHujsWxtbK_rZ23lcFuQ4au5FtEwU';

  // Sanitize the URL by removing '/rest/v1/' suffix if present
  if (supabaseUrl.endsWith('/rest/v1/')) {
    supabaseUrl = supabaseUrl.slice(0, -9);
  } else if (supabaseUrl.endsWith('/rest/v1')) {
    supabaseUrl = supabaseUrl.slice(0, -8);
  }

  // Initialize the Supabase Client
  if (typeof supabase === 'undefined') {
    console.error("Supabase CDN library not loaded yet. Make sure it is included in index.html before this script.");
  } else {
    window.SupabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
  }
})();
