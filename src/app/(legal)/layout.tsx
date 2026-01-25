import Link from "next/link"

const StarIcon = () => (
  <svg width="40" height="40" viewBox="0 0 150 148" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M75 0L76.2683 34.2209C77.0442 55.1571 93.8432 71.9475 114.78 72.7127L150 74L114.78 75.2873C93.8432 76.0525 77.0442 92.8429 76.2683 113.779L75 148L73.7317 113.779C72.9558 92.8429 56.1568 76.0525 35.2202 75.2873L0 74L35.2202 72.7127C56.1568 71.9475 72.9558 55.1571 73.7317 34.2209L75 0Z" fill="currentColor"/>
  </svg>
)

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <header className="w-full py-6 sticky top-0 z-40">
        <div className="flex justify-center">
          <Link href="/" className="text-orange-500 hover:text-orange-400 transition-colors">
            <StarIcon />
          </Link>
        </div>
      </header>
      <div className="min-h-screen">
        <div className="p-8 max-w-2xl mx-auto">
          {children}
        </div>
      </div>
    </>
  )
}
