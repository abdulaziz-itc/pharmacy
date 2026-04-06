from app.main import app
from a2wsgi import ASGIMiddleware
application = ASGIMiddleware(app)

environ = {
    'REQUEST_METHOD': 'OPTIONS',
    'SCRIPT_NAME': '',
    'PATH_INFO': '/api/v1/users/',
    'SERVER_NAME': 'localhost',
    'SERVER_PORT': '80',
    'SERVER_PROTOCOL': 'HTTP/1.1',
    'wsgi.version': (1,0),
    'wsgi.url_scheme': 'http',
    'wsgi.input': open('/dev/null', 'rb'),
    'wsgi.errors': open('/dev/null', 'w'),
    'wsgi.multithread': False,
    'wsgi.multiprocess': False,
    'wsgi.run_once': False,
}

def start_response(status, headers):
    print("STATUS", status)
    print("HEADERS", headers)

list(application(environ, start_response))
