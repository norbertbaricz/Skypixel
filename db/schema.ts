import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// One row per GitHub owner: persistent catalog, endpoint ETags, quota and sync lease.
export const catalogState = sqliteTable('catalog_state', {
  owner: text('owner').primaryKey(),
  payload: text('payload'),
  leaseOwner: text('lease_owner'),
  leaseUntil: integer('lease_until').notNull().default(0)
});
