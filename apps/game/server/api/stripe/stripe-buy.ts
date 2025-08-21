import { stripe } from "@/server/utils/stripe";
import { getServerSession } from "#auth";
import { db, eq, getTableColumns } from "@package/database";
import { getTableColumnsExcept } from "@package/database/helpers";
export default defineEventHandler(async (event) => {
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
  const account = await getAccountInfo(session.user.email);
  if (!account?.stripe_customer_id)
    return console.log("No account found for user");

  const { data } = await stripe.prices.list({
    lookup_keys: [lookupKey],
    expand: ["data.product"],
  });
  if (!data?.[0]?.unit_amount) return;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: data[0].unit_amount,
      currency: data[0].currency,
      customer: account.stripe_customer_id,

      metadata: {
        lookupKey,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });
    if (!paymentIntent.client_secret) throw new Error("No client secret found");
    return { secret: paymentIntent.client_secret };
  } catch (err) {
    console.log("Error", err);
    throw createError({
      statusCode: 500,
      statusMessage: (err as Error).message,
    });
  }
});

async function getAccountInfo(email: string) {
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
    .where(eq(db.table.users.email, email))
    .limit(1);
  return account;
}
