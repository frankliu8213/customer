from flask import Flask
from flask_lambda import FlaskLambda
import json

# 导入主应用的路由和功能
from app import app as flask_app

# 创建 Lambda 处理程序
def handler(event, context):
    # 将 Flask 应用转换为 Lambda 处理程序
    flask_lambda = FlaskLambda(flask_app)
    
    # 处理请求
    response = flask_lambda(event, context)
    
    # 获取响应内容
    body = response[0]
    status_code = response[1]
    headers = dict(response[2])  # 转换 headers 为字典
    
    # 确保 headers 包含正确的 Content-Type
    if 'Content-Type' not in headers:
        headers['Content-Type'] = 'text/html; charset=utf-8'
    
    # 返回响应
    return {
        'statusCode': status_code,
        'headers': headers,
        'body': body.decode('utf-8') if isinstance(body, bytes) else body,
        'isBase64Encoded': False
    } 