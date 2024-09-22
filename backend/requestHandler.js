const { getProjectsData, getUserData, checkIdentity, signUpUserData, emailVertify } = require('./projectService'); // 引入项目数据、用户数据和身份验证的服务模块
const fs = require('fs');
const { sendResponse } = require('./utility'); // 引入状态码定义函数
const { send } = require('process');

// 处理 HTTP 请求的主函数
function handleRequest(req, res) {
    // 允许的跨域来源列表，指定可以访问的前端来源
    const allowOrigin = [
        'https://192.168.1.109', // 局域网开发环境
        'https://192.168.1.75',   // 局域网开发环境
        'https://www.lucaslyu.com',   // 生产环境的域名 (HTTPS)
        'https://lucaslyu.com'        // 简化域名 (HTTPS)
    ];

    // 获取请求来源的 origin，进行跨域检测
    const origin = req.headers.origin;
    if (allowOrigin.includes(origin)) {
        // 如果来源在允许的列表中，设置 CORS 响应头，允许跨域访问
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        // 如果来源不在允许的列表中，不设置 CORS 响应头，不允许跨域访问
        res.setHeader('Access-Control-Allow-Origin', '*');

    }

    // 设置允许的 HTTP 方法和自定义头字段
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    console.log('请求方法:', req.method, '请求路径:', req.url);

    // 处理 OPTIONS 请求，这是浏览器在执行 POST 请求前会发出的预检请求，通常用于跨域请求的安全检查
    if (req.method === 'OPTIONS') {
        sendResponse(res, 204, 1); // 返回 204 No Content 状态码
        return;
    }

    // 处理 POST 请求，根据不同的 action 来分发处理逻辑
    if (req.method === 'POST' && req.url === '/') {
        let body = '';

        // 收集 POST 请求体中的数据块
        req.on('data', chunk => {
            body += chunk.toString(); // 将二进制数据转换为字符串
        });

        // 数据接收完毕后进行处理
        req.on('end', () => {
            const requestData = JSON.parse(body); // 将接收到的字符串解析为 JSON 对象
            console.log('收到的数据:', requestData);
            // 根据请求中的 action 字段选择处理逻辑
            if (requestData.action === 'checkIdentity') {
                checkIdentity(req, res);
            } else if (requestData.action === 'getProjects') {
                getProjectsData(req, res);
            } else if (requestData.action === 'login') {
                const { email, password } = requestData; // 从请求体中提取 email 和 password
                getUserData(res, email, password);       // 验证用户
            } else if (requestData.action === 'signup') {
                const { firstName, lastName, studentId, email, password, inviteCode, emailcode } = requestData; // 从请求体中提取用户注册信息
                if (!firstName || !lastName || !studentId || !email || !password || !inviteCode || !emailcode) {
                    sendResponse(res, 400, 2); // 返回 400 Bad Request 状态码
                    return;
                }
                signUpUserData(res, firstName, lastName, studentId, email, password, inviteCode, emailcode); // 注册用户
            } else if (requestData.action === 'emailVertify') {
                const { email } = requestData; // 从请求体中提取 email
                emailVertify(res, email); // 验证邮箱
            } else {
                sendResponse(res, 400, 1); // 返回 400 Bad Request 状态码
            }
        });
    } else {
        sendResponse(res, 404, 1); // 返回 404 Not Found 状态码
    }
}

module.exports = { handleRequest }; // 导出 handleRequest 函数，供其他模块使用
