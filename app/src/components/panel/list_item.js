/**
 * @author oldj
 * @blog http://oldj.net
 */

'use strict';

import React from 'react';
import classnames from 'classnames';
import {kw2re} from '../../libs/kw';
import './list_item.less';

export default class ListItem extends React.Component {
    constructor(props) {
        super(props);

        this.is_demo = !!this.props.demo;
        this.state = {
            is_selected: false,
            search_kw: '',
            search_re: null,
            // on: this.props.data.on,
        };

        SH_event.on('search', (kw) => {
            this.setState({
                search_kw: kw,
                search_re: kw ? kw2re(kw) : null
            });
        });

        ipcRenderer.on('tray_toggle_host', (e, idx) => {
            // ipcRenderer.send('send_host_list', this.state.list);
            // this.toggleOne(idx);
            if (idx === this.props.idx) {
                this.toggle();
            }
        });

    }

    getTitle() {
        return this.is_demo ? SH_Agent.lang.demo_job_title + ' ' + this.props.data.title : this.props.data.title || SH_Agent.lang.untitled;
    }

    beSelected() {
        // this.setState({
        //     is_selected: true
        // });

        this.props.selectOne(this.props.data);
    }

    toEdit() {
        SH_event.emit('edit_job', this.props.data);
    }

    submit() {
        if (!confirm(SH_Agent.lang.submit_job + this.props.data.title + '？')) return;
        SH_event.emit('submit_job', this.props.data);
    }

    allowedDrop(e) {
        e.preventDefault();
    }

    onDrop(e) {
        if (this.props.sys) {
            e.preventDefault();
            return false;
        }
        let source_idx = parseInt(e.dataTransfer.getData('text'));

        this.props.dragOrder(source_idx, this.props.idx);
    }

    onDrag(e) {
        e.dataTransfer.setData('text', this.props.idx);
    }

    isMatched() {
        if (this.props.sys) return true;
        let kw = this.state.search_kw;
        let re = this.state.search_re;
        if (!kw || kw === '/') return true;

        let {title, content} = this.props.data;

        if (re) {
            return re.test(title) || re.test(content);
        } else {
            return title.indexOf(kw) > -1 || content.indexOf(kw) > -1;
        }
    }

    render() {
        let {data, sys, current} = this.props;
        let is_selected = data == current;

        return (
            <div className={classnames({
                'list-item': 1
                , 'hidden': !this.isMatched()
                , 'sys-host': sys
                , 'selected': is_selected
            })}
                 onClick={this.beSelected.bind(this)}
                 draggable={!sys}
                 onDragStart={(e) => this.onDrag(e)}
                 onDragOver={(e) => this.allowedDrop(e)}
                 onDrop={(e) => this.onDrop(e)}
            >
                { sys ? null :
                    (
                        <div>
                            <i className={classnames({
                                'switch': 1
                                , 'iconfont': 1
                                , 'icon-sysserver': 1
                            })}
                               onClick={this.submit.bind(this)}
                            />
                            <i
                                className="iconfont icon-edit"
                                onClick={this.toEdit.bind(this)}
                            />
                        </div>
                    )
                }
                <i className={classnames({
                    'iconfont': 1
                    , 'item-icon': 1
                    , 'icon-doc': !sys
                    , 'icon-sysserver': sys
                })}/>
                <span>{this.getTitle()}</span>
            </div>
        );
    }
}
