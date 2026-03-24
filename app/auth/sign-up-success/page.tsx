import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Heart, Mail } from 'lucide-react'

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-gradient-to-b from-primary/5 to-background p-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2 text-primary">
            <Heart className="h-8 w-8 fill-current" />
            <span className="font-serif text-2xl font-medium">MatriLine</span>
          </div>

          <Card className="w-full shadow-lg border-0">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="font-serif text-2xl">
                Check your email
              </CardTitle>
              <CardDescription className="text-base">
                {
                  "We've sent you a confirmation link. Please check your inbox and click the link to activate your account."
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-sm text-center text-muted-foreground">
                {
                  "Didn't receive the email? Check your spam folder or try signing up again."
                }
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/auth/login">Back to login</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
