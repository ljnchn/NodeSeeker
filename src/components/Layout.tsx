import type { FC, PropsWithChildren } from 'hono/jsx'

interface LayoutProps {
  title?: string
  description?: string
  scriptSrc?: string
}

export const Layout: FC<PropsWithChildren<LayoutProps>> = ({ 
  title = 'NodeSeek RSS 监控', 
  description,
  scriptSrc,
  children 
}) => {
  return (
    <>
      <title>{title}</title>
      {description && <meta name="description" content={description} />}
      
      {children}
      
      {scriptSrc && <script src={scriptSrc}></script>}
    </>
  )
}

// 专门的页面布局组件
export const PageLayout: FC<PropsWithChildren<LayoutProps & { containerClass?: string }>> = ({
  title,
  description,
  scriptSrc,
  containerClass = 'container',
  children
}) => {
  return (
    <Layout title={title} description={description} scriptSrc={scriptSrc}>
      <div class={containerClass}>
        {children}
      </div>
    </Layout>
  )
} 