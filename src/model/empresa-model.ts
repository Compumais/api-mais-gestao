import * as schema from "../../drizzle/schema";

export type Empresa = typeof schema.empresa.$inferSelect;
