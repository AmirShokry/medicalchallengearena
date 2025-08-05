import { stripe } from "@/server/utils/stripe";
import { db, eq, getTableColumns } from "@package/database";
import { getTableColumnsExcept } from "@package/database/helpers";
import { getServerSession } from "#auth";

export default eventHandler(async (event) => {
  const session = await getServerSession(event);
  if (!session?.user?.email)
    return sendError(
      event,
      createError({
        statusCode: 400,
        statusMessage: "Bad Request",
        message: "You must be logged in to create a portal session.",
      })
    );

  const [account] = await db
    .select({
      ...getTableColumns(db.table.users),
      ...getTableColumnsExcept(db.table.users_auth, ["password"]),
    })
    .from(db.table.users)
    .innerJoin(
      db.table.users_auth,
      eq(db.table.users.id, db.table.users_auth.user_id)
    )
    .where(eq(db.table.users.email, session.user.email))
    .limit(1);

  if (!account?.stripe_customer_id)
    return sendError(
      event,
      createError({
        statusCode: 400,
        statusMessage: "Bad Request",
        message: "Account doesn't have a stripe customer ID",
      })
    );

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: account.stripe_customer_id,
    return_url: `${useRuntimeConfig().public.NUXT_BASE_URL}/payment/refresh`,
  });

  return {
    url: portalSession.url,
  };
});
