import Link from "next/link"

const BlueskyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 568 501" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M123.121 33.664C188.241 82.553 258.281 181.68 284 234.873c25.719-53.192 95.759-152.32 160.879-201.21C491.866-1.611 568-28.906 568 57.947c0 17.346-9.945 145.713-15.778 166.555-20.275 72.453-94.155 90.933-159.875 79.748C507.222 323.8 536.444 388.56 473.333 453.32c-119.86 122.992-172.272-30.859-185.702-70.281-2.462-7.227-3.614-10.608-3.631-7.733-.017-2.875-1.169.506-3.631 7.733-13.43 39.422-65.842 193.273-185.702 70.281-63.111-64.76-33.89-129.52 80.986-149.071-65.72 11.185-139.6-7.295-159.875-79.748C9.945 203.659 0 75.291 0 57.946 0-28.906 76.135-1.612 123.121 33.664Z"/>
  </svg>
)

const GitHubIcon = () => (
  <svg width="16" height="16" viewBox="0 0 98 96" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M41.4395 69.3848C28.8066 67.8535 19.9062 58.7617 19.9062 46.9902C19.9062 42.2051 21.6289 37.0371 24.5 33.5918C23.2559 30.4336 23.4473 23.7344 24.8828 20.959C28.7109 20.4805 33.8789 22.4902 36.9414 25.2656C40.5781 24.1172 44.4062 23.543 49.0957 23.543C53.7852 23.543 57.6133 24.1172 61.0586 25.1699C64.0254 22.4902 69.2891 20.4805 73.1172 20.959C74.457 23.543 74.6484 30.2422 73.4043 33.4961C76.4668 37.1328 78.0937 42.0137 78.0937 46.9902C78.0937 58.7617 69.1934 67.6621 56.3691 69.2891C59.623 71.3945 61.8242 75.9883 61.8242 81.252L61.8242 91.2051C61.8242 94.0762 64.2168 95.7031 67.0879 94.5547C84.4102 87.9512 98 70.6289 98 49.1914C98 22.1074 75.9883 6.69539e-07 48.9043 4.309e-07C21.8203 1.92261e-07 -1.9479e-07 22.1074 -4.3343e-07 49.1914C-6.20631e-07 70.4375 13.4941 88.0469 31.6777 94.6504C34.2617 95.6074 36.75 93.8848 36.75 91.3008L36.75 83.6445C35.4102 84.2188 33.6875 84.6016 32.1562 84.6016C25.8398 84.6016 22.1074 81.1563 19.4277 74.7441C18.375 72.1602 17.2266 70.6289 15.0254 70.3418C13.877 70.2461 13.4941 69.7676 13.4941 69.1934C13.4941 68.0449 15.4082 67.1836 17.3223 67.1836C20.0977 67.1836 22.4902 68.9063 24.9785 72.4473C26.8926 75.2227 28.9023 76.4668 31.2949 76.4668C33.6875 76.4668 35.2187 75.6055 37.4199 73.4043C39.0469 71.7773 40.291 70.3418 41.4395 69.3848Z"/>
  </svg>
)

const StarIcon = () => (
  <svg width="32" height="32" viewBox="0 0 150 148" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M75 0L76.2683 34.2209C77.0442 55.1571 93.8432 71.9475 114.78 72.7127L150 74L114.78 75.2873C93.8432 76.0525 77.0442 92.8429 76.2683 113.779L75 148L73.7317 113.779C72.9558 92.8429 56.1568 76.0525 35.2202 75.2873L0 74L35.2202 72.7127C56.1568 71.9475 72.9558 55.1571 73.7317 34.2209L75 0Z"/>
  </svg>
)

const links = [
  { text: "Terms", url: "/tos" },
  { text: "Privacy", url: "/privacy" },
]

export function Footer() {
  return (
    <footer className="flex flex-col gap-y-5 rounded-lg px-7 py-5 md:px-10 mt-16">
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-x-2 text-white">
          <StarIcon />
          <div>
            <h2 className="text-lg font-bold">Private Age Assurance</h2>
            <p className="text-sm text-gray-400">Built by ATTPS Labs Ltd</p>
          </div>
        </div>

        <div className="flex items-center gap-x-4">
          <a
            href="https://github.com/attpslabs/age-assurance"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-5 w-5 items-center justify-center text-gray-500 transition-all duration-100 ease-linear hover:text-white"
          >
            <GitHubIcon />
          </a>
          <a
            href="https://bsky.app/profile/attps.social"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-5 w-5 items-center justify-center text-gray-500 transition-all duration-100 ease-linear hover:text-white"
          >
            <BlueskyIcon />
          </a>
        </div>
      </div>
      <div className="flex flex-col justify-between gap-y-5 md:flex-row md:items-center ml-10">
        <ul className="flex flex-col gap-x-5 gap-y-2 text-gray-500 md:flex-row md:items-center">
          {links.map((link, index) => (
            <li
              key={index}
              className="text-sm font-medium text-gray-500 transition-all duration-100 ease-linear hover:text-white hover:underline hover:underline-offset-4"
            >
              <Link href={link.url}>{link.text}</Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between text-sm font-medium tracking-tight text-gray-500">
          <p>
            Powered by{' '}
            <a href="https://self.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-white hover:underline hover:underline-offset-4">
              Self Protocol
            </a>
            {' '}and{' '}
            <a href="https://atproto.com" target="_blank" rel="noopener noreferrer" className="hover:text-white hover:underline hover:underline-offset-4">
              AT Protocol
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
