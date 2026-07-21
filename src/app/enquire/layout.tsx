import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./enquire.css";

const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-enquire-display",
});

const body = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-enquire-body",
});

export const metadata: Metadata = {
  title: "Hire Enquiry | Champion Equipment",
  description: "Request excavator and plant hire from Champion Equipment",
};

export default function EnquireLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${display.variable} ${body.variable} enquire-shell`}>
      {children}
    </div>
  );
}
