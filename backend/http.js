
// const http = require('http');
// const { handleRequest } = require('./requestHandler'); // 引入请求处理模块
// const fs = require('fs');

// // 服务器端口
// const port = 9999;

// // const options = {
// //     key: fs.readFileSync('/volume2/ProJData/PersonlData/ssl.crt'), // 使用绝对路径
// //     cert: fs.readFileSync('/volume2/ProJData/PersonlData/ssl.crt') // 使用绝对路径
// // };

// // 创建 HTTP 服务器，并使用请求处理模块
// const server = http.createServer(handleRequest);

// // 启动服务器
// server.listen(port, () => {
//     console.log(`服务器正在运行在 http://localhost:${port}`);
// });


const https = require('https'); // 使用 https 模块
const { handleRequest } = require('./requestHandler'); // 引入请求处理模块
const fs = require('fs');

// 服务器端口
const port = 9999;

// 加载 SSL 证书和密钥
const options = {
    // key: fs.readFileSync('/volume2/ProJData/PersonalData/ssl.key'), // SSL 私钥文件路径
    // cert: fs.readFileSync('/volume2/ProJData/PersonalData/ssl.crt') // SSL 证书文件路径
    key: fs.readFileSync('./ssl.key'), // SSL 私钥文件路径
    cert: fs.readFileSync('./ssl.crt') // SSL 证书文件路径
};

// 创建 HTTPS 服务器，并使用请求处理模块
const server = https.createServer(options, handleRequest);

// 启动服务器
server.listen(port, () => {
    console.log(`服务器正在运行在 https://localhost:${port}`);
});
