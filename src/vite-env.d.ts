/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_BACKEND_URL: string
  readonly VITE_CLERK_PUBLISHABLE_KEY: string
  readonly VITE_UNLIMITED_DEMO_EMAILS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}