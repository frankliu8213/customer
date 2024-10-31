// 使用 Map 模拟会话存储（生产环境应使用 Cloudflare KV）
const sessions = new Map();

// 读取分类数据
async function getCategories() {
  const categoriesResponse = await fetch('categories.json');
  return categoriesResponse.json();
}

// 构建选中项的树形结构
function buildSelectedTree(categories, selectedOptions) {
  const result = {};
  for (const [key, value] of Object.entries(categories)) {
    if (typeof value === 'object' && !Array.isArray(value)) {
      const subtree = buildSelectedTree(value, selectedOptions);
      if (Object.keys(subtree).length > 0) {
        result[key] = subtree;
      }
    } else if (Array.isArray(value)) {
      const intersectingOptions = value.filter(item => selectedOptions.includes(item));
      if (intersectingOptions.length > 0) {
        result[key] = intersectingOptions;
      }
    }
  }
  return result;
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname;

  // 获取或创建会话 ID
  let sessionId = context.request.headers.get('cookie')?.match(/sessionId=([^;]+)/)?.[1];
  if (!sessionId) {
    sessionId = crypto.randomUUID();
  }

  // 主页路由
  if (path === '/' || path === '/index.html') {
    if (context.request.method === 'POST') {
      const formData = await context.request.formData();
      const customerName = formData.get('customer_name');
      
      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {});
      }
      sessions.get(sessionId).customerName = customerName;

      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/select_type.html',
          'Set-Cookie': `sessionId=${sessionId}; path=/`
        }
      });
    }
    return context.next();
  }

  // 类型选择路由
  if (path === '/select_type.html') {
    if (context.request.method === 'POST') {
      const formData = await context.request.formData();
      const customerType = formData.get('customer_type');
      
      if (sessions.has(sessionId)) {
        sessions.get(sessionId).customerType = customerType;
        return new Response(null, {
          status: 302,
          headers: {
            'Location': '/select_options.html',
            'Set-Cookie': `sessionId=${sessionId}; path=/`
          }
        });
      }
    }
    return context.next();
  }

  // 选项选择路由
  if (path === '/select_options.html') {
    const sessionData = sessions.get(sessionId);
    if (!sessionData?.customerName || !sessionData?.customerType) {
      return new Response(null, {
        status: 302,
        headers: { 'Location': '/' }
      });
    }
    return context.next();
  }

  // 提交选项
  if (path === '/submit-options' && context.request.method === 'POST') {
    const formData = await context.request.formData();
    const selectedOptions = formData.getAll('options');
    
    if (selectedOptions.length === 0) {
      return new Response(JSON.stringify({ error: '请至少选择一个选项' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (sessions.has(sessionId)) {
      sessions.get(sessionId).selectedOptions = selectedOptions;
      return new Response(null, {
        status: 302,
        headers: { 'Location': '/result.html' }
      });
    }
  }

  // 结果页面路由
  if (path === '/result.html') {
    const sessionData = sessions.get(sessionId);
    const requiredKeys = ['customerName', 'customerType', 'selectedOptions'];
    if (!sessionData || !requiredKeys.every(key => sessionData[key])) {
      return new Response(null, {
        status: 302,
        headers: { 'Location': '/' }
      });
    }
    return context.next();
  }

  // API 路由
  if (path === '/api/get-categories') {
    const categories = await getCategories();
    return new Response(JSON.stringify(categories), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (path === '/api/get-result') {
    const sessionData = sessions.get(sessionId);
    if (sessionData) {
      const categories = await getCategories();
      const typeCategories = categories[sessionData.customerType] || {};
      const selectedTree = buildSelectedTree(typeCategories, sessionData.selectedOptions || []);

      return new Response(JSON.stringify({
        customerName: sessionData.customerName,
        customerType: sessionData.customerType,
        selectedTree: selectedTree
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // 新客户路由
  if (path === '/new-customer') {
    if (sessions.has(sessionId)) {
      sessions.delete(sessionId);
    }
    return new Response(null, {
      status: 302,
      headers: { 'Location': '/' }
    });
  }

  // 返回静态文件
  return context.next();
} 