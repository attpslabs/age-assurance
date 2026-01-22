import type { Metadata } from "next";
import { Geist, Geist_Mono, DM_Serif_Text } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

const dmSerifText = DM_Serif_Text({
	variable: "--font-dm-serif-text",
	subsets: ["latin"],
	weight: "400",
});

export const metadata: Metadata = {
	title: "Private Age Assurance",
	description: "Private age assurance for Bluesky using zero-knowledge proofs",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className={`${geistSans.variable} ${geistMono.variable} ${dmSerifText.variable} antialiased bg-black`}
			>
				{children}
			</body>
		</html>
	);
}
