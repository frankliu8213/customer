export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname;

  // 处理表单提交
  if (path === "/" && context.request.method === "POST") {
    const formData = await context.request.formData();
    const customerName = formData.get("customer_name");
    
    // 这里可以添加处理逻辑
    return new Response(JSON.stringify({ message: `收到客户名称: ${customerName}` }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // 返回静态文件
  return context.next();
} 