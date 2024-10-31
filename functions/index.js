// 使用 Map 模拟会话存储（生产环境应使用 Cloudflare KV）
const sessions = new Map();

// 添加到文件开头
function log(message, data = null) {
    console.log(`[${new Date().toISOString()}] ${message}`, data || '');
}

// 读取分类数据
async function getCategories() {
  try {
    // 从 public 目录读取 categories.json
    const categoriesPath = './public/categories.json';
    const categoriesData = await Deno.readTextFile(categoriesPath);
    const categories = JSON.parse(categoriesData);
    
    // 只返回顶级键名
    const topLevelKeys = Object.keys(categories);
    return topLevelKeys;
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
  const url = new URL(context.request.url);
  const path = url.pathname;
  const method = context.request.method;

  log('Request received:', { path, method });

  // 获取或创建会话 ID
  let sessionId = context.request.headers.get('cookie')?.match(/sessionId=([^;]+)/)?.[1];
  if (!sessionId) {
    sessionId = crypto.randomUUID();
  }

  // 处理表单提交
  if (path === '/submit-type') {
    // 只允许 POST 方法
    if (method !== 'POST') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Method not allowed'
      }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Allow': 'POST'
        }
      });
    }

    try {
      const formData = await context.request.formData();
      const customerType = formData.get('customer_type');
      
      if (!customerType) {
        return new Response(JSON.stringify({ 
          success: false,
          error: '请选择客户类型' 
        }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Set-Cookie': `sessionId=${sessionId}; Path=/; HttpOnly; SameSite=Strict`
          }
        });
      }

      // 更新会话数据
      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {});
      }
      const sessionData = sessions.get(sessionId);
      sessionData.customerType = customerType;

      // 返回成功响应
      return new Response(JSON.stringify({ 
        success: true,
        redirect: '/select_options.html'
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `sessionId=${sessionId}; Path=/; HttpOnly; SameSite=Strict`
        }
      });

    } catch (error) {
      console.error('Error processing form submission:', error);
      return new Response(JSON.stringify({ 
        success: false,
        error: '提交失败',
        details: error.message 
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Set-Cookie': `sessionId=${sessionId}; Path=/; HttpOnly; SameSite=Strict`
        }
      });
    }
  }

  // 删除重复的路由处理
  // 删除 select_type.html 的 POST 处理
  // 保留其他必要的路由

  // 返回静态文件
  return context.next();
} 