declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    GITHUB_TOKEN?: string;
    BUCKET?: R2Bucket;
  }
}
