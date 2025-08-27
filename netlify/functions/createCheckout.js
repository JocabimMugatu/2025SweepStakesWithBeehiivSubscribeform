/**
 * Serverless function to create a Stripe Checkout Session.
 *
 * This function expects a JSON body with an `items` array. Each item must
 * include a `name` field (description of the purchase), a `price` field
 * specifying the cost in cents (e.g., 499 for $4.99), and an optional
 * `quantity` field (defaults to 1). It will build the line_items array
 * accordingly and generate a Checkout Session using Stripe's API.
 *
 * To use this function you must define the following environment variables
 * within Netlify:
 *
 *   - STRIPE_SECRET_KEY: Your Stripe secret API key (sk_...)
 *   - SUCCESS_URL: The URL users are redirected to after a successful payment
 *   - CANCEL_URL: The URL users are redirected to if they cancel the checkout
 *
 * Add these variables via the Netlify UI or the Netlify CLI, and never
 * commit your secret key to source control.
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { items } = JSON.parse(event.body || '{}');
    if (!Array.isArray(items)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid payload: items must be an array' }),
      };
    }
    // Map our input items to Stripe's line_items format
    const line_items = items.map((item) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
        },
        // Ensure the price is an integer number of cents
        unit_amount: item.price,
      },
      quantity: item.quantity || 1,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: process.env.SUCCESS_URL || 'https://example.com/success',
      cancel_url: process.env.CANCEL_URL || 'https://example.com/cancel',
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
