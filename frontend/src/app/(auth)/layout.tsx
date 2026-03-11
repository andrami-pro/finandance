export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 antialiased sm:px-6 lg:px-8">
      {children}
    </div>
  );
}
