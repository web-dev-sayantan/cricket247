import { Resend } from "resend";

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

let resendClient: Resend | null = null;

const getResendClient = () => {
  if (!resendClient) {
    resendClient = new Resend(getRequiredEnv("RESEND_API_KEY"));
  }

  return resendClient;
};

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
  const resend = getResendClient();

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
