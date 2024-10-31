// 使用 Map 模拟会话存储（生产环境应使用 Cloudflare KV）
const sessions = new Map();

// 添加到文件开头
function log(message, data = null) {
    console.log(`[${new Date().toISOString()}] ${message}`, data || '');
}

// 读取分类数据
async function getCategories() {
  try {
    // 使用完整的 URL 路径
    const categoriesResponse = await fetch('http://127.0.0.1:8788/categories.json');
    if (!categoriesResponse.ok) {
      throw new Error(`HTTP error! status: ${categoriesResponse.status}`);
    }
    return await categoriesResponse.json();
  } catch (error) {
    console.error('Error loading categories:', error);
    throw error;
  }
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
  log('Request received:', {
    path: context.request.url,
    method: context.request.method
  });

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
      
      if (!customerName || !customerName.trim()) {
        return new Response(JSON.stringify({ error: '请输入客户姓名' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // 创建或更新会话
      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {});
      }
      sessions.get(sessionId).customerName = customerName.trim();

      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/select_type.html',
          'Set-Cookie': `sessionId=${sessionId}; path=/; HttpOnly; SameSite=Strict`
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
    log('Fetching categories');
    try {
      const categories = await getCategories();
      log('Categories loaded successfully', categories);
      return new Response(JSON.stringify(categories), {
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
    } catch (error) {
      log('Error loading categories', error);
      return new Response(JSON.stringify({ error: '加载分类数据失败' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
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