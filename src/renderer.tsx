import { jsxRenderer } from 'hono/jsx-renderer'
import { ViteClient } from 'vite-ssr-components/hono'

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html>
      <head>
        <ViteClient />
      </head>
      <body>{children}</body>
    </html>
  )
})
