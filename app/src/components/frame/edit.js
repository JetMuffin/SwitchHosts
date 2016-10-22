/**
 * @author oldj
 * @blog http://oldj.net
 */

'use strict';

import React from 'react';
import Frame from './frame';
import classnames from 'classnames';
import './edit.less';

export default class EditPrompt extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            show: false,
            add: true,
            title: '',
            queue: '',
            nodes: '',
            ppn: '',
            command: '',
            editable: true,
            last_refresh: null,
            refresh_interval: 0,
            is_loading: false
        };

        this.current_job = null;
    }

    tryToFocus() {
        let el = this.refs.body && this.refs.body.querySelector('input[type=text]');
        el && el.focus();
    }

    clear() {
        this.setState({
            title: '',
            queue: '',
            nodes: '',
            ppn: '',
            command: '',
            last_refresh: null,
            refresh_interval: 0,
        });
    }

    componentDidMount() {
        this.clear()
        SH_event.on('add_job', () => {
            this.setState({
                show: true,
                add: true
            });
            setTimeout(() => {
                this.tryToFocus();
            }, 100);
        });

        SH_event.on('edit_job', (job) => {
            this.current_job = job;
            this.setState({
                show: true,
                add: false,
                title: job.title,
                command: job.command,
                queue: job.queue,
                ppn: job.ppn,
                nodes: job.nodes,
                editable: true,
                last_refresh: job.last_refresh || null,
                refresh_interval: job.refresh_interval || 0
            });
            setTimeout(() => {
                this.tryToFocus();
            }, 100);
        });

        SH_event.on('loading_done', (old_job, data) => {
            if (old_job === this.current_job) {
                this.setState({
                    last_refresh: data.last_refresh,
                    is_loading: false
                });
                SH_event.emit('job_refreshed', data, this.current_job);
            }
        });
    }

    onOK() {
        this.setState({
            title: (this.state.title || '').replace(/^\s+|\s+$/g, ''),
        });

        if (this.state.title === '') {
            this.refs.title.focus();
            return false;
        }
        if (this.state.queue === '') {
            this.refs.queue.focus();
            return false;
        }
        if (this.state.command === '') {
            this.refs.command.focus();
            return false;
        }

        let data = Object.assign({}, this.current_job, this.state);
        data.content = SH_Agent.getContent(data);
        data.writable = true;

        delete data['add'];
        SH_event.emit('job_' + (this.state.add ? 'add' : 'edit') + 'ed', data, this.current_job);

        this.setState({
            show: false
        });
        this.clear();
    }

    onCancel() {
        this.setState({
            show: false
        });
        this.clear();
    }

    confirmDel() {
        if (!confirm(SH_Agent.lang.confirm_del)) return;
        SH_event.emit('del_job', this.current_job);
        this.setState({
            show: false
        });
        this.clear();
    }

    static getRefreshOptions() {
        let k = [
            [0, `${SH_Agent.lang.never}`],
            // [0.002778, `10s`], // test only
            [1, `1 ${SH_Agent.lang.hour}`],
            [24, `24 ${SH_Agent.lang.hours}`],
            [168, `7 ${SH_Agent.lang.days}`]
        ];
        return k.map(([v, n], idx) => {
            return (
                <option value={v} key={idx}>{n}</option>
            );
        });
    }

    getEditOperations() {
        if (this.state.add) return null;

        return (
            <div>
                <div className="ln">
                    <a href="#" className="del"
                       onClick={this.confirmDel.bind(this)}
                    >
                        <i className="iconfont icon-delete"/>
                        <span>{SH_Agent.lang.del_job}</span>
                    </a>
                </div>
            </div>
        );
    }

    refresh() {
        if (this.state.is_loading) return;

        SH_event.emit('check_job_refresh', this.current_job, true);
        this.setState({
            is_loading: true
        }, () => {
            setTimeout(() => {
                this.setState({
                    is_loading: false
                });
            }, 1000);
        });
    }

    body() {
        return (
            <div ref="body">
                <div className="ln">
                    <div className="title">{SH_Agent.lang.job_title}</div>
                    <div className="cnt">
                        <input
                            type="text"
                            ref="title"
                            name="text"
                            value={this.state.title}
                            onChange={(e) => this.setState({title: e.target.value})}
                            onKeyDown={(e)=>(e.keyCode === 13 && this.onOK() || e.keyCode === 27 && this.onCancel())}
                        />
                    </div>
                </div>
                <div className="ln">
                    <div className="title">{SH_Agent.lang.job_queue}</div>
                    <div className="cnt">
                        <input
                            type="text"
                            ref="queue"
                            name="text"
                            value={this.state.queue}
                            onChange={(e) => this.setState({queue: e.target.value})}
                        />
                    </div>
                </div>
                <div className="ln inline">
                    <div className="title">{SH_Agent.lang.job_nodes}</div>
                    <div className="cnt">
                        <input
                            type="text"
                            ref="nodes"
                            name="text"
                            value={this.state.nodes}
                            onChange={(e) => this.setState({nodes: e.target.value})}
                        />
                    </div>
                </div>
                <div className="ln inline right">
                    <div className="title">{SH_Agent.lang.job_ppn}</div>
                    <div className="cnt">
                        <input
                            type="text"
                            ref="ppn"
                            name="text"
                            value={this.state.ppn}
                            onChange={(e) => this.setState({ppn: e.target.value})}
                        />
                    </div>
                </div>
                <div className="ln">
                    <div className="title">{SH_Agent.lang.job_command}</div>
                    <div className="cnt">
                            <textarea
                                type="text"
                                ref="command"
                                name="text"
                                onChange={(e) => this.setState({command: e.target.value})}
                            >{this.state.command}</textarea>
                    </div>
                </div>
                {this.getEditOperations()}
            </div>
        )
    }

    render() {
        return (
            <Frame
                show={this.state.show}
                head={SH_Agent.lang[this.state.add ? 'add_job' : 'edit_job']}
                body={this.body()}
                onOK={() => this.onOK()}
                onCancel={() => this.onCancel()}
            />
        );
    }
}
