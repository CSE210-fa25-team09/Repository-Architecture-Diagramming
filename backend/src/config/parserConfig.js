/**
 * Parser Configuration
 * Contains regex patterns, builtin modules, and file extensions for dependency analysis
 */

export const REGEX_PATTERNS = {
  // JavaScript/TypeScript patterns
  javascript: {
    require: /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    import: /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g
  },
  
  // C/C++ patterns
  cpp: {
    systemInclude: /#include\s*<([^>]+)>/g,
    localInclude: /#include\s*"([^"]+)"/g
  },
  
  // Python patterns
  python: {
    import: /^import\s+([\w.]+)(?:\s+as\s+\w+)?/gm,
    fromImport: /^from\s+([\w.]+)\s+import\s+/gm
  },
  
  // Java patterns
  java: {
    import: /^import\s+(?:static\s+)?([\w.]+(?:\.\*)?)\s*;/gm
  }
};

export const FILE_EXTENSIONS = {
  javascript: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'],
  cpp: ['.cpp', '.cc', '.cxx', '.c', '.h', '.hpp', '.hxx'],
  python: ['.py'],
  java: ['.java']
};

export const BUILTIN_MODULES = {
  // Node.js builtin modules
  javascript: [
    'fs', 'path', 'http', 'https', 'crypto', 'os', 'util', 'events',
    'stream', 'buffer', 'child_process', 'cluster', 'net', 'dgram',
    'dns', 'readline', 'repl', 'tls', 'tty', 'url', 'querystring',
    'zlib', 'assert', 'string_decoder', 'vm', 'v8', 'timers'
  ],
  
  // Python standard library modules (Python 3.x)
  python: [
    'abc', 'aifc', 'argparse', 'array', 'ast', 'asynchat', 'asyncio', 'asyncore',
    'atexit', 'audioop', 'base64', 'bdb', 'binascii', 'binhex', 'bisect', 'builtins',
    'bz2', 'calendar', 'cgi', 'cgitb', 'chunk', 'cmath', 'cmd', 'code', 'codecs',
    'codeop', 'collections', 'colorsys', 'compileall', 'concurrent', 'configparser',
    'contextlib', 'contextvars', 'copy', 'copyreg', 'cProfile', 'crypt', 'csv',
    'ctypes', 'curses', 'dataclasses', 'datetime', 'dbm', 'decimal', 'difflib',
    'dis', 'distutils', 'doctest', 'email', 'encodings', 'enum', 'errno', 'faulthandler',
    'fcntl', 'filecmp', 'fileinput', 'fnmatch', 'formatter', 'fractions', 'ftplib',
    'functools', 'gc', 'getopt', 'getpass', 'gettext', 'glob', 'graphlib', 'grp',
    'gzip', 'hashlib', 'heapq', 'hmac', 'html', 'http', 'idlelib', 'imaplib',
    'imghdr', 'imp', 'importlib', 'inspect', 'io', 'ipaddress', 'itertools', 'json',
    'keyword', 'lib2to3', 'linecache', 'locale', 'logging', 'lzma', 'mailbox',
    'mailcap', 'marshal', 'math', 'mimetypes', 'mmap', 'modulefinder', 'multiprocessing',
    'netrc', 'nis', 'nntplib', 'numbers', 'operator', 'optparse', 'os', 'ossaudiodev',
    'parser', 'pathlib', 'pdb', 'pickle', 'pickletools', 'pipes', 'pkgutil', 'platform',
    'plistlib', 'poplib', 'posix', 'posixpath', 'pprint', 'profile', 'pstats', 'pty',
    'pwd', 'py_compile', 'pyclbr', 'pydoc', 'queue', 'quopri', 'random', 're',
    'readline', 'reprlib', 'resource', 'rlcompleter', 'runpy', 'sched', 'secrets',
    'select', 'selectors', 'shelve', 'shlex', 'shutil', 'signal', 'site', 'smtpd',
    'smtplib', 'sndhdr', 'socket', 'socketserver', 'spwd', 'sqlite3', 'ssl', 'stat',
    'statistics', 'string', 'stringprep', 'struct', 'subprocess', 'sunau', 'symbol',
    'symtable', 'sys', 'sysconfig', 'syslog', 'tabnanny', 'tarfile', 'telnetlib',
    'tempfile', 'termios', 'test', 'textwrap', 'threading', 'time', 'timeit', 'tkinter',
    'token', 'tokenize', 'trace', 'traceback', 'tracemalloc', 'tty', 'turtle', 'turtledemo',
    'types', 'typing', 'unicodedata', 'unittest', 'urllib', 'uu', 'uuid', 'venv',
    'warnings', 'wave', 'weakref', 'webbrowser', 'winreg', 'winsound', 'wsgiref',
    'xdrlib', 'xml', 'xmlrpc', 'zipapp', 'zipfile', 'zipimport', 'zlib'
  ],
  
  // Java standard library packages (java.* and javax.*)
  java: [
    'java.applet', 'java.awt', 'java.beans', 'java.io', 'java.lang', 'java.math',
    'java.net', 'java.nio', 'java.rmi', 'java.security', 'java.sql', 'java.text',
    'java.time', 'java.util', 'javax.accessibility', 'javax.activation', 'javax.activity',
    'javax.annotation', 'javax.crypto', 'javax.imageio', 'javax.jws', 'javax.lang',
    'javax.management', 'javax.naming', 'javax.net', 'javax.print', 'javax.rmi',
    'javax.script', 'javax.security', 'javax.sound', 'javax.sql', 'javax.swing',
    'javax.tools', 'javax.transaction', 'javax.xml'
  ]
};

export const PATH_RESOLUTION_EXTENSIONS = {
  javascript: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '/index.js', '/index.ts', '/index.jsx', '/index.tsx'],
  cpp: ['.h', '.hpp', '.hxx', '.cpp', '.cc', '.cxx'],
  python: ['.py', '/__init__.py'],
  java: ['.java']
};

// Helper to detect language from file extension
export function getLanguageFromExtension(filePath) {
  const ext = filePath.substring(filePath.lastIndexOf('.'));
  
  if (FILE_EXTENSIONS.python.includes(ext)) return 'python';
  if (FILE_EXTENSIONS.cpp.includes(ext)) return 'cpp';
  if (FILE_EXTENSIONS.java.includes(ext)) return 'java';
  return 'javascript'; // default
}
