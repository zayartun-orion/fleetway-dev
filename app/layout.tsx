import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fleetway | Fleet Operations Portal",
  description: "Register fleet resources, plan routes, and coordinate daily vehicle schedules.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable:true, title:"Fleetway Driver", statusBarStyle:"black-translucent" },
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}
