import { stripe } from "@/server/utils/stripe";
import { getServerSession } from "#auth";
import { db, eq, getTableColumns } from "@package/database";
import { getTableColumnsExcept } from "@package/database/helpers";

export default eventHandler(async (event) => {
  const { lookupKey } = await readBody(event);

  const authSession = await getServerSession(event);
  if (!(authSession && authSession.user.email))
    return sendError(
      event,
      createError({
        statusCode: 400,
        statusMessage: "Bad Request",
        message: "You must be logged in to create a checkout session.",
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
    .where(eq(db.table.users.email, authSession.user.email))
    .limit(1);

  if (account && account.stripe_customer_id && !account.is_subscribed) {
    const prices = await stripe.prices.list({
      lookup_keys: [lookupKey],
      expand: ["data.product"],
    });

    const paymentSession = await stripe.checkout.sessions.create({
      customer: account.stripe_customer_id,
      billing_address_collection: "auto",
      line_items: [
        {
          price: prices.data[0].id,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${useRuntimeConfig().public.NUXT_BASE_URL}/payment/refresh`,
      cancel_url: `${useRuntimeConfig().public.NUXT_BASE_URL}/payment/fail`,
    });
    if (paymentSession.url) {
      return {
        url: paymentSession.url,
      };
    }
  }

  return {
    url: null,
  };
});
