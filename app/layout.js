import "./globals.css";

export const metadata = {
  title: "OfficeQuest — Live Energy Dashboard",
  description: "Real-time office lights and fans dashboard for the OfficeQuest hackathon.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
