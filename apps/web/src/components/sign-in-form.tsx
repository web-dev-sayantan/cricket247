/** biome-ignore-all lint/performance/noImgElement: this is not a nextjs project */
import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { authClient } from "@/lib/auth-client";
import { OTP_LENGTH } from "@/lib/constants";
import Loader from "./loader";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "./ui/card";
import FacebookButton from "./ui/facebook-button";
import { Field, FieldError, FieldGroup, FieldLabel } from "./ui/field";
import GoogleButton from "./ui/google-button";
import { Input } from "./ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "./ui/input-otp";
import { Separator } from "./ui/separator";

const signinSchema = z.object({
  email: z.email(),
  otp: z
    .string()
    .length(OTP_LENGTH, { message: `OTP must be ${OTP_LENGTH} digits` })
    .optional(),
});

export default function SignInForm({
  onSwitchToSignUp,
}: {
  onSwitchToSignUp: () => void;
}) {
  const navigate = useNavigate({
    from: "/",
  });
  const [otpSent, setOtpSent] = useState(0);
  const [_signinError, setSigninError] = useState("");
  const { isPending } = authClient.useSession();

  const form = useForm({
    defaultValues: {
      email: "",
      otp: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signIn.email(
        {
          email: value.email,
          password: value.otp,
        },
        {
          onSuccess: () => {
            navigate({
              to: "/dashboard",
            });
            toast.success("Sign in successful");
          },
          onError: (error) => {
            toast.error(error.error.message || error.error.statusText);
          },
        }
      );
    },
    validators: {
      onSubmit: z.object({
        email: z.email("Invalid email address"),
        otp: z.string().min(OTP_LENGTH, `OTP must be ${OTP_LENGTH} digits`),
      }),
    },
  });

  async function signInWithSocial(provider: "facebook" | "google") {
    const callbackBaseUrl =
      typeof window === "undefined" ? "" : window.location.origin;
    const { data, error } = await authClient.signIn.social({
      provider,
      callbackURL: `${callbackBaseUrl}/dashboard`,
      errorCallbackURL: `${callbackBaseUrl}/error`,
    });
    if (error || !data) {
      setSigninError("Login Failed. Try Again");
    }
  }

  async function sendOTP(email: string) {
    if (!email) {
      return;
    }
    const { data, error } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "sign-in",
    });
    if (data?.success) {
      setOtpSent(otpSent + 1);
    } else if (error) {
      setSigninError("Failed to send OTP. Try Again");
    }
  }

  async function verifyOTP(formValues: z.infer<typeof signinSchema>) {
    const { data, error } = await authClient.signIn.emailOtp({
      email: formValues.email,
      // biome-ignore lint/style/noNonNullAssertion: <otp will be present here>
      otp: formValues.otp!,
    });
    if (data?.user) {
      // navigate("/dashboard");
    } else {
      console.error("OTP verification failed:", error);
      setSigninError("Invalid Code");
    }
  }
  if (isPending) {
    return <Loader />;
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-md p-6">
      <Card className="min-w-75">
        <CardHeader className="flex flex-col items-center justify-center">
          <img
            alt="logo"
            className="rounded-full"
            height="80"
            src="/cricket-24-7.svg"
            width="80"
          />
          <h1 className="pt-2 text-center font-bold text-xl">Cricket 24/7</h1>
          <CardDescription className="text-center">
            {otpSent
              ? "Check your email for the verification code"
              : "Sign in to your account with"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!otpSent && (
            <>
              <div className="flex w-full items-center gap-4">
                <FacebookButton
                  className="w-full flex-1"
                  onClick={() => signInWithSocial("facebook")}
                />
                <GoogleButton
                  className="w-full flex-1"
                  onClick={() => signInWithSocial("google")}
                />
              </div>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>
            </>
          )}
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit(verifyOTP);
            }}
          >
            {otpSent ? (
              <FieldGroup>
                <form.Field name="otp">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && field.state.meta.isValid;
                    return (
                      <Field className="space-y-2" data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          Verification Code
                        </FieldLabel>
                        <InputOTP
                          aria-invalid={isInvalid}
                          id={field.name}
                          maxLength={6}
                          name={field.name}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e)}
                          value={field.state.value}
                        >
                          <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                          </InputOTPGroup>
                          <InputOTPSeparator />
                          <InputOTPGroup>
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                          </InputOTPGroup>
                          <InputOTPSeparator />
                          <InputOTPGroup>
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                          </InputOTPGroup>
                        </InputOTP>
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    );
                  }}
                </form.Field>
              </FieldGroup>
            ) : (
              <FieldGroup>
                <form.Field name="email">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel className="m-0" htmlFor={field.name}>
                          Email
                        </FieldLabel>
                        <Input
                          aria-invalid={isInvalid}
                          id={field.name}
                          name={field.name}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          type="email"
                          value={field.state.value}
                        />
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    );
                  }}
                </form.Field>
              </FieldGroup>
            )}
            <form.Subscribe>
              {(state) => (
                <div className="flex flex-col items-center justify-center gap-1">
                  {otpSent ? (
                    <>
                      <Button
                        className="w-full font-bold"
                        disabled={!state.canSubmit || state.isSubmitting}
                        type="submit"
                      >
                        Verify
                      </Button>
                      <div className="flex items-center justify-center">
                        <Button
                          className="ml-2"
                          onClick={() => sendOTP(form.getFieldValue("email"))}
                          variant={"link"}
                        >
                          {state.isSubmitting
                            ? "Sending Code..."
                            : "Resend Code"}
                        </Button>
                        <Button
                          className="ml-2"
                          onClick={() => setOtpSent(0)}
                          variant={"link"}
                        >
                          Change Email
                        </Button>
                      </div>
                    </>
                  ) : (
                    <Button
                      className="w-full font-bold"
                      disabled={!state.canSubmit || state.isSubmitting}
                      onClick={() => sendOTP(form.getFieldValue("email"))}
                      type="button"
                    >
                      {state.isSubmitting ? "Sending Code..." : "Send Code"}
                    </Button>
                  )}
                </div>
              )}
            </form.Subscribe>
          </form>
        </CardContent>
        <CardFooter className="flex items-center justify-center">
          <div className="mt-4 text-center">
            <Button
              className="text-indigo-600 hover:text-indigo-800"
              onClick={onSwitchToSignUp}
              variant="link"
            >
              Need an account? Sign Up
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
