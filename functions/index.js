export function onRequest(context) {
  // 获取请求的 URL 路径
  const url = new URL(context.request.url);
  const path = url.pathname;

  // 如果是根路径 "/" ，让它显示 index.html
  if (path === "/" || path === "/index.html") {
    // 让请求继续到静态资源
    return context.next();
  }

  // 对于 API 路径或其他动态请求，返回 "Hello World"
  if (path.startsWith('/api/')) {
    return new Response("Hello World!");
  }

  // 其他路径也让它继续到静态资源
  return context.next();
} 