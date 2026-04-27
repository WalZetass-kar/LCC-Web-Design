import type { Config } from 'drizzle-kit'

export default {
  schema: './src/database/schema.ts',
  out: './drizzle',
  driver: 'better-sqlite',
  dbCredentials: {
    url: './sistem_pos.db',
  },
} satisfies Config
