var App = {};
App.views = {};

App.vm = {
    init: function() {
        App.vm.CurrentModal = m.prop();
        App.vm.CurrentTube = m.prop('default');
        App.vm.IsServiceListening = m.prop(false);
        App.vm.IsTubePaused = m.prop(false);
        App.vm.JobBuried = m.prop();
        App.vm.JobDelayed = m.prop();
        App.vm.JobReady = m.prop();
        App.vm.SecondsUntilRefresh = m.prop(5);
        App.vm.ServerAddress = m.prop();
        App.vm.Stats = m.prop({});
        App.vm.StatsTube = m.prop({});
        App.vm.Tubes = m.prop([]);
    },
    delete: function(job) {
        $.ajax({
            method: 'POST',
            url: 'cmd/delete',
            data: {'job_id': job.stats.id},
            success: function() {
                App.vm.updateInfo();
            }
        });
    },
    kick: function(job) {
        $.ajax({
            method: 'POST',
            url: 'cmd/kick',
            data: {'job_id': job.stats.id},
            success: function() {
                App.vm.updateInfo();
            }
        });
    },
    pause: function(duration) {
        $.ajax({
            method: 'POST',
            url: 'cmd/pause',
            data: {'tube': App.vm.CurrentTube(), 'duration': duration},
            success: function() {
                App.vm.updateInfo();
            }
        });
    },
    updateInfo: function() {
        m.startComputation();
        $.ajax({
            url: 'api/info',
            data: {'tube': App.vm.CurrentTube()},
            success: function(data) {
                App.vm.IsServiceListening(data.isServiceListening);
                App.vm.IsTubePaused(data.statsTube.pause != 0);
                App.vm.JobBuried(data.jobBuried);
                App.vm.JobDelayed(data.jobDelayed);
                App.vm.JobReady(data.jobReady);
                App.vm.ServerAddress(data.serverAddress);
                App.vm.Stats(data.stats);
                App.vm.StatsTube(data.statsTube);
                App.vm.Tubes(data.tubes);
            }
        }).done(function() {
            App.vm.SecondsUntilRefresh(5);
            m.endComputation();
        });
    }
};

App.controller = function() {
    App.vm.init();
};

App.views.ButtonsTube = function() {
    return m('.btn-toolbar', [
        m('button.btn.btn-default', {onclick: function() {
            App.vm.updateInfo();
        }}, [
            m('i.glyphicon.glyphicon-refresh')
        ]),
        function() {
            if (App.vm.IsTubePaused()) {
                return m('button.btn.btn-default', {onclick: function() {
                    App.vm.pause(0);
                }}, [
                    m('i.glyphicon.glyphicon-play'),
                    ' Resume'
                ]);
            }
        }(),
        m('.btn-group', [
            m('button.btn.btn-default.dropdown-toggle[type=button][data-toggle=dropdown]', [
                m('i.glyphicon.glyphicon-pause'),
                ' Pause ',
                m('span.caret')
            ]),
            m('ul.dropdown-menu', [
                m('li', [
                    m('a[href=#]', {onclick: function() {
                        App.vm.pause(60);
                    }}, '1 minute')
                ]),
                m('li', [
                    m('a[href=#]', {onclick: function() {
                        App.vm.pause(300);
                    }}, '5 minutes')
                ]),
                m('li', [
                    m('a[href=#]', {onclick: function() {
                        App.vm.pause(600);
                    }}, '10 minutes')
                ]),
                m('li', [
                    m('a[href=#]', {onclick: function() {
                        App.vm.pause(1800);
                    }}, '30 minutes')
                ]),
                m('li', [
                    m('a[href=#]', {onclick: function() {
                        App.vm.pause(3600);
                    }}, '1 hour')
                ])
            ])
        ])
    ]);
}

App.views.Job = function(job) {
    return [
        App.views.StatsJob(job),
        m('pre.pre-scrollable', job.data)
    ];
}

App.views.ModalStats = function(name) {
    return m('#modal.modal.fade', [
        m('.modal-dialog', [
            m('.modal-content', [
                m('.modal-header', [
                    m('h4', 'Service stats')
                ]),
                m('.modal-body', [
                    App.views.Stats()
                ]),
                m('.modal-footer', [
                    m('button.btn.btn-default[data-dismiss=modal]', 'Close')
                ])
            ])
        ])
    ]);
}

App.views.NavTubes = function() {
    return m('ul.nav.nav-tabs', [
        App.vm.Tubes().map(function(tube, index) {
            return m(function() {
                return tube == App.vm.CurrentTube() ? 'li.active' : 'li';
            }(), [
                m('a[href=javascript:void(0)]', {onclick: function() {
                    App.vm.CurrentTube(tube);
                    App.vm.updateInfo();
                }}, tube)
            ]);
        })
    ]);
}

App.views.PageHeader = function() {
    return m('.page-header', [
        m('h2', [
            'Beanstalker ',
            function() {
                if (App.vm.IsServiceListening()) {
                    return m('a[href=#]', {onclick: function() {
                        App.vm.CurrentModal('stats');
                        m.redraw();
                        $('#modal').modal();
                    }}, [
                        m('small.text-success', 'Service is running')
                    ]);
                } else {
                    return m('small.text-danger', 'Service not found');
                }
            }()
        ])
    ]);
}

App.views.PeekJobs = function() {
    return [
        m('.panel', {class: function() {
                if (App.vm.JobBuried()) {
                    return 'panel-danger';
                } else {
                    return 'panel-default';
                }
            }()}, [
            m('.panel-heading', 'Buried'),
            m('.panel-body', [
                function() {
                    if (App.vm.JobBuried()) {
                        return [
                            App.views.Job(App.vm.JobBuried()),
                            App.views.ToolbarJobKick(App.vm.JobBuried())
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
                    if (App.vm.JobDelayed()) {
                        return [
                            App.views.Job(App.vm.JobDelayed()),
                            App.views.ToolbarJobKick(App.vm.JobDelayed())
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
                    if (App.vm.JobReady()) {
                        return [
                            App.views.Job(App.vm.JobReady()),
                            App.views.ToolbarJob(App.vm.JobReady())
                        ];
                    } else {
                        return m('p', 'No ready jobs.');
                    }
                }()
            ])
        ])
    ];
}

App.views.StatsJob = function(job) {
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

App.views.Stats = function() {
    return m('table.table.table-bordered.table-striped', [
        m('tbody', function() {
            var statsTube = App.vm.Stats();
            return Object.keys(statsTube).map(function(key, index) {
                return m('tr', [
                    m('th', key),
                    m('td', statsTube[key])
                ]);
            });
        }())
    ]);
}

App.views.StatsTube = function() {
    return m('table.table.table-bordered.table-striped', [
        m('tbody', function() {
            var statsTube = App.vm.StatsTube();
            return Object.keys(statsTube).map(function(key, index) {
                return m('tr', [
                    m('th', key),
                    m('td', statsTube[key])
                ]);
            });
        }())
    ]);
}

App.views.ToolbarJob = function(job) {
    return [
        m('.btn-toolbar', [
            m('button.btn.btn-danger', {onclick: function() {
                App.vm.delete(job);
            }}, 'Delete')
        ])
    ];
}

App.views.ToolbarJobKick = function(job) {
    return [
        m('.btn-toolbar', [
            m('button.btn.btn-default', {onclick: function() {
                App.vm.kick(job);
            }}, 'Kick'),
            m('button.btn.btn-danger', {onclick: function() {
                App.vm.delete(job);
            }}, 'Delete')
        ])
    ];
}

App.view = function() {
    return m('html', [
        m('body', [
            m('.container', [
                App.views.PageHeader(),
                function() {
                    if (App.vm.IsServiceListening()) {
                        return [
                            App.views.NavTubes(),
                            m('.row', [
                                m('.col-sm-4', [
                                    m('h4', 'Tube'),
                                    m('hr'),
                                    App.views.ButtonsTube(),
                                    App.views.StatsTube()
                                ]),
                                m('.col-sm-8', [
                                    m('h4', 'Peek'),
                                    m('hr'),
                                    App.views.PeekJobs()
                                ])
                            ])
                        ];
                    } else {
                        return m('p', 'Unable to find the beanstalk daemon @ ' + App.vm.ServerAddress());
                    }
                }()
            ]),
            function() {
                if (App.vm.CurrentModal() == 'stats') {
                    return App.views.ModalStats();
                }
            }()
        ])
    ]);
};

$('document').ready(function() {
    m.mount(document.body, App);
    App.vm.updateInfo();
    
    setInterval(function() {
        var seconds = App.vm.SecondsUntilRefresh();
        if (seconds == 0) {
            App.vm.updateInfo();
        } else {
            App.vm.SecondsUntilRefresh(seconds - 1);
        }
    }, 1000);
});