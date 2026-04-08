import { LogoutButton } from '@/components/LogoutButton'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <nav>
          <LogoutButton />
        </nav>
        {children}
      </body>
    </html>
  );
}
