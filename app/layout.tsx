export const metadata = { title: "LeatherTech Components", description: "Cup washers, valve leathers & leather washers" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial, sans-serif', margin:0 }}>
        {children}
      </body>
    </html>
  );
}
