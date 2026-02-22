import { Resend } from "resend";

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

const resend = new Resend(getRequiredEnv("RESEND_API_KEY"));

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
  await resend.emails.send({
    from,
    to: email,
    subject: `${otp} ${subject}.`,
    html: `
      <p>Your verification code is: <strong>${otp}</strong></p>
      <p>This will be valid for 5 minutes. If you did not request this, please ignore this email.</p>
    `,
  });
};
