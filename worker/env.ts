export interface Env {
  HYPERDRIVE: Hyperdrive;
  IMAGES: R2Bucket;
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  EMAIL_FROM?: string;
  RESEND_API_KEY?: string;
  LOCAL_EMAIL_ENDPOINT?: string;
}
