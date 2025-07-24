import { initTRPC, TRPCError } from "@trpc/server";
import type { H3Event } from "h3";
import superjson from "superjson";
import { getServerSession } from "#auth";

export const createTRPCContext = async (event: H3Event) => {
	/**
	 * @see: https://trpc.io/docs/server/context
	 */
	const session = await getServerSession(event);
	return { session, event };
};

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
const t = initTRPC.context<Context>().create({
	transformer: superjson,
});

// Base router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;
export const authProcedure = t.procedure.use((options) => {
	if (!options?.ctx?.session?.user)
		throw new TRPCError({ code: "UNAUTHORIZED", message: "U#1:401" });
	return options.next(options);
});

export const protectedProcedure = t.procedure.use((options) => {
	if (options?.ctx?.session?.user)
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "U#1:ALREADY_LOGGED",
		});
	return options.next(options);
});
