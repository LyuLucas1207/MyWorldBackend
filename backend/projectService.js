const fs = require('fs');
const nodemailer = require('nodemailer');
const path = require('path');
const jwt = require('jsonwebtoken'); // 引入 jsonwebtoken 库
const {
    sendResponse,
    verifyToken,
    getFilePath,
    checkUserExistence,
    storeNewUser,
    readUserInfo,
    deleteMemberInfo,
    getHtmlEmailTemplate
} = require('./utility');

//hours: '1h'表示1小时后过期
//minutes: '1m'表示1分钟后过期
//seconds: '1s'表示1秒后过期
const expiresIn = '10m'; // token 过期时间
const SECRET_KEY = 'LucasLyu20031207-ZhouJingyi20050123'; // 密钥
const GOOGLE_EMAIL = 'lyuchongkai@gmail.com'; // 谷歌邮箱
const GOOGLE_PASS = 'xnjs flrs fjxt cces'; // 谷歌邮箱授权码
const providedInviteCode = "ProjectHub2024"; // 邀请码
const email_and_emailcode_time = {};
const headers = { 'Content-Type': 'application/json' };

function checkIdentity(req, res) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        sendResponse(res, 401, 1, headers);
        return;
    }
    const token = authHeader.split(' ')[1];
    const verified = verifyToken(token, SECRET_KEY);
    if (!verified) {
        sendResponse(res, 403, 1, headers);
        return;
    }
    sendResponse(res, 200, 5, headers);
}

function getProjectsData(req, res) {
    const authHeader = req.headers['authorization'];
    // 检查是否存在 Authorization 头
    if (!authHeader) {
        sendResponse(res, 401, 1, headers);
        return;
    }

    const token = authHeader.split(' ')[1]; // 获取 Bearer token
    const verified = verifyToken(token, SECRET_KEY); // 验证 token
    if (!verified) {
        sendResponse(res, 403, 1, headers);
        return;
    }

    // 如果 token 验证通过，读取并返回项目数据
    const filePath = path.join(__dirname, '../server/info_project.json');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            sendResponse(res, 500, 2, headers);
        } else {
            sendResponse(res, 200, 1, headers, JSON.parse(data));
        }
    });
}

async function getUserData(res, email, password) {
    const memberRecord = path.join(__dirname, '../server/members_info.json');
    try {
        const memberExists = await readUserInfo(memberRecord, email);
        if (!memberExists) {
            sendResponse(res, 200, 3, headers);
            return;
        }
        const memberPath = memberExists.path;
        const relativePath = path.join(__dirname, memberPath);
        const userExists = await readUserInfo(relativePath, email);
        if (!userExists) {
            /*删除memberRecord中的用户信息*/
            await deleteMemberInfo(memberRecord, email);
            sendResponse(res, 200, 3, headers);
            return;
        }

        if (userExists.password !== password) {
            sendResponse(res, 200, 2, headers);
            return;
        }
        const token = jwt.sign(
            {
                firstName: userExists.first_name,
                lastName: userExists.last_name,
                email: userExists.email,
                role: userExists.role
            },
            SECRET_KEY,
            { expiresIn: expiresIn }
        );
        sendResponse(res, 200, 0, headers, { token });
    } catch (error) {
        console.log("ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ")
        sendResponse(res, 500, 2, headers);
    }
}

async function signUpUserData(res, firstName, lastName, studentId, email, password, inviteCode, emailcode) {
    try {
        const emailRecord = email_and_emailcode_time[email];
        const currentTime = Date.now();
        const timeDiff = currentTime - emailRecord.time;

        if (!emailRecord) {
            sendResponse(res, 403, 4, headers); // 无验证码·请先获取验证码
            return;
        }
        if (emailRecord.emailcode !== emailcode) {
            sendResponse(res, 403, 2, headers); // 验证码错误
            return;
        }
        if (timeDiff > 5 * 60 * 1000) { // 5分钟有效期
            sendResponse(res, 403, 5, headers); // 验证码已过期
            return;
        }
        delete email_and_emailcode_time[email];
        if (inviteCode !== providedInviteCode) {
            sendResponse(res, 403, 3, headers); // 错误邀请码
            return;
        }

        const memberRecord = path.join(__dirname, '../server/members_info.json');
        const filePath = getFilePath('user');//path.join(__dirname, '../server/club_members/users/users_info.json');
        const memberExists = await checkUserExistence(memberRecord, email);
        const userExists = await checkUserExistence(filePath, email);

        if (memberExists || userExists) {
            sendResponse(res, 409, 1, headers); // 邮箱已被注册
            return;
        }

        const newUser = {
            first_name: firstName,
            last_name: lastName,
            student_id: studentId,
            email: email,
            password: password,
            role: 'user', // 默认角色为普通用户
        };
        const member = {
            email: email,
            path: "../server/club_members/users/users_info.json"
        };

        await storeNewUser(memberRecord, member);
        await storeNewUser(filePath, newUser);

        const token = jwt.sign(
            { firstName: newUser.first_name, lastName: newUser.last_name, email: newUser.email, role: newUser.role },
            SECRET_KEY,
            { expiresIn: expiresIn }
        );
        sendResponse(res, 201, 0, headers, { token });
    }catch (error) {
        sendResponse(res, 500, 2, headers);
    }
}

async function emailVertify(res, email) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: GOOGLE_EMAIL,
            pass: GOOGLE_PASS,
        },
    });

    const emailcode = generateMixedCode(email, 6, 'easy');

    // 初始的 mailOptions，仅设置基本信息
    let mailOptions = {
        from: process.env.GOOGLE_EMAIL,
        to: email,
        subject: '注册验证码(Registration Verification Code): ProjectHub',
        text: `您的验证码是：${emailcode}`,
    };

    try {
        const imagesDir = path.join(__dirname, 'src', 'pic');
        const imageFiles = await fs.promises.readdir(imagesDir);
        if (imageFiles.length > 0) {
            const imageFile = imageFiles[Math.floor(Math.random() * imageFiles.length)];
            const imagePath = `cid:unique@image.cid`;

            const htmlTemplatePath = path.join(__dirname, 'src', 'html', 'email.html');
            const htmlTemplate = await getHtmlEmailTemplate(htmlTemplatePath, emailcode, imagePath);

            // 更新 mailOptions 以包括 HTML 内容和附件
            mailOptions.html = htmlTemplate;
            mailOptions.attachments = [{
                filename: imageFile,
                path: path.join(imagesDir, imageFile),
                cid: 'unique@image.cid'  // 确保这与HTML模板中的cid相匹配
            }];
        }
    } catch (error) {
        console.error("Html template error: ", error);
        // 错误处理时，仍继续使用初始的 mailOptions，其中只有文本内容
    }

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Failed to send email:', error);
            sendResponse(res, 500, 1, headers);
        } else {
            sendResponse(res, 200, 6, headers);
        }
    });
}

function generateMixedCode(email, length, type) {
    let result;
    if (type === 'easy') {
        result = Math.floor(100000 + Math.random() * 900000).toString();
    } else {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        result = '';
        const charactersLength = characters.length;
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
    }
    email_and_emailcode_time[email] = { emailcode: result, time: Date.now() };
    return result;
}

function vertifyMixedCode(email, code) {
    const emailRecord = email_and_emailcode_time[email];
    const currentTime = Date.now();
    const timeDiff = currentTime - emailRecord.time;

    if (!emailRecord) {
        return 4; // 无验证码·请先获取验证码
    }
    if (emailRecord.emailcode !== code) {
        return 2; // 验证码错误
    }
    if (timeDiff > 5 * 60 * 1000) { // 5分钟有效期
        return 5; // 验证码已过期
    }
    delete email_and_emailcode_time[email];
    return 0;
}

module.exports = { getProjectsData, getUserData, checkIdentity, verifyToken, signUpUserData, emailVertify };

