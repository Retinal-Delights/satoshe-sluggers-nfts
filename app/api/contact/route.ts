import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

// SECURITY: No fallbacks - fail hard if env var missing
const RESEND_API_KEY = process.env.RESEND_API_KEY;
if (!RESEND_API_KEY) {
  // This route is disabled, but if enabled, it should fail without API key
  throw new Error("SECURITY ERROR: Missing RESEND_API_KEY environment variable. No fallbacks allowed.");
}
const resend = new Resend(RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { name, email, subject, message } = await request.json()

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      // SECURITY: No fallbacks - require env vars
      from: (() => {
        const domain = process.env.EMAIL_DOMAIN;
        if (!domain) throw new Error("SECURITY ERROR: Missing EMAIL_DOMAIN environment variable. No fallbacks allowed.");
        return `Satoshe Sluggers <noreply@${domain}>`;
      })(),
      to: (() => {
        const email = process.env.CONTACT_EMAIL;
        if (!email) throw new Error("SECURITY ERROR: Missing CONTACT_EMAIL environment variable. No fallbacks allowed.");
        return [email];
      })(),
      subject: `Contact Form: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #FF0099; border-bottom: 2px solid #FF0099; padding-bottom: 10px;">
            New Contact Form Submission
          </h2>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Contact Details</h3>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
          </div>
          
          <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h3 style="color: #333; margin-top: 0;">Message</h3>
            <p style="white-space: pre-wrap; line-height: 1.6;">${message}</p>
          </div>
          
          <div style="margin-top: 20px; padding: 15px; background-color: #e9ecef; border-radius: 8px; font-size: 14px; color: #666;">
            <p><strong>Sent from:</strong> Satoshe Sluggers Contact Form</p>
            <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
          </div>
        </div>
      `,
    })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Email sent successfully', id: data?.id },
      { status: 200 }
    )

  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

