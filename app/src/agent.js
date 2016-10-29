/**
 * @author oldj
 * @blog http://oldj.net
 *
 * 和系统、平台相关的方法
 */

'use strict';

const fs = require('fs');
const path = require('path');
const request = require('request');
const moment = require('moment');
const notifier = require('node-notifier');
const util = require('./libs/util');
const ssh = require('ssh2');
const platform = process.platform;

const paths = require('./libs/paths');
const pref = require('./libs/pref');
const sys_host_path = paths.sys_host_path;
const work_path = paths.work_path;
const data_path = paths.data_path;
const job_data_path = paths.job_data_path
const preference_path = paths.preference_path;

const exec = require('child_process').exec;
const stat = require('./modules/stat');
stat.init();

const crypto = require('crypto');
function md5(text) {
    return crypto.createHash('md5').update(text).digest('hex');
}

const m_lang = require('./lang');
let sudo_pswd = '';
let login_data = {};

function getUserLang() {
    let user_lang;

    let p_lang = location.search.match(/\blang=(\w+)/);

    user_lang = (p_lang && p_lang[1]) || pref.get('user_language') || navigator.language || navigator.userLanguage || '';
    user_lang = user_lang.toString().toLowerCase();

    if (user_lang == 'cn' || user_lang == 'zh_cn') {
        user_lang = 'cn';
    } else {
        user_lang = 'en';
    }

    return user_lang;
}

let lang_key = getUserLang();
const lang = m_lang.getLang(lang_key);

function getDemoJobs () {
    return [{
        is_demo: true,
        title: 'serial',
        queue: 'batch',
        nodes: '1',
        ppn: '1',
        directory: '/home/jlping/test',
        command: './abc',
        editable: false,
        content: "#!/bin/sh -f\n#PBS -N serial\n#PBS -l nodes=1:ppn=1\n#PBS -q batch\n\n cd /home/jlping/test\n\n ./abc\n"
    }, {
        is_demo: true,
        title: 'parallel',
        queue: 'batch',
        nodes: '1',
        ppn: '8',
        directory: '/home/jlping/test',
        command: '/share/apps/openmpi1.6.5-intel/bin/mpirun -np 8 /user1/jlping/test/pi ',
        editable: false,
        content: "#!/bin/sh -f\n#PBS -N parallel\n#PBS -l nodes=1:ppn=8\n#PBS -q batch\n\n cd /home/jlping/test\n\n /share/apps/openmpi1.6.5-intel/bin/mpirun -np 8 /user1/jlping/test/pi \n"
    }, {
        is_demo: true,
        title: 'gauss',
        queue: 'batch',
        nodes: '1',
        ppn: '1',
        command: 'source $g09root/g09/bsd/g09.login \n cd $PBS_O_WORKDIR \n\n NPROCS=`wc -l $PBS_NODEFILE |gawk \'//{print $1}\'` \n LINDA=`cat $PBS_NODEFILE | uniq | tr \'\n\' "," | sed \'s|,$||\' ` \n NODE_NUM=`cat $PBS_NODEFILE|uniq |wc -l` \n NP_PER_NODE=`expr $NPROCS / $NODE_NUM`\' \n\n #echo the multi-node options \n echo "%NProcShared=$NP_PER_NODE" | cat - /user1/jlping/test/g09/test.in > temp$$.inp \n sed -i "1i%lindaworkers=$LINDA" temp$$.inp \n g09 < temp$$.inp > $PBS_JOBID.log \n rm -f temp$$.inp',
        editable: false,
        content: '#!/bin/sh -f\n#PBS -N gauss\n#PBS -l nodes=1:ppn=1\n#PBS -q batch\n\n source $g09root/g09/bsd/g09.login \n cd $PBS_O_WORKDIR \n\n NPROCS=`wc -l $PBS_NODEFILE |gawk \'//{print $1}\'` \n LINDA=`cat $PBS_NODEFILE | uniq | tr \'\n\' "," | sed \'s|,$||\' ` \n NODE_NUM=`cat $PBS_NODEFILE|uniq |wc -l` \n NP_PER_NODE=`expr $NPROCS / $NODE_NUM`\' \n\n #echo the multi-node options \n echo "%NProcShared=$NP_PER_NODE" | cat - /user1/jlping/test/g09/test.in > temp$$.inp \n sed -i "1i%lindaworkers=$LINDA" temp$$.inp \n g09 < temp$$.inp > $PBS_JOBID.log \n rm -f temp$$.inp \n'
    }, {
        is_demo: true,
        title: 'vasp',
        queue: 'batch',
        nodes: '1',
        ppn: '8',
        directory: '/home/jlping/test/vasp',
        command: '/share/apps/openmpi1.6.5-intel/bin/mpirun -np 8 /share/apps/vasp/vasp4/vasp.4.6/vasp',
        editable: false,
        content: "#!/bin/sh -f\n#PBS -N gauss\n#PBS -l nodes=1:ppn=8\n#PBS -q batch\n\n cd /home/jlping/test/vasp \n\n /share/apps/openmpi1.6.5-intel/bin/mpirun -np 8 /share/apps/vasp/vasp4/vasp.4.6/vasp"
    }]
}

function tryToCreateWorkDir() {
    if (util.isDirectory((work_path))) {
        console.log('work dir exists.');
        return;
    }

    console.log(`try to create work directory: ${work_path}`);
    try {
        fs.mkdirSync(work_path);
        console.log('work directory created.');
    } catch (e) {
        alert('Fail to create work directory!');
    }
}

function saveData(content) {

    let txt = JSON.stringify({
        list: content
    });

    fs.writeFile(data_path, txt, 'utf-8', (error) => {
        if (error) {
            alert(error.message);
        }
    });
}

function tryToLogin(data) {
    var conn = new ssh.Client();
    conn.on('ready', function () {
        console.log('Client :: ready');
        SH_event.emit('login_success');
        login_data = data;
    }).on('error', function (err) {
        console.log('Client :: error: ', err);
        SH_event.emit('login_fail')
    }).connect({
        host: data.remote_host,
        port: 22,
        username: data.uname,
        password: data.pswd
    });
}

function submitJob (job, data) {
    console.log(data);
    var conn = new ssh.Client();
    conn.on('ready', function () {
        let content = job.content || getContent(job);
        conn.exec('echo "' + content.replace(/\"/g, "\\\"") + '" | qsub', function (err, stream) {
            if (err) {
                console.log('Client :: error ', error);
                alert(lang.job_submit_error + ":" + error);
            }
            stream.on('data', function (data) {
                console.log('STDOUT: ' + data);
                alert(lang.job_submit_info + ":" + data);
            }).stderr.on('data', function (data) {
                console.log('STDERR: ' + data);
                alert(lang.job_submit_error + ":" + data);
            })
        })
    }).on('error', function (err) {
        alert(lang.job_submit_error + ":" + err);
    }).connect({
        host: data.remote_host,
        port: 22,
        username: data.uname,
        password: data.pswd
    })
}

// init
tryToCreateWorkDir();

SH_event.on('test', () => {
    console.log('ttt');
});

SH_event.on('try_login', (data) => {
    tryToLogin(data);
});

SH_event.on('submit_job', (job) => {
    if (!login_data.remote_host || !login_data.uname || !login_data.pswd) {
        SH_event.emit('login_prompt');
        return;
    }

    submitJob(job, login_data);
});

SH_event.on('show_app', (pswd) => {
    ipcRenderer.send('show_app');
});

SH_event.on('save_data', (content) => {
    saveData(content);
    ipcRenderer.send('send_host_list', content);
});

SH_event.on('check_host_refresh', (host, force = false) => {
    if (host.where !== 'remote' || !host.url || (!force && !host.refresh_interval)) {
        return;
    }

    let last_refresh = host.last_refresh;
    let refresh_interval = parseInt(host.refresh_interval) || 0;
    if (last_refresh && !force) {
        last_refresh = new Date(last_refresh);
        let delta = ((new Date()).getTime() - (last_refresh.getTime() || 0)) / (1000 * 3600);
        if (delta < refresh_interval) {
            return;
        }
    }

    // refresh
    // console.log(`getting '${host.url}' ..`);
    SH_event.emit('loading', host);
    host.is_loading = true;
    request(host.url, (err, res, body) => {
        console.log('got', res && res.statusCode);
        let out = {};
        // console.log(err, res && res.statusCode);
        host.is_loading = false;
        if (!err && res.statusCode === 200) {
            // console.log(body);
            host.content = body;
            host.last_refresh = moment().format('YYYY-MM-DD HH:mm:ss');

            SH_event.emit('change');
        } else {
            console.log(err, res && res.statusCode);
            out.content = 'Error: ' + err.message;
        }
        SH_event.emit('loading_done', host, Object.assign({}, host, out));
    });
});

function getContent(job) {
    let content = "";
    content += "#!/bin/sh -f\n";

    if(job.title) content += "#PBS -N " + job.title + "\n";
    if(job.queue) content += "#PBS -q " + job.queue + "\n";
    if(job.nodes) content += "#PBS -l nodes=" + job.nodes + ":ppn=" + job.ppn + "\n";
    if(job.directory) content += "\n" + "cd " + job.directory + "\n";
    if(job.command) content += "\n" + job.command + "\n";

    return content;
}

/**
 * 如果本地没有 data 文件，认为是第一次运行
 */
function initGet() {
    let dd = require('./libs/default_data');
    let data = dd.make();

    return data;
}
module.exports = {
    md5: md5,
    getJobs: function () {
        let data = null;

        if (!util.isFile(data_path)) {
            return initGet();
        }

        try {
            let cnt = fs.readFileSync(data_path, 'utf-8');
            data = JSON.parse(cnt);
        } catch (e) {
            console.log(e);
            alert('bad data file.. :(');
            return initGet();
        }

        return {
            demo: getDemoJobs(),
            list: data.list.map((i) => {
                let item = {
                    title: i.title || ''
                    , queue: i.queue || ''
                    , nodes: i.nodes || ''
                    , ppn: i.ppn || ''
                    , command: i.command || ''
                    , on: !!i.on
                    , editable: true
                    , last_refresh: i.last_refresh || null
                    , refresh_interval: i.refresh_interval || 0
                };
                item.content = i.content || getContent(i);
                return item
            })
        };
    },
    getContent: function (job) {
        return getContent(job);
    },
    parseContent: function (content) {
        return parseContent(content);
    },
    readFile: function (fn, callback) {
        fs.readFile(fn, 'utf-8', callback);
    },
    notify: (options) => {
        notifier.notify(Object.assign({
            title: 'Torque-tool!',
            message: '',
            icon: path.join(__dirname, 'assets', 'logo_512.png')
        }, options));
    },
    lang: lang,
    lang_key: lang_key,
    pref: pref,
    relaunch() {
        ipcRenderer.send('relaunch');
    }
};
