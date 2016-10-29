/**
 * @author oldj
 * @blog http://oldj.net
 */

'use strict';

import React from 'react';
import Panel from './panel/panel';
import Content from './content/content';
import SudoPrompt from './frame/login';
import EditPrompt from './frame/edit';
import PreferencesPrompt from './frame/preferences';
import './app.less';

class App extends React.Component {
    constructor(props) {
        super(props);

        let _data = SH_Agent.getJobs();
        this.state = {
            jobs: _data,
            demos: _data.demo,
            current: _data.demo[0],
        };

        SH_event.on('after_apply', () => {
            if (this.state.current.is_sys) {
                // 重新读取
                this.setState({
                    current: SH_Agent.getSysHosts()
                });
            }
        });

        ipcRenderer.on('to_import', (e, fn) => {
            if (!confirm(SH_Agent.lang.confirm_import)) return;

            SH_Agent.readFile(fn, (err, cnt) => {
                if (err) {
                    alert(err.message || 'Import Error!');
                    return;
                }
                let data;
                try {
                    data = JSON.parse(cnt);
                } catch (e) {
                    console.log(e);
                    alert(e.message || 'Bad format, the import file should be a JSON file.');
                    return;
                }

                if (!data.list || !Array.isArray(data.list)) {
                    alert('Bad format, the data JSON should have a [list] field.');
                    return;
                }

                this.setState({
                    hosts: Object.assign({}, this.state.hosts, {list: data.list})
                }, () => {
                    SH_event.emit('imported');
                });
                console.log('imported.');
            })
        });
    }

    setCurrent(job) {
        this.setState({
           current: job
        });

        // this.setState({
        //     current: host.is_sys ? SH_Agent.getSysHosts() : host
        // });
    }

    static isReadOnly(job) {
        return !job.editable;
        // return host.is_sys || host.where == 'remote';
    }

    toSave() {
        clearTimeout(this._t);

        this._t = setTimeout(() => {
            SH_event.emit('change');
        }, 1000);
    }


    setJobContent(v) {
        if (this.state.current.content == v) return; // not changed

        this.state.current.content = v || '';
        this.toSave();
    }

    componentDidMount() {
        window.addEventListener('keydown', (e) => {
            if (e.keyCode === 27) {
                SH_event.emit('esc');
            }
        }, false);
    }

    render() {
        let current = this.state.current;
        return (
            <div id="app" className={'platform-' + platform}>
                <Panel jobs={this.state.jobs} demos={this.state.demos} setCurrent={this.setCurrent.bind(this)}/>
                <Content current={current} readonly={App.isReadOnly(current)}
                         setJobContent={this.setJobContent.bind(this)}/>
                <div className="frames">
                    <SudoPrompt/>
                    <EditPrompt/>
                    <PreferencesPrompt/>
                </div>
            </div>
        );
    }
}

export default App;
