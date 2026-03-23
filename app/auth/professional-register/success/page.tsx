import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Clock, CheckCircle, Mail } from "lucide-react";

export default function ProfessionalRegisterSuccessPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="flex items-center justify-center gap-2 text-primary mb-8">
          <Heart className="h-8 w-8 fill-current" />
          <span className="font-serif text-2xl font-medium">MatriAI</span>
        </div>

        <Card className="border-0 shadow-lg">
          <CardContent className="pt-8 pb-8 px-8 space-y-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30 mx-auto">
              <Clock className="h-10 w-10 text-yellow-600 dark:text-yellow-400" />
            </div>

            <div>
              <h1 className="font-serif text-2xl font-medium mb-2">
                Application Submitted
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Your professional registration has been received. Our team will
                review your credentials and license details.
              </p>
            </div>

            <div className="text-left space-y-3 rounded-xl border bg-muted/30 p-4">
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                <span>
                  Application recorded with <strong>pending</strong> status
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-primary shrink-0" />
                <span>Check your email to confirm your account</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-yellow-500 shrink-0" />
                <span>Verification takes 2–3 business days</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Once verified, your profile will appear in the MatriAI
              professional directory, making you discoverable to patients.
            </p>

            <div className="flex flex-col gap-2">
              <Button asChild>
                <Link href="/auth/login">Sign in to your account</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/">Back to home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
