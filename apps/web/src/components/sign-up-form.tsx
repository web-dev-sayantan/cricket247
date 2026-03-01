import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import FacebookButton from "@/components/ui/facebook-button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import GoogleButton from "@/components/ui/google-button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";
import { OTP_LENGTH } from "@/lib/constants";
import Loader from "./loader";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const signupSchema = z.object({
  email: z.email(),
  otp: z
    .string()
    .length(OTP_LENGTH, { message: `OTP must be ${OTP_LENGTH} digits` })
    .optional(),
});

export default function SignUpForm({
  onSwitchToSignIn,
}: {
  onSwitchToSignIn: () => void;
}) {
  const navigate = useNavigate({
    from: "/",
  });
  const [otpSent, setOtpSent] = useState(0);
  const [_signupError, setSignupError] = useState("");
  const { isPending } = authClient.useSession();

  const form = useForm({
    defaultValues: {
      name: "",
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
        name: z.string().min(2, "Name must be at least 2 characters"),
        email: z.email("Invalid email address"),
        otp: z.string().min(OTP_LENGTH, `OTP must be ${OTP_LENGTH} digits`),
      }),
    },
  });

  async function signInWithSocial(provider: "facebook" | "google") {
    const callbackBaseUrl =
      typeof window === "undefined" ? "" : window.location.origin;
    const { data } = await authClient.signIn.social({
      provider,
      callbackURL: `${callbackBaseUrl}/dashboard`,
      errorCallbackURL: `${callbackBaseUrl}/error`,
    });
    if (data?.redirect) {
      // navigate("/play/matches");
    } else {
      setSignupError("Login Failed. Try Again");
    }
  }

  async function sendOTP(email: string) {
    if (!email) {
      return;
    }
    const { data } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "sign-in",
    });
    if (data?.success) {
      setOtpSent(otpSent + 1);
    }
  }

  async function verifyOTP(formValues: z.infer<typeof signupSchema>) {
    if (!formValues.otp) {
      setSignupError("Invalid Code");
      return;
    }
    const { data } = await authClient.signIn.emailOtp({
      email: formValues.email,
      otp: formValues.otp,
    });
    if (data?.user) {
      // navigate("/dashboard");
    } else {
      setSignupError("Invalid Code");
    }
  }
  if (isPending) {
    return <Loader />;
  }

  return (
    <main
      className="page-surface flex items-start justify-center px-4 py-6 sm:px-6 sm:py-10"
      id="main-content"
    >
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-center justify-center">
          <img
            alt="logo"
            className="rounded-full"
            height="80"
            src="/cricket-24-7.svg"
            width="80"
          />
          <h1 className="py-2 text-center font-bold text-xl">Cricket 24/7</h1>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-center text-sm">
            {otpSent
              ? "Check your email for the verification code"
              : "Create your account with"}
          </p>
          {!otpSent && (
            <>
              <div className="flex w-full items-center gap-4 pb-4">
                <FacebookButton
                  className="w-full flex-1"
                  onClick={() => signInWithSocial("facebook")}
                />
                <GoogleButton
                  className="w-full flex-1"
                  onClick={() => signInWithSocial("google")}
                />
              </div>
              <div className="relative">
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
                      field.state.meta.isTouched && !field.state.meta.isValid;
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
              <>
                <FieldGroup>
                  <form.Field name="name">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field className="space-y-2" data-invalid={isInvalid}>
                          <FieldLabel className="mb-0" htmlFor={field.name}>
                            Name
                          </FieldLabel>
                          <Input
                            aria-invalid={isInvalid}
                            id={field.name}
                            name={field.name}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            type="text"
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
                <FieldGroup>
                  <form.Field name="email">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field className="space-y-2" data-invalid={isInvalid}>
                          <FieldLabel className="mb-0" htmlFor={field.name}>
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
              </>
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
              onClick={onSwitchToSignIn}
              variant="link"
            >
              Already have an account? Sign In
            </Button>
          </div>
        </CardFooter>
      </Card>
    </main>
  );
}
