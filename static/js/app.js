var App = {};
App.views = {};

App.vm = {
    tube: 'default',
    showServerStats: false,
    service: {
        isListening: false,
        stats: {}
    },
    tubes: {},
    delete: function(job) {
        m.request({
            method: 'POST',
            url: 'cmd/delete',
            data: {'job_id': job.stats.id}
        }).then(function(result) {
            App.vm.service = result.service;
            App.vm.tubes = result.tubes;
        });
    },
    kick: function(job) {
        m.request({
            method: 'POST',
            url: 'cmd/kick',
            data: {'job_id': job.stats.id}
        }).then(function(result) {
            App.vm.service = result.service;
            App.vm.tubes = result.tubes;
        });
    },
    pause: function(duration) {
        App.vm.tubes[App.vm.tube].stats.pause = duration;

        m.request({
            method: 'POST',
            url: 'cmd/pause',
            data: {'tube': App.vm.tube, 'duration': duration}
        }).then(function(result) {
            App.vm.service = result.service;
            App.vm.tubes = result.tubes;
        });
    },
    updateInfo: function() {
        m.request({
            url: 'api/info',
        }).then(function(result) {
            App.vm.service = result.service;
            App.vm.tubes = result.tubes;
        });
    }
};

App.views.ButtonsTube = function() {
    return m('.mb-2', [
        function() {
            if (App.vm.tubes[App.vm.tube].stats.pause > 0) {
                return m('button.btn.btn-outline-secondary.mr-1', {onclick: function() {
                    App.vm.pause(0);
                }}, [
                    m('i.fas.fa-play'),
                    ' Resume'
                ]);
            }
        }(),
        m('button.btn.btn-outline-secondary.dropdown-toggle[type=button][data-toggle=dropdown]', [
            m('i.fas.fa-pause'),
            ' Pause',
            m('span.caret')
        ]),
        m('.dropdown-menu', [
            m('a[href=#].dropdown-item', {onclick: function() {
                App.vm.pause(60);
            }}, '1 minute'),
            m('a[href=#].dropdown-item', {onclick: function() {
                App.vm.pause(300);
            }}, '5 minutes'),
            m('a[href=#].dropdown-item', {onclick: function() {
                App.vm.pause(600);
            }}, '10 minutes'),
            m('a[href=#].dropdown-item', {onclick: function() {
                App.vm.pause(1800);
            }}, '30 minutes'),
            m('a[href=#].dropdown-item', {onclick: function() {
                App.vm.pause(3600);
            }}, '1 hour')
        ])
    ]);
}

App.views.Job = function(job) {
    return [
        App.views.StatsJob(job),
        m('pre', job.data)
    ];
}

App.views.PeekJobs = function() {
    return [
        m('.card.mb-2', [
            m('.card-header', 'Ready'),
            m('.card-body', [
                function() {
                    var job = App.vm.tubes[App.vm.tube].ready;
                    if (job) {
                        return [
                            App.views.Job(job),
                            App.views.ToolbarJob(job)
                        ];
                    } else {
                        return 'No ready jobs.';
                    }
                }()
            ])
        ]),
        m('.card.mb-2', [
            m('.card-header', 'Delayed'),
            m('.card-body', [
                function() {
                    var job = App.vm.tubes[App.vm.tube].delayed;
                    if (job) {
                        return [
                            App.views.Job(job),
                            App.views.ToolbarJobKick(job)
                        ];
                    } else {
                        return 'No delayed jobs.';
                    }
                }()
            ])
        ]),
        m('.card.mb-2', {
            class: function() {
                return App.vm.jobBuried ? 'border-danger' : ''
            }()
        }, [
            m('.card-header', {
                class: function() {
                    return App.vm.jobBuried ? 'text-white bg-danger' : ''
                }()
            }, 'Buried'),
            m('.card-body', [
                function() {
                    var job = App.vm.tubes[App.vm.tube].buried;
                    if (job) {
                        return [
                            App.views.Job(job),
                            App.views.ToolbarJobKick(job)
                        ];
                    } else {
                        return 'No buried jobs.';
                    }
                }()
            ])
        ])
    ];
}

App.views.StatsJob = function(job) {
    return m('.table-responsive.mb-2', [
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
            return Object.keys(App.vm.service.stats).map(function(key, index) {
                return m('tr', [
                    m('th', key),
                    m('td', App.vm.service.stats[key])
                ]);
            });
        }())
    ]);
}

App.views.StatsTube = function() {
    return m('table.table.table-bordered.table-striped', [
        m('tbody', function() {
            return Object.keys(App.vm.tubes[App.vm.tube].stats).map(function(key, index) {
                return m('tr', [
                    m('th', key),
                    m('td', App.vm.tubes[App.vm.tube].stats[key])
                ]);
            });
        }())
    ]);
}

App.views.Tab = function(ref, name) {
    return m('li.nav-item', [
        m('a[href=javascript:void(0)].nav-link', {
            class: function() {
                return App.vm.tube == ref ? 'active' : '';
            }(),
            onclick: function() {
                App.vm.tube = ref
                App.vm.showServerStats = false
            }
        }, name)
    ]);
}

App.views.TabsTube = function() {
    return m('ul.nav.nav-tabs', function() {
        return Object.keys(App.vm.tubes).map(function(tube, index) {
            return App.views.Tab(tube, tube)
        })
    }());
}

App.views.ToolbarJob = function(job) {
    return [
        m('button.btn.btn-danger', {onclick: function() {
            App.vm.delete(job);
        }}, [
            m('i.fas fa-trash')
        ])
    ];
}

App.views.ToolbarJobKick = function(job) {
    return [
        m('button.btn.btn-outline-secondary.mr-1', {onclick: function() {
            App.vm.kick(job);
        }}, 'Kick'),
        m('button.btn.btn-outline-danger', {onclick: function() {
            App.vm.delete(job);
        }}, [
            m('i.fas fa-trash')
        ])
    ];
}

App.view = function() {
    return [
        m('.container', [
            m('h1.heading.mt-2', 'Beanstalker '),
            function() {
                if (App.vm.service.isListening) {
                    return [
                        App.views.TabsTube(),
                        m('.row', [
                            m('.col-sm-4', [
                                function() {
                                    if (App.vm.showServerStats) {
                                        return [
                                            m('button.btn.btn-outline-primary.btn-block.mb-2', {
                                                onclick: function() {
                                                    App.vm.showServerStats = false;
                                                }
                                            }, 'Tube stats'),
                                            m('h4.heading', 'Server'),
                                            App.views.Stats()
                                        ];
                                    } else {
                                        return [
                                            m('button.btn.btn-outline-primary.btn-block.mb-2', {
                                                onclick: function() {
                                                    App.vm.showServerStats = true;
                                                }
                                            }, 'Server stats'),
                                            m('h4.heading', 'Tube'),
                                            App.views.ButtonsTube(),
                                            App.views.StatsTube()
                                        ];
                                    }
                                }(),
                            ]),
                            m('.col-sm-8', [
                                m('h4.heading', 'Peek'),
                                App.views.PeekJobs(),
                            ])
                        ])
                    ];
                } else {
                    return m('p', 'Unable to find the beanstalk daemon.');
                }
            }()
        ])
    ];
};

m.mount(document.body, App);
App.vm.updateInfo();

setInterval(function() {
    App.vm.updateInfo();
}, 5000);
