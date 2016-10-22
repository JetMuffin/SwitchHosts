/**
 * @author oldj
 * @blog http://oldj.net
 */

'use strict';

import React from 'react';
import Frame from './frame';
import './login.less';

export default class SudoPrompt extends React.Component {
    constructor(props) {
        super(props);
        this.onSuccess = null;
        this.state = {
            show: false,
            remote_host: '',
            uname: '',
            pswd: ''
        }
    }

    componentDidMount() {
        SH_event.on('login_prompt', () => {
            this.setState({show: true});
            setTimeout(() => {
                let el = this.refs.body;
                el && el.querySelector('input').focus();
            }, 100);
        });
    }

    onOK() {

        if (this.state.remote_host === '') {
            this.refs.remote_host.focus();
            return false;
        }
        if (this.state.uname === '') {
            this.refs.uname.focus();
            return false;
        }
        if (this.state.pswd === '') {
            this.refs.pswd.focus();
            return false;
        }

        SH_event.emit('try_login', {
            remote_host: this.state.remote_host,
            uname: this.state.uname,
            pswd: this.state.pswd,
        });

        this.setState({
            show: false
        })
    }

    onCancel() {
        this.setState({
            show: false
        });
        this.onSuccess = null;
    }

    body() {
        return (
            <div ref="body">
                <div className="ln">
                    <div className="title">{SH_Agent.lang.login_remote_host}</div>
                    <div className="cnt">
                        <input
                            type="text"
                            ref="remote_host"
                            onChange={(e) => this.setState({remote_host: e.target.value})}
                        />
                    </div>
                </div>
                <div className="ln">
                    <div className="title">{SH_Agent.lang.login_uname}</div>
                    <div className="cnt">
                        <input
                            type="text"
                            ref="uname"
                            onChange={(e) => this.setState({uname: e.target.value})}
                        />
                    </div>
                </div>
                <div className="ln">
                    <div className="title">{SH_Agent.lang.login_pswd}</div>
                    <div className="cnt">
                        <input
                            type="password"
                            ref="pswd"
                            onChange={(e) => this.setState({pswd: e.target.value})}
                            onKeyDown={(e)=>(e.keyCode === 13 && this.onOK()||e.keyCode===27 && this.onCancel())}
                        />
                    </div>
                </div>
            </div>
        )
    }

    render() {
        return (
            <Frame
                show={this.state.show}
                head={SH_Agent.lang.login_title}
                body={this.body()}
                onOK={() => this.onOK()}
                onCancel={() => this.onCancel()}
            />
        );
    }
}
