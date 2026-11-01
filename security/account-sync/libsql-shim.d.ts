declare module "@libsql/client" {
  export function createClient(opts: {
    url: string;
    authToken?: string;
  }): {
    execute: (stmt: { sql: string; args?: unknown[] }) => Promise<{
      rows: Record<string, unknown>[];
    }>;
  };
}