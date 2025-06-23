import { jsxRenderer } from 'hono/jsx-renderer'

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>NodeSeeker</title>
        <link href="/style.css" rel="stylesheet" />
        <link rel="icon" type="image/x-icon" href="/public/favicon.ico" />
      </head>
      <body>{children}</body>
    </html>
  )
})
