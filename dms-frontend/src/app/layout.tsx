import "./globals.css";

export const metadata = {
  title: "DMS Frontend",
  description: "Document Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
