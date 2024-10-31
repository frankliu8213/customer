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
    
    # 返回响应
    return {
        'statusCode': response[1],
        'headers': {
            'Content-Type': 'text/html',
        },
        'body': response[0].decode('utf-8')
    } 