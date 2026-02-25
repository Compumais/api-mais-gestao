import * as schema from "../../drizzle/schema.js";

export type Empresa = typeof schema.empresa.$inferSelect;
