import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Heart, AlertCircle } from 'lucide-react'

export default function AuthErrorPage() {
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
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="font-serif text-2xl">
                Something went wrong
              </CardTitle>
              <CardDescription className="text-base">
                There was an error during authentication. Please try again.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button asChild className="w-full">
                <Link href="/auth/login">Try again</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/">Go home</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
