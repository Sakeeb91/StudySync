import { BookOpen } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex flex-col justify-between bg-primary p-10 text-primary-foreground">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-foreground/20">
            <BookOpen className="h-5 w-5" />
          </div>
          <span className="font-bold text-xl">StudySync</span>
        </Link>

        <div className="space-y-6">
          <blockquote className="space-y-2">
            <p className="text-lg">
              &ldquo;StudySync transformed how I study. The AI-generated flashcards
              save me hours of preparation time, and I&apos;ve seen my grades improve
              significantly.&rdquo;
            </p>
            <footer className="text-sm opacity-80">
              — Sarah M., Medical Student
            </footer>
          </blockquote>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-8">
            <div>
              <p className="text-3xl font-bold">50K+</p>
              <p className="text-sm opacity-80">Active Students</p>
            </div>
            <div>
              <p className="text-3xl font-bold">1M+</p>
              <p className="text-sm opacity-80">Flashcards Created</p>
            </div>
            <div>
              <p className="text-3xl font-bold">95%</p>
              <p className="text-sm opacity-80">Satisfaction Rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
