const fs = require('fs');
const path = require('path');
const readline = require('readline');
const nodemailer = require('nodemailer');

const configFile = path.resolve(__dirname, './config.json');

const getConfig = (configFile) => {
    return new Promise((resolve, reject) => {
        fs.readFile(configFile, 'utf-8', (err, data) => {
            if (err) {
                reject(err);
            }
            try {
                const json = JSON.parse(data);
                resolve(json);
            } catch (err) {
                reject(err);
            }
        });
    });
}

const getLineCount = (file) => {
    return new Promise((resolve, reject) => {
        let count = 0;
        let lastLine = '';
        readline.createInterface({
            input: fs.createReadStream(file)
        })
        .on('line', (line) => {
            lastLine = line;
            count++;
        })
        .on('close', (e) => {
            resolve({ count, lastLine });
        });
    });
};

const watch = (file, callback) => {
    let linesCount = 0;
    fs.watch(file, (event) => {
        getLineCount(file)
        .then((result) => {
            const { count, lastLine } = result; 
            if (linesCount != count) {
                linesCount = count;
                callback(lastLine);
            }
        });
    });
};

const sendMail = (transporter, mailOptions) => {
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log(info);
    });
};

getConfig(configFile)
.then((config) => {
    const { targetfile, smtp, mail, project } = config;
    const transporter = nodemailer.createTransport(smtp);
    watch(targetfile, (lastLine) => {
        sendMail(transporter, {
            ...mail,
            subject: `Error on project ${project}`,
            text: lastLine,
        });
    });
})
.catch((err) => {
    console.log(err);
    process.exit(1);
});