/**
 * default_data, created on 2016/8/27.
 * @author oldj
 * @blog http://oldj.net
 */

'use strict';

function makeDefaultData() {
    return {
        demo: {
            is_demo: true,
            title: 'Demo job',
            queue: 'batch',
            nodes: '1',
            ppn: '1',
            command: 'hostname',
            editable: true,
            content: "#!/bin/sh -f\n#PBS -N Demo\n#PBS -l nodes=1:ppn=1\n#PBS -q batch\n\n hostname\n"
        },
        list: []
    };
}

exports.make = makeDefaultData;