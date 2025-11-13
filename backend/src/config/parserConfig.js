/**
 * Parser Configuration
 * Contains regex patterns, builtin modules, and file extensions for dependency analysis
 */

export const REGEX_PATTERNS = {
  // JavaScript/TypeScript patterns
  jsts: {
    require: /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    import: /import\s+(?:type\s+)?(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g,
    dynamicImport: /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    exportFrom: /export\s+(?:\{[^}]*\}|\*(?:\s+as\s+\w+)?)\s+from\s+['"]([^'"]+)['"]/g,
    tripleSlash: /\/\/\/\s*<reference\s+(?:path|types)=['"]([^'"]+)['"]\s*\/>/g
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
  },
  
  // Go patterns
  go: {
    import: /^import\s+"([^"]+)"/gm,
    importBlock: /import\s*\(\s*([\s\S]*?)\s*\)/gm,
    importLine: /"([^"]+)"/g
  }
};

export const FILE_EXTENSIONS = {
  jsts: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'],
  cpp: ['.cpp', '.cc', '.cxx', '.c', '.h', '.hpp', '.hxx'],
  python: ['.py'],
  java: ['.java'],
  go: ['.go']
};

export const BUILTIN_MODULES = {
  // Node.js builtin modules (for JS/TS)
  jsts: [
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
  ],
  
  // Go standard library packages
  go: [
    'archive', 'archive/tar', 'archive/zip', 'bufio', 'builtin', 'bytes', 'compress',
    'compress/bzip2', 'compress/flate', 'compress/gzip', 'compress/lzw', 'compress/zlib',
    'container', 'container/heap', 'container/list', 'container/ring', 'context', 'crypto',
    'crypto/aes', 'crypto/cipher', 'crypto/des', 'crypto/dsa', 'crypto/ecdsa', 'crypto/ed25519',
    'crypto/elliptic', 'crypto/hmac', 'crypto/md5', 'crypto/rand', 'crypto/rc4', 'crypto/rsa',
    'crypto/sha1', 'crypto/sha256', 'crypto/sha512', 'crypto/subtle', 'crypto/tls', 'crypto/x509',
    'database', 'database/sql', 'database/sql/driver', 'debug', 'debug/dwarf', 'debug/elf',
    'debug/gosym', 'debug/macho', 'debug/pe', 'debug/plan9obj', 'embed', 'encoding',
    'encoding/ascii85', 'encoding/asn1', 'encoding/base32', 'encoding/base64', 'encoding/binary',
    'encoding/csv', 'encoding/gob', 'encoding/hex', 'encoding/json', 'encoding/pem', 'encoding/xml',
    'errors', 'expvar', 'flag', 'fmt', 'go', 'go/ast', 'go/build', 'go/constant', 'go/doc',
    'go/format', 'go/importer', 'go/parser', 'go/printer', 'go/scanner', 'go/token', 'go/types',
    'hash', 'hash/adler32', 'hash/crc32', 'hash/crc64', 'hash/fnv', 'hash/maphash', 'html',
    'html/template', 'image', 'image/color', 'image/color/palette', 'image/draw', 'image/gif',
    'image/jpeg', 'image/png', 'index', 'index/suffixarray', 'io', 'io/fs', 'io/ioutil',
    'log', 'log/syslog', 'math', 'math/big', 'math/bits', 'math/cmplx', 'math/rand', 'mime',
    'mime/multipart', 'mime/quotedprintable', 'net', 'net/http', 'net/http/cgi', 'net/http/cookiejar',
    'net/http/fcgi', 'net/http/httptest', 'net/http/httptrace', 'net/http/httputil', 'net/http/pprof',
    'net/mail', 'net/rpc', 'net/rpc/jsonrpc', 'net/smtp', 'net/textproto', 'net/url', 'os',
    'os/exec', 'os/signal', 'os/user', 'path', 'path/filepath', 'plugin', 'reflect', 'regexp',
    'regexp/syntax', 'runtime', 'runtime/cgo', 'runtime/debug', 'runtime/metrics', 'runtime/pprof',
    'runtime/trace', 'sort', 'strconv', 'strings', 'sync', 'sync/atomic', 'syscall', 'testing',
    'testing/fstest', 'testing/iotest', 'testing/quick', 'text', 'text/scanner', 'text/tabwriter',
    'text/template', 'text/template/parse', 'time', 'time/tzdata', 'unicode', 'unicode/utf16',
    'unicode/utf8', 'unsafe'
  ]
};

export const PATH_RESOLUTION_EXTENSIONS = {
  jsts: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '/index.js', '/index.ts', '/index.jsx', '/index.tsx'],
  cpp: ['.h', '.hpp', '.hxx', '.cpp', '.cc', '.cxx'],
  python: ['.py', '/__init__.py'],
  java: ['.java'],
  go: ['.go']
};

// Helper to detect language from file extension
export function getLanguageFromExtension(filePath) {
  const ext = filePath.substring(filePath.lastIndexOf('.'));
  
  if (FILE_EXTENSIONS.python.includes(ext)) return 'python';
  if (FILE_EXTENSIONS.cpp.includes(ext)) return 'cpp';
  if (FILE_EXTENSIONS.java.includes(ext)) return 'java';
  if (FILE_EXTENSIONS.go.includes(ext)) return 'go';
  return 'jsts'; // default to JS/TS
}
