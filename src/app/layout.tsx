import type { Metadata } from "next";
import "./globals.css";
import { Footer } from "@/components/Footer";

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
			<body className="antialiased bg-black">
				{children}
				<Footer />
			</body>
		</html>
	);
}
