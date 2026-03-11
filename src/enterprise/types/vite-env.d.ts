/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_ENTERPRISE_API_URL: string
  readonly VITE_PMS_API_URL: string
  readonly VITE_ENABLE_MOCK: string
  readonly VITE_LOG_LEVEL: string
  readonly DEV: boolean
  readonly PROD: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
