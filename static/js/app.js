var beanstalker = {};

beanstalker.Job = function(data) {
    this.id = m.prop(data.id);
    this.data = m.prop(data.data);
};

beanstalker.vm = {
    init: function() {
        beanstalker.vm.CurrentTube = m.prop('default');
        beanstalker.vm.IsServiceListening = m.prop(false);
        beanstalker.vm.IsTubePaused = m.prop(false);
        beanstalker.vm.JobBuried = m.prop();
        beanstalker.vm.JobDelayed = m.prop();
        beanstalker.vm.JobReady = m.prop();
        beanstalker.vm.SecondsUntilRefresh = m.prop(5);
        beanstalker.vm.ServerAddress = m.prop();
        beanstalker.vm.Stats = m.prop({});
        beanstalker.vm.Tubes = m.prop([]);
    },
    updateInfo: function() {
        m.startComputation();
        $.ajax({
            url: 'api/info',
            data: {'tube': beanstalker.vm.CurrentTube()},
            success: function(data) {
                beanstalker.vm.IsServiceListening(data.isServiceListening);
                beanstalker.vm.IsTubePaused(data.stats.pause != 0);
                beanstalker.vm.ServerAddress(data.serverAddress);
                beanstalker.vm.Stats(data.stats);
                beanstalker.vm.Tubes(data.tubes);
                beanstalker.vm.JobBuried(data.jobBuried);
                beanstalker.vm.JobDelayed(data.jobDelayed);
                beanstalker.vm.JobReady(data.jobReady);                
            }
        }).done(function() {
            beanstalker.vm.SecondsUntilRefresh(5);
            m.endComputation();
        });
    },
    pause: function(duration) {
        $.ajax({
            method: 'POST',
            url: 'cmd/pause',
            data: {'tube': beanstalker.vm.CurrentTube(), 'duration': duration},
            success: function() {
                beanstalker.vm.updateInfo();
            }
        });
    },
    kick: function(job) {
        $.ajax({
            method: 'POST',
            url: 'cmd/kick',
            data: {'job_id': job.stats.id},
            success: function() {
                beanstalker.vm.updateInfo();
            }
        });
    },
    delete: function(job) {
        $.ajax({
            method: 'POST',
            url: 'cmd/delete',
            data: {'job_id': job.stats.id},
            success: function() {
                beanstalker.vm.updateInfo();
            }
        });
    }
};

beanstalker.controller = function() {
    beanstalker.vm.init();
};

beanstalker.viewPageHeader = function() {
    return m('.page-header', [
        m('h2', ['Beanstalker ', function() {
            if (beanstalker.vm.IsServiceListening()) {
                return m('small.text-success', 'Service is running');
            } else {
                return m('small.text-danger', 'Service not found');
            }
        }()])
    ]);
};

beanstalker.viewNavTubes = function() {
    return m('ul.nav.nav-tabs', [
        beanstalker.vm.Tubes().map(function(tube, index) {
            return m(function() {
                return tube == beanstalker.vm.CurrentTube() ? 'li.active' : 'li';
            }(), [
                m('a[href=javascript:void(0)]', {onclick: function() {
                    beanstalker.vm.CurrentTube(tube);
                    beanstalker.vm.updateInfo();
                }}, tube)
            ]);
        })
    ]);
}

beanstalker.viewTubeButtons = function() {
    return m('.btn-toolbar', [
        m('button.btn.btn-default', {onclick: function() {
            beanstalker.vm.updateInfo();
        }}, [
            m('i.glyphicon.glyphicon-refresh')
        ]),
        function() {
            if (beanstalker.vm.IsTubePaused()) {
                return m('button.btn.btn-default', {onclick: function() {
                    beanstalker.vm.pause(0);
                }}, [
                    m('i.glyphicon.glyphicon-play'),
                    ' Resume'
                ]);
            }
        }(),
        m('.btn-group', [
            m('button.btn.btn-default.dropdown-toggle[type=button][data-toggle=dropdown]', {onclick: beanstalker.vm.pause}, [
                m('i.glyphicon.glyphicon-pause'),
                ' Pause ',
                m('span.caret')
            ]),
            m('ul.dropdown-menu', [
                m('li', [
                    m('a[href=#]', {onclick: function() {
                        beanstalker.vm.pause(60);
                    }}, '1 minute')
                ]),
                m('li', [
                    m('a[href=#]', {onclick: function() {
                        beanstalker.vm.pause(300);
                    }}, '5 minutes')
                ]),
                m('li', [
                    m('a[href=#]', {onclick: function() {
                        beanstalker.vm.pause(600);
                    }}, '10 minutes')
                ]),
                m('li', [
                    m('a[href=#]', {onclick: function() {
                        beanstalker.vm.pause(1800);
                    }}, '30 minutes')
                ]),
                m('li', [
                    m('a[href=#]', {onclick: function() {
                        beanstalker.vm.pause(3600);
                    }}, '1 hour')
                ])
            ])
        ])
    ]);
}

beanstalker.viewTubeStats = function() {
    return m('table.table.table-bordered.table-striped', [
        m('tbody', function() {
            var stats = beanstalker.vm.Stats();
            return Object.keys(stats).map(function(key, index) {
                return m('tr', [
                    m('th', key),
                    m('td', stats[key])
                ]);
            });
        }())
    ]);
}

beanstalker.viewJobStats = function(job) {
    return m('.table-responsive', [
        m('table.table.table-bordered.table-striped', [
            m('thead', [
                m('tr', [
                    Object.keys(job.stats).map(function(key, index) {
                        return m('th', key);
                    })
                ])
            ]),
            m('tbody', [
                m('tr', [
                    Object.keys(job.stats).map(function(key, index) {
                        return m('td', job.stats[key]);
                    })
                ])
            ])
        ])
    ]);
}

beanstalker.viewJobToolbar = function(job) {
    return [
        m('.btn-toolbar', [
            m('button.btn.btn-danger', {onclick: function() {
                beanstalker.vm.delete(job);
            }}, 'Delete')
        ])
    ];
}

beanstalker.viewJobKickToolbar = function(job) {
    return [
        m('.btn-toolbar', [
            m('button.btn.btn-default', {onclick: function() {
                beanstalker.vm.kick(job);
            }}, 'Kick'),
            m('button.btn.btn-danger', {onclick: function() {
                beanstalker.vm.delete(job);
            }}, 'Delete')
        ])
    ];
}

beanstalker.viewJob = function(job) {
    return [
        beanstalker.viewJobStats(job),
        m('pre.pre-scrollable', job.data)
    ];
}

beanstalker.viewPeekJobs = function() {
    return [
        m('.panel.panel-default', [
            m('.panel-heading', 'Buried'),
            m('.panel-body', [
                function() {
                    if (beanstalker.vm.JobBuried()) {
                        return [
                            beanstalker.viewJob(beanstalker.vm.JobBuried()),
                            beanstalker.viewJobKickToolbar(beanstalker.vm.JobBuried())
                        ];
                    } else {
                        return m('p', 'No buried jobs.');
                    }
                }()
            ])
        ]),
        m('.panel.panel-default', [
            m('.panel-heading', 'Delayed'),
            m('.panel-body', [
                function() {
                    if (beanstalker.vm.JobDelayed()) {
                        return [
                            beanstalker.viewJob(beanstalker.vm.JobDelayed()),
                            beanstalker.viewJobKickToolbar(beanstalker.vm.JobDelayed())
                        ];
                    } else {
                        return m('p', 'No delayed jobs.');
                    }
                }()
            ])
        ]),
        m('.panel.panel-default', [
            m('.panel-heading', 'Ready'),
            m('.panel-body', [
                function() {
                    if (beanstalker.vm.JobReady()) {
                        return [
                            beanstalker.viewJob(beanstalker.vm.JobReady()),
                            beanstalker.viewJobToolbar(beanstalker.vm.JobReady())
                        ];
                    } else {
                        return m('p', 'No ready jobs.');
                    }
                }()
            ])
        ])
    ];
}

beanstalker.view = function() {
    return m('html', [
        m('body', [
            m('.container', [
                beanstalker.viewPageHeader(),
                function() {
                    if (beanstalker.vm.IsServiceListening()) {
                        return [
                            beanstalker.viewNavTubes(),
                            m('.row', [
                                m('.col-md-4', [
                                    m('h4', 'Tube'),
                                    m('hr'),
                                    beanstalker.viewTubeButtons(),
                                    beanstalker.viewTubeStats()
                                ]),
                                m('.col-md-8', [
                                    m('h4', 'Peek'),
                                    m('hr'),
                                    beanstalker.viewPeekJobs()
                                ])
                            ])
                        ];
                    } else {
                        return m('p', 'Unable to find the beanstalk daemon @ ' + beanstalker.vm.ServerAddress() + '.');
                    }
                }()
            ])
        ])
    ]);
};

m.mount(document.body, beanstalker);

$('document').ready(function() {
    beanstalker.vm.updateInfo();
    
    setInterval(function() {
        var seconds = beanstalker.vm.SecondsUntilRefresh();
        if (seconds == 0) {
            beanstalker.vm.updateInfo();
        } else {
            beanstalker.vm.SecondsUntilRefresh(seconds - 1);
        }
    }, 1000);
});