export async function onRequestPost(context) {
  const { request } = context;

  try {
    const formData = await request.json();

    // Validate required fields
    const required = ['name', 'email', 'business', 'tier', 'message'];
    for (const field of required) {
      if (!formData[field]) {
        return new Response(
          JSON.stringify({ error: `Missing required field: ${field}` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Send via Web3Forms
    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        access_key: 'b7df6803-08d0-4d32-b31b-e58108092f3f',
        subject: `New GEO Inquiry from ${formData.name}`,
        from_name: 'genaiqueen.com',
        name: formData.name,
        email: formData.email,
        business: formData.business,
        tier: formData.tier,
        message: formData.message,
      }),
    });

    const result = await response.json();

    if (result.success) {
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Failed to send' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Form error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
