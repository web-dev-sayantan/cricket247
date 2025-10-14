import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export const sendEmailOtp = async ({
  email,
  otp,
  from = "thegullycricketapp@resend.dev",
  subject = "is your verification code for the-gully-cricket-app",
}: {
  email: string;
  otp: string;
  from?: string;
  subject?: string;
}) => {
  const response = await resend.emails.send({
    from,
    to: email,
    subject: `${otp} ${subject}.`,
    html: `
      <p>Your verification code is: <strong>${otp}</strong></p>
      <p>This will be valid for 5 minutes. If you did not request this, please ignore this email.</p>
    `,
  });
};
