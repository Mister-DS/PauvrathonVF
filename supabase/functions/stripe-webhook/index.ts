import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // Use service role key to bypass RLS
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    
    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    
    if (!signature) {
      throw new Error("No Stripe signature found");
    }

    let event: Stripe.Event;
    
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      logStep("Webhook signature verification failed", { error: err.message });
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    logStep("Processing webhook event", { type: event.type });

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        logStep("Processing subscription event", { 
          subscriptionId: subscription.id, 
          status: subscription.status,
          customerId 
        });

        // Get customer details
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        if (!customer.email) {
          logStep("Customer has no email, skipping");
          break;
        }

        // Find user by email
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('user_id')
          .eq('twitch_username', customer.email)
          .maybeSingle();

        if (!profile) {
          logStep("No user profile found for customer email", { email: customer.email });
          break;
        }

        const isActive = subscription.status === 'active';
        const subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();

        // Update subscriber record
        await supabaseClient.from("subscribers").upsert({
          user_id: profile.user_id,
          email: customer.email,
          stripe_customer_id: customerId,
          subscribed: isActive,
          subscription_tier: "Premium", // Default tier
          subscription_end: subscriptionEnd,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'email' });

        // Grant or revoke badge based on subscription status
        if (isActive) {
          logStep("Granting monthly badge for active subscription");
          await supabaseClient.rpc('grant_monthly_badge', { p_user_id: profile.user_id });
        } else {
          logStep("Subscription not active, running badge cleanup");
          await supabaseClient.rpc('revoke_expired_badges');
        }

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        logStep("Processing subscription deletion", { subscriptionId: subscription.id });

        // Get customer details
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        if (!customer.email) {
          logStep("Customer has no email, skipping");
          break;
        }

        // Update subscriber record to mark as unsubscribed
        await supabaseClient.from("subscribers").upsert({
          email: customer.email,
          subscribed: false,
          subscription_tier: null,
          subscription_end: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'email' });

        // Revoke all badges
        logStep("Revoking badges for cancelled subscription");
        await supabaseClient.rpc('revoke_expired_badges');

        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        
        if (!subscriptionId) {
          logStep("Invoice not related to subscription, skipping");
          break;
        }

        logStep("Processing successful payment", { invoiceId: invoice.id });

        // Get subscription and customer details
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
        
        if (!customer.email) {
          logStep("Customer has no email, skipping");
          break;
        }

        // Find user by email
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('user_id')
          .eq('twitch_username', customer.email)
          .maybeSingle();

        if (!profile) {
          logStep("No user profile found for customer email", { email: customer.email });
          break;
        }

        // Grant monthly badge for successful payment
        logStep("Granting monthly badge for successful payment");
        await supabaseClient.rpc('grant_monthly_badge', { p_user_id: profile.user_id });

        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in webhook", { message: errorMessage });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});