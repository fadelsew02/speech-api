require('dotenv').config();
const https = require('https');
const querystring = require('querystring');
const fs = require("fs");
const { randomUUID } = require("crypto");

const API_KEY_ID = process.env.API_KEY_ID;
const API_KEY_SECRET = process.env.API_KEY_SECRET;
const LANG = process.env.LANG;
const RESULT_TYPE = process.env.RESULT_TYPE;

const function_global = async (filePath) => {
    try {
        const createData = querystring.stringify({
            lang: LANG,
            remotePath: filePath
        });
        const sentences = await submitLocalFile(filePath, createData);
        const result = sentences.map(sentence => sentence.s).join(' ');
        return result;
    } catch (error) {
        return { error: error.message };
    }
}


const submitLocalFile = (filePath, createData) => {
    return new Promise((resolve, reject) => {
    let formData = '';
	    const boundary = randomUUID().replace(/-/g, "");
	    formData += "--" + boundary + "\r\n";
	    formData += 'Content-Disposition: form-data; name="file"; filename="' + getFileNameByPath(filePath) + '"\r\n';
	    formData += "Content-Type: application/octet-stream\r\n\r\n";
	    let formDataBuffer = Buffer.concat([
	        Buffer.from(formData, "utf8"),
	        fs.readFileSync(filePath),
	        Buffer.from("\r\n--" + boundary + "--\r\n", "utf8"),
	    ]);
	    createRequest = https.request({
	        method: 'POST',
	        headers: {
	            "Content-Type": `multipart/form-data; boundary=${boundary}`,
	            "Content-Length": formDataBuffer.length,
	            'keyId': API_KEY_ID,
	            'keySecret': API_KEY_SECRET,
	        },
	        hostname: 'api.speechflow.io',
	        path: '/asr/file/v1/create?lang=' + LANG
	    });
	    createRequest.write(formDataBuffer);
        
        createRequest.on('response', (createResponse) => {
            let responseData = '';
            createResponse.on('data', (chunk) => {
                responseData += chunk;
            });

            createResponse.on('end', () => {
                let taskId
                const responseJSON = JSON.parse(responseData);
                
                if (responseJSON.code == 10000) {
                    taskId = responseJSON.taskId;
                } else {
                    console.log("create error:");
                    console.log(responseJSON.msg);
                    reject(new Error(responseJSON.msg));
                    return;
                }
         
                let intervalID = setInterval(() => {
                    const queryRequest = https.request({
                        method: 'GET',
                        headers: {
                            'keyId': API_KEY_ID,
                            'keySecret': API_KEY_SECRET
                        },
                        hostname: 'api.speechflow.io',
                        path: '/asr/file/v1/query?taskId=' + taskId + '&resultType=' + RESULT_TYPE
                    }, (queryResponse) => {
                        let responseData = '';
         
                        queryResponse.on('data', (chunk) => {
                            responseData += chunk;
                        });
         
                        queryResponse.on('end', () => {
                            const responseJSON = JSON.parse(responseData);
                            if (responseJSON.code === 11000) {
                                // console.log('transcription result:');
                                // console.log(responseData);
                                clearInterval(intervalID);
                                const sentences = JSON.parse(responseJSON.result).sentences;
                                resolve(sentences);
                            } else if (responseJSON.code == 11001) {
                                console.log('waiting');
                            } else {
                                // console.log(responseJSON);
                                // console.log("transcription error:");
                                // console.log(responseJSON.msg);
                                clearInterval(intervalID);
                                reject(new Error(responseJSON.msg));
                            }
                        });
                    });
         
                    queryRequest.on('error', (error) => {
                        console.error(error);
                        reject(error);
                    });
                    queryRequest.end();
                }, 3000);
            });
        });
         
        createRequest.on('error', (error) => {
            console.error(error);
            reject(error);
        });
         
        createRequest.write(createData);
        createRequest.end();
    });
}

const getFileNameByPath = (path) => {
    let index = path.lastIndexOf("/");
    return path.substring(index + 1);
};

module.exports = {
    function_global
};