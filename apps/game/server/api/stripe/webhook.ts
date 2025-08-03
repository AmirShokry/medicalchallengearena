import { stripe } from "@/server/utils/stripe";
import { db, eq } from "@package/database";

const runtimeConfig = useRuntimeConfig();

export default eventHandler(async (event) => {
  const body = await readRawBody(event);
  const signature = getHeader(event, "stripe-signature");

  let stripeEvent: any = body;

  let subscription;
  let lookupKey;

  if (!body)
    return createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: "No body provided",
    });

  if (!signature)
    return createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: "No signature provided",
    });

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      body,
      signature,
      runtimeConfig.STRIPE_WEBHOOK_SECRET_KEY
    );
  } catch (err) {
    return createError({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: `Webhook Error: ${err}`,
    });
  }

  switch (stripeEvent.type) {
    case "customer.subscription.created":
      subscription = stripeEvent.data.object;

      // Safely get the lookup key from the first subscription item
      lookupKey = subscription.items?.data?.[0]?.price?.lookup_key;

      if (!lookupKey) {
        console.error("No lookup key found in subscription");
        break;
      }

      await db
        .update(db.table.users_auth)
        .set({
          is_subscribed: true,
          plan: lookupKey,
        })
        .where(
          eq(db.table.users_auth.stripe_customer_id, subscription.customer)
        );

      break;
    case "customer.subscription.deleted":
      subscription = stripeEvent.data.object;
      await db
        .update(db.table.users_auth)
        .set({
          is_subscribed: false,
          plan: null,
        })
        .where(
          eq(db.table.users_auth.stripe_customer_id, subscription.customer)
        );
      break;
    case "customer.subscription.updated":
      subscription = stripeEvent.data.object;

      // Safely get the lookup key from the first subscription item
      lookupKey = subscription.items?.data?.[0]?.price?.lookup_key;

      if (!lookupKey) {
        console.error("No lookup key found in subscription");
        break;
      }

      await db
        .update(db.table.users_auth)
        .set({
          plan: lookupKey,
        })
        .where(
          eq(db.table.users_auth.stripe_customer_id, subscription.customer)
        );

      break;

    default:
  }
});
