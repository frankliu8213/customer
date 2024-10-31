import os
import mimetypes

def handler(event, context):
    # 获取请求的文件路径
    path = event['path'].replace('/.netlify/functions/static/', '')
    
    # 构建完整的文件路径
    file_path = os.path.join('static', path)
    
    try:
        with open(file_path, 'rb') as f:
            content = f.read()
        
        # 获取文件的 MIME 类型
        content_type = mimetypes.guess_type(file_path)[0] or 'application/octet-stream'
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': content_type,
            },
            'body': content.decode('utf-8') if isinstance(content, bytes) else content,
            'isBase64Encoded': False
        }
    except FileNotFoundError:
        return {
            'statusCode': 404,
            'body': 'File not found'
        } 