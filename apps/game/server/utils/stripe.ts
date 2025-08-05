import Stripe from "stripe";

export default Stripe;
export const stripe = new Stripe(useRuntimeConfig().STRIPE_SECRET_KEY);
