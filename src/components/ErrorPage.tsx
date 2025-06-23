import { html } from 'hono/html'

export function ErrorPage(message: string) {
  return html`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>错误 - NodeSeek RSS 监控</title>
        <link href="/src/style.css" rel="stylesheet" />
      </head>
      <body>
        <div class="container">
          <div class="error-page">
            <h1>❌ 出现错误</h1>
            <p>${message}</p>
            <a href="/" class="btn btn-primary">返回首页</a>
          </div>
        </div>
      </body>
    </html>
  `
} 