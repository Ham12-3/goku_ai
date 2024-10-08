import { db } from "@/lib/db";
import { userSubscriptions } from "@/lib/db/schema";
import { stripe } from "@/lib/stripe";
import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

const return_url = process.env.NEXT_BASE_URL + "/";

export async function GET() {
  try {
    // Retrieve auth and user information
    const { userId } = auth();
    const user = await currentUser();

    // Ensure user is authenticated
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Query the user subscriptions
    const _userSubscriptions = await db
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.userId, userId));

    // If user has a subscription, create a billing portal session
    if (_userSubscriptions[0]?.stripeCustomerId) {
      const stripeSession = await stripe.billingPortal.sessions.create({
        customer: _userSubscriptions[0].stripeCustomerId,
        return_url,
      });
      return NextResponse.json({ url: stripeSession.url });
    }

    // If no subscription, create a new checkout session for the first subscription
    const stripeSession = await stripe.checkout.sessions.create({
      success_url: return_url,
      cancel_url: return_url,
      payment_method_types: ["card"],
      mode: "subscription",
      billing_address_collection: "auto",
      customer_email: user?.emailAddresses[0]?.emailAddress ?? "",
      line_items: [
        {
          price_data: {
            currency: "GBP",
            product_data: {
              name: "GokuAI Pro",
              description: "Unlimited PDF sessions!",
            },
            unit_amount: 1,
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
      },
    });

    return NextResponse.json({ url: stripeSession.url });
  } catch (error) {
    console.error("Stripe error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
