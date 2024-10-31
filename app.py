from flask import Flask, render_template, request, redirect, url_for, session
import json
import os

app = Flask(__name__)
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'default_secret_key')

# 添加静态文件路径处理
@app.context_processor
def utility_processor():
    def static_url(filename):
        return f'/static/{filename}'
    return dict(static_url=static_url)

# 确保根路由正确处理
@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        customer_name = request.form['customer_name']
        session['customer_name'] = customer_name
        return redirect(url_for('select_type'))
    return render_template('index.html')

@app.route('/select_type', methods=['GET', 'POST'])
def select_type():
    # 读取 categories.json 文件
    with open('categories.json', 'r', encoding='utf-8') as f:
        categories = json.load(f)
    
    # 获取顶级类型列表
    customer_types = list(categories.keys())
    
    if request.method == 'POST':
        customer_type = request.form.get('customer_type')
        if customer_type:
            session['customer_type'] = customer_type
            return redirect(url_for('select_options'))
    
    return render_template('select_type.html', customer_types=customer_types)

def build_selected_tree(categories, selected_options):
    result = {}
    for key, value in categories.items():
        if isinstance(value, dict):
            subtree = build_selected_tree(value, selected_options)
            if subtree:
                result[key] = subtree
        elif isinstance(value, list):
            intersecting_options = list(set(value) & set(selected_options))
            if intersecting_options:
                result[key] = intersecting_options
    return result if result else None

@app.route('/select_options', methods=['GET', 'POST'])
def select_options():
    # 检查是否有客户姓名和类型
    if 'customer_name' not in session or 'customer_type' not in session:
        return redirect(url_for('index'))
    
    # 读取 categories.json 文件
    with open('categories.json', 'r', encoding='utf-8') as f:
        all_categories = json.load(f)
    
    # 获取当前选择的客户类型对应的分类
    customer_type = session['customer_type']
    categories = all_categories.get(customer_type, {})
    
    if request.method == 'POST':
        selected_options = request.form.getlist('options')
        if selected_options:
            # 保存选中的选项到 session
            session['selected_options'] = selected_options
            # 确保重定向到结果页面
            return redirect(url_for('result'))
        else:
            flash('请至少选择一个选项')  # 可选：添加提示信息
    
    return render_template('select_options.html', 
                         categories=categories,
                         customer_type=customer_type)

@app.route('/result')
def result():
    # 检查所有必需的 session 数据
    required_keys = ['customer_name', 'customer_type', 'selected_options']
    if not all(key in session for key in required_keys):
        return redirect(url_for('index'))
    
    # 读取categories.json
    with open('categories.json', 'r', encoding='utf-8') as f:
        all_categories = json.load(f)
    
    # 获取当前客户类型的所有分类
    customer_type = session['customer_type']
    type_categories = all_categories.get(customer_type, {})
    
    # 构建选中项的树形结构
    selected_tree = {}
    selected_options = session.get('selected_options', [])
    
    # 遍历分类树，找到选中的选项所属的分类
    def find_selected_items(categories, tree):
        for key, value in categories.items():
            if isinstance(value, dict):
                subtree = {}
                find_selected_items(value, subtree)
                if subtree:
                    tree[key] = subtree
            elif isinstance(value, list):
                selected = [item for item in value if item in selected_options]
                if selected:
                    tree[key] = selected
    
    # 构建选中项的树
    find_selected_items(type_categories, selected_tree)
    
    return render_template('result.html',
                         customer_name=session['customer_name'],
                         customer_type=customer_type,
                         selected_tree=selected_tree)

@app.route('/new_customer')
def new_customer():
    # 清除会话数据
    session.clear()
    # 重定向到客户姓名输入页面
    return redirect(url_for('index'))

# 添加错误处理
@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

@app.route('/test')
def test():
    return 'Hello from Flask!'

if __name__ == '__main__':
    app.run(debug=True)
