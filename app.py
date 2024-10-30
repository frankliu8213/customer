from flask import Flask, render_template, request, redirect, url_for, session
import json

app = Flask(__name__)
app.secret_key = 'your_secret_key'

# 读取分类数据
with open('categories.json', 'r', encoding='utf-8') as f:
    categories = json.load(f)

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        customer_name = request.form['customer_name']
        session['customer_name'] = customer_name
        return redirect(url_for('select_type'))
    return render_template('index.html')

@app.route('/select_type', methods=['GET', 'POST'])
def select_type():
    if request.method == 'POST':
        customer_type = request.form['customer_type']
        session['customer_type'] = customer_type
        return redirect(url_for('select_options'))
    return render_template('select_type.html', types=categories.keys())

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
    customer_type = session.get('customer_type')
    if not customer_type:
        return redirect(url_for('select_type'))
    if request.method == 'POST':
        selected_options = request.form.getlist('options')
        # 构建选中选项的分类树
        selected_tree = build_selected_tree(categories[customer_type], selected_options)
        session['selected_tree'] = selected_tree
        return redirect(url_for('result'))
    type_categories = categories.get(customer_type, {})
    return render_template('select_options.html', categories=type_categories)

@app.route('/result')
def result():
    customer_name = session.get('customer_name')
    customer_type = session.get('customer_type')
    selected_tree = session.get('selected_tree', {})
    return render_template('result.html', customer_name=customer_name, customer_type=customer_type, selected_tree=selected_tree)

@app.route('/new_customer')
def new_customer():
    # 清除会话数据
    session.clear()
    # 重定向到客户姓名输入页面
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True)
