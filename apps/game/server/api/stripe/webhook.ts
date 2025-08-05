import Stripe, { stripe } from "@/server/utils/stripe";
import { db, eq, sql } from "@package/database";

const runtimeConfig = useRuntimeConfig();

export default eventHandler(async (event) => {
  const body = await readRawBody(event);
  const signature = getHeader(event, "stripe-signature");

  let stripeEvent: Stripe.Event;

  let subscription: Stripe.Subscription;
  let lookupKey: string | null = null;

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
  // console.log("Webhook event received:", stripeEvent.type);
  switch (stripeEvent.type) {
    // case "charge.succeeded": // This event will always be triggered when a charge is succesfully
    //   const charge = stripeEvent.data.object as Stripe.Charge;
    //   const customerId = charge.customer as string;
    //   lookupKey = charge.metadata.lookupKey || null;

    //   if (!customerId || !lookupKey)
    //     return console.error("No customer ID or lookup key found in charge");

    //   await db
    //     .update(db.table.users_auth)
    //     .set({
    //       is_subscribed: true,
    //       plan: lookupKey,
    //     })
    //     .where(eq(db.table.users_auth.stripe_customer_id, customerId));

    //   break;

    case "customer.subscription.created": // Will be triggered when created using stripe checkout session
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
          eq(
            db.table.users_auth.stripe_customer_id,
            subscription.customer as string
          )
        );

      break;
    case "customer.subscription.deleted":
      subscription = stripeEvent.data.object;
      console.log("Subscription deleted:", subscription.customer);
      const userId = await db
        .update(db.table.users_auth)
        .set({
          is_subscribed: false,
          plan: sql`NULL`,
        })
        .where(
          eq(
            db.table.users_auth.stripe_customer_id,
            subscription.customer as string
          )
        )
        .returning({
          user_id: db.table.users_auth.user_id,
        });

      console.log(`User with ID ${userId} subscription deleted`);
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
          eq(
            db.table.users_auth.stripe_customer_id,
            subscription.customer as string
          )
        );

      break;

    default:
  }
});
