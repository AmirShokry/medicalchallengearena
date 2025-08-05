import Stripe, { stripe } from "@/server/utils/stripe";
import { getServerSession } from "#auth";
import { db, eq, getTableColumns } from "@package/database";
import { getTableColumnsExcept } from "@package/database/helpers";

export default eventHandler(async (event) => {
  const { lookupKey } = await readBody(event);

  const session = await getServerSession(event);

  if (!session?.user?.email)
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
    .where(eq(db.table.users.email, session.user.email))
    .limit(1);

  let stripe_customer_id: string | null = null;
  let retreviedCustomer: Stripe.Customer | Stripe.DeletedCustomer | null = null;
  if (!account?.stripe_customer_id)
    stripe_customer_id = await createStripeCustomerId(session.user.email);
  else if (account?.stripe_customer_id)
    retreviedCustomer = await stripe.customers.retrieve(
      account.stripe_customer_id
    );

  if (!retreviedCustomer || retreviedCustomer?.deleted || !retreviedCustomer.id)
    stripe_customer_id = await createStripeCustomerId(session.user.email);

  async function createStripeCustomerId(email: string) {
    const customer = await stripe.customers.create({
      email,
    });
    await db
      .update(db.table.users_auth)
      .set({
        stripe_customer_id: customer.id,
      })
      .where(eq(db.table.users_auth.user_id, session?.user.id!));
    return customer.id;
  }

  if (!stripe_customer_id)
    return sendError(
      event,
      createError({
        statusCode: 400,
        statusMessage: "Bad Request",
        message: "Failed to create or retrieve payment customer ID.",
      })
    );

  if (account && !account.is_subscribed && stripe_customer_id) {
    const prices = await stripe.prices.list({
      lookup_keys: [lookupKey],
      expand: ["data.product"],
    });

    const paymentSession = await stripe.checkout.sessions.create({
      customer: stripe_customer_id,
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
