import nodemailer from 'nodemailer';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // Check if SMTP config is present
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('Gmail SMTP credentials are not configured');
      return NextResponse.json({
        error: 'Email service not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD in environment variables.'
      }, { status: 500 });
    }

    const {
      recipientEmail,
      recipientName,
      documentId,
      documentTitle,
      inviterName,
      role
    } = await req.json();

    console.log('Sending email to:', recipientEmail);

    const documentUrl = `${process.env.NEXT_PUBLIC_APP_URL}/documents/${documentId}`;

    const roleText = role === 'viewer' ? 'view' : role === 'commenter' ? 'comment on' : 'edit';
    const roleColor = role === 'viewer' ? '#6B7280' : role === 'commenter' ? '#3B82F6' : '#10B981';

    // Create Transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    // Send Email
    const info = await transporter.sendMail({
      from: `"Synkris" <${process.env.GMAIL_USER}>`,
      to: recipientEmail,
      subject: `${inviterName} invited you to ${roleText} "${documentTitle}"`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Document Invitation</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            
            <!-- Header -->
            <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #f0f0f0;">
              <h1 style="margin: 0; color: #2563eb; font-size: 28px;">Synkris</h1>
            </div>

            <!-- Main Content -->
            <div style="padding: 40px 20px;">
              <h2 style="color: #1f2937; margin-bottom: 20px;">You've been invited to collaborate!</h2>
              
              <p style="font-size: 16px; color: #4b5563; margin-bottom: 10px;">
                Hi ${recipientName || 'there'},
              </p>
              
              <p style="font-size: 16px; color: #4b5563; margin-bottom: 25px;">
                <strong>${inviterName}</strong> has invited you to <strong style="color: ${roleColor}">${roleText}</strong> a document on Synkris.
              </p>

              <!-- Document Card -->
              <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <div style="display: flex; align-items: center; margin-bottom: 10px;">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="#2563eb" style="margin-right: 10px;">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                    <polyline points="14 2 14 8 20 8" fill="none" stroke="#2563eb" stroke-width="2"/>
                  </svg>
                  <h3 style="margin: 0; color: #1f2937; font-size: 18px;">${documentTitle}</h3>
                </div>
                <p style="color: #6b7280; margin: 5px 0; font-size: 14px;">
                  <span style="display: inline-block; background: ${roleColor}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; text-transform: capitalize;">
                    ${role}
                  </span>
                </p>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 35px 0;">
                <a href="${documentUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Open Document
                </a>
              </div>

              <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                Or copy and paste this URL into your browser:<br>
                <a href="${documentUrl}" style="color: #2563eb; word-break: break-all;">${documentUrl}</a>
              </p>
            </div>

            <!-- Footer -->
            <div style="border-top: 2px solid #f0f0f0; padding: 20px; text-align: center;">
              <p style="color: #9ca3af; font-size: 12px; margin: 5px 0;">
                This invitation was sent by ${inviterName} via Synkris
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 5px 0;">
                © ${new Date().getFullYear()} Synkris. All rights reserved.
              </p>
            </div>

          </body>
        </html>
      `,
    });

    console.log('Email sent successfully:', info.messageId);
    return NextResponse.json({ success: true, data: info });
  } catch (error: any) {
    console.error('Email sending error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to send email',
      details: error.toString()
    }, { status: 500 });
  }
}
