import type { MDXComponents } from 'mdx/types'

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => (
      <h1 className="text-4xl text-white mb-8" style={{ fontFamily: 'var(--font-dm-serif-text)' }}>
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-2xl text-white mt-8 mb-4">{children}</h2>
    ),
    p: ({ children }) => (
      <p className="text-gray-400 mb-4">{children}</p>
    ),
    ul: ({ children }) => (
      <ul className="text-gray-400 list-disc list-inside mb-4 space-y-2">{children}</ul>
    ),
    a: ({ href, children }) => (
      <a href={href} className="text-orange-500 hover:underline">{children}</a>
    ),
    ...components,
  }
}
