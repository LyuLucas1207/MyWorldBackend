const jwt = require('jsonwebtoken'); // 引入 jsonwebtoken 库
const path = require('path');
const fs = require('fs');

function codeDefine(status, code, data = null) {
    // 定义状态码和消息
    const codeObj = {
        200: {
            0: '登录成功',
            1: '信息请求成功',
            2: '密码错误',
            3: '邮箱不存在',
            4: '无法确认的信息异常, 请联系管理员, 你是不是在乱搞啊',
            5: '身份验证成功',
            6: '验证码发送成功'
        },
        201: {
            0: '用户成功注册',
        },
        204: {
            1: '检查是否是HTTPS请求'
        },
        500: {
            1: '未知错误',
            2: '无法读取文件'
        },
        400: {
            1: '未知的操作',
            2: '所有字段都是必填的',
        },
        401: {
            1: '未提供 token',
        },
        403: {
            1: 'token 无效或过期',
            2: '验证码错误',
            3: '错误邀请码',
            4: '无验证码·请先获取验证码',
            5: '验证码已过期',
        },
        404: {
            1: '路径未找到',
        },
        409: {
            1: '邮箱已被注册',
            2: '邀请码错误',
        },
        999: {
            0: '前所未有的错误'
        }
    };

    // 确保 status 和 code 有定义
    const msg = codeObj[status] && codeObj[status][code] ? codeObj[status][code] : '未定义的错误';

    // 返回 JSON 字符串，包含状态码、消息和可选的数据
    console.log(JSON.stringify({ code, msg, data }));
    console.log(status);
    return JSON.stringify({code, msg, data });
}

function sendResponse(res, statusCode = 999, codeIndex = 0, headers = { 'Content-Type': 'application/json' }, data = null) {
    res.writeHead(statusCode, headers);
    res.end(codeDefine(statusCode, codeIndex, data));
}

function verifyToken(token, SECRET_KEY) {
    try {
        return jwt.verify(token, SECRET_KEY); // 验证 token
    } catch (error) {
        return null; // token 无效或过期
    }
}

function getRole(token) {
    //! 从 token 中解析出用户信息
    /* "role": "superadmin"
    ! superadmin: 超级管理员，拥有所有权限以下, 额外权限：设置admin权限 （无法提升其他用户为superadmin）
    ! admin: 管理员，拥有所有权限以下，额外权限：删除他人项目，设置其他以下用户权限（无法提升其他用户为admin）
    ! 
    * manager_admin: 管理员管理员，特殊职能, 获得用户反馈，直接处理用户问题
    ! manager_ad: 广告管理员，可以增删改查自己的项目，额外权限：增删改查自己管理部门的项目
    ! manager_ar: 艺术管理员，可以增删改查自己的项目，额外权限：增删改查自己管理部门的项目
    ! manager_bu: 建筑管理员，可以增删改查自己的项目，额外权限：增删改查自己管理部门的项目
    ! manager_cs: 计算机管理员，可以增删改查自己的项目，额外权限：增删改查自己管理部门的项目
    ! manager_en: 工程管理员，可以增删改查自己的项目，额外权限：增删改查自己管理部门的项目
    ! manager_hr: 人事管理员，可以增删改查自己的项目，额外权限：增删改查自己管理部门的项目
    ! manager_eg: 电子管理员，可以增删改查自己的项目，额外权限：增删改查自己管理部门的项目
    ! manager_fi: 金融管理员，可以增删改查自己的项目，额外权限：增删改查自己管理部门的项目
    ! user: 普通用户，可以增删改查自己的项目，查看所有项目
    ! 
    */
    //判断token是否过期
    const tokenData = jwt.verify(token, SECRET_KEY);
    if (!tokenData) {
        return null;
    } else {
        return tokenData.role;
    }
}

function getEmail(token) {
    //判断token是否过期
    const tokenData = jwt.verify(token, SECRET_KEY);
    if (!tokenData) {
        return null;
    } else {
        return tokenData.email;
    }
}

function getFirstName(token) {
    //判断token是否过期
    const tokenData = jwt.verify(token, SECRET_KEY);
    if (!tokenData) {
        return null;
    } else {
        return tokenData.firstName;
    }
}

function getLastName(token) {
    //判断token是否过期
    const tokenData = jwt.verify(token, SECRET_KEY);
    if (!tokenData) {
        return null;
    } else {
        return tokenData.lastName;
    }
}

function getFilePath(role) {
    // 检查不同的角色并返回相应的文件路径
    let filePath = '';
    if (role === 'superadmin') {
        filePath = path.join(__dirname, '../server/club_members/superadmins/superadmin_info.json');
    } else if (role === 'admin') {
        filePath = path.join(__dirname, '../server/club_members/admins/admins_info.json');
    } else if (role === 'manager_admin') {
        filePath = path.join(__dirname, '../server/club_members/manageradmins/manageradmins_info.json');
    } else if (role.startsWith('manager_')) {
        // 获取具体的部门信息，manager_{department} 格式
        const department = role.split('_')[1];
        const departmentFolder = path.join(__dirname, `../server/club_members/managers/${department}`);
        // 如果目录不存在，则创建目录
        if (!fs.existsSync(departmentFolder)) {
            fs.mkdirSync(departmentFolder, { recursive: true });
        }
        filePath = path.join(departmentFolder, `${department}_info.json`);
        // 如果文件不存在，则创建文件
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify([])); // 先创建一个空的 JSON 文件
        }
    } else if (role === 'user') {
        filePath = path.join(__dirname, '../server/club_members/users/users_info.json');
    } else {
        return null;
    }
    return filePath;

}

async function checkFileEmpty(filePath) {
    try {
        let data = await fs.promises.readFile(filePath, 'utf8');
        if (!data) {
            // console.log('File is empty, initializing with an empty object.');
            await fs.promises.writeFile(filePath, '{}'); // 文件内容为空，写入空对象 {}
        } else { // 尝试解析 JSON，如果解析出错，视为数据损坏，也重新初始化
            try {
                const members = JSON.parse(data);
                // console.log('File contains:', members);
            } catch (parseError) {
                // console.error('Invalid JSON format, reinitializing file.');
                await fs.promises.writeFile(filePath, '{}'); // JSON 解析错误，重新初始化文件
            }
        }
    } catch (err) {
        if (err.code === 'ENOENT') {// 文件不存在，创建文件并初始化为 {}
            // console.error('File not found, creating and initializing with an empty object.');
            await fs.writeFile(filePath, '{}');
        } else {// 对于其他错误，重新抛出，可能是读取或权限错误
            // console.error('An error occurred:', err);
            throw err;
        }
    }
}

async function readUserInfo(filePath, email) {
    await checkFileEmpty(filePath);
    const data = await fs.promises.readFile(filePath, 'utf8');
    const users = JSON.parse(data);
    for (const user in users) {
        if (users[user].email === email) {
            return users[user];
        }
    }
    return null;
}

async function checkUserExistence(memberRecord, email) {
    await checkFileEmpty(memberRecord);
    const data = await fs.promises.readFile(memberRecord, 'utf8');
    const members = JSON.parse(data);
    for (const member in members) {
        if (members[member].email === email) {
            return true;
        }
    }
    return false;
}

async function storeNewUser(filePath, user) {
    await checkFileEmpty(filePath);
    const data = await fs.promises.readFile(filePath, 'utf8');
    let users = JSON.parse(data);
    const newUserKey = `User${Object.keys(users).length + 1}`;
    users[newUserKey] = user;
    await fs.promises.writeFile(filePath, JSON.stringify(users, null, 4), 'utf8');
}

async function deleteMemberInfo(filePath, email) {
    const data = await fs.promises.readFile(filePath, 'utf8');
    const members = JSON.parse(data);
    for (const userId in members) {
        if (members[userId].email === email) {
            delete members[userId]; // Delete the user's record
            await fs.promises.writeFile(filePath, JSON.stringify(members, null, 4)); // Write back the modified object
            console.log(`Deleted user ${email} from members record.`);
            break;
        }
    }
}

async function getHtmlEmailTemplate(filePath, code, imagePath) {
    try {
        let template = await fs.promises.readFile(filePath, 'utf8');
        template = template.replace('{{code}}', code);
        template = template.replace('{{imagePath}}', imagePath);
        return template;
    } catch (error) {
        throw new Error('Error reading or replacing in template:', error);
    }
}


module.exports = {
    codeDefine,
    sendResponse,
    verifyToken,
    getRole,
    getEmail,
    getFirstName,
    getLastName,
    getFilePath,
    checkUserExistence,
    storeNewUser,
    readUserInfo,
    checkFileEmpty,
    deleteMemberInfo,
    getHtmlEmailTemplate

}; // 导出 sendResponse 函数，供其他模坍使用
