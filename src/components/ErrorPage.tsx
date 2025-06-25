import type { FC } from 'hono/jsx'
import { PageLayout } from './Layout'

interface ErrorPageProps {
  message: string
}

export const ErrorPage: FC<ErrorPageProps> = ({ message }) => {
  return (
    <PageLayout 
      title="错误 - NodeSeek RSS 监控"
      description="NodeSeek RSS 监控系统错误页面"
    >
      <div class="error-page">
          <h1>❌ 出现错误</h1>
          <p>{message}</p>
          <a href="/" class="btn btn-primary">返回首页</a>
        </div>
    </PageLayout>
  )
} 