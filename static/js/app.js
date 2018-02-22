var App = {};
App.views = {};

App.vm = {
    currentTube: 'default',
    isServiceListening: false,
    isTubePaused: false,
    jobBuried: null,
    jobDelayed: null,
    jobReady: null,
    secondsUntilRefresh: 5,
    serverAddress: null,
    showStats: false,
    stats: {},
    statsTube: {},
    tubes: [],
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
            data: {'tube': App.vm.currentTube, 'duration': duration},
            success: function() {
                App.vm.updateInfo();
            }
        });
    },
    updateInfo: function() {
        m.request({
            url: 'api/info',
            data: {'tube': App.vm.currentTube},
        }).then(function(result) {
            App.vm.isServiceListening = result.isServiceListening;
            App.vm.isTubePaused = result.statsTube.pause != 0;
            App.vm.jobBuried = result.jobBuried;
            App.vm.jobDelayed = result.jobDelayed;
            App.vm.jobReady = result.jobReady;
            App.vm.serverAddress = result.serverAddress;
            App.vm.stats = result.stats;
            App.vm.statsTube = result.statsTube;
            App.vm.tubes = result.tubes;

            App.vm.secondsUtilRefresh = 5;
        });
    }
};

App.views.ButtonsTube = function() {
    return m('.mb-2', [
        m('button.btn.btn-outline-secondary.mr-1', {onclick: function() {
            App.vm.updateInfo();
        }}, [
            m('i.fas.fa-sync')
        ]),
        function() {
            if (App.vm.isTubePaused) {
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
            ' Pause ',
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

App.views.Tab = function(ref, name) {
    return m('li.nav-item', [
        m('a[href=javascript:void(0)].nav-link', {
            class: function() {
                return App.vm.currentTube == ref ? 'active' : '';
            }(),
            onclick: function() {
                App.vm.currentTube = ref
            }
        }, name)
    ]);
}

App.views.TabsTube = function() {
    return m('ul.nav.nav-tabs', [
        App.vm.tubes.map(function(tube, index) {
            return App.views.Tab(tube, tube)
        })
    ]);
}

App.views.PageHeader = function() {
    return [
        m('h1.heading.mt-2', 'Beanstalker ')
    ];
}

App.views.PeekJobs = function() {
    return [
        m('.card.border-danger.mb-2', [
            m('.card-header.text-white.bg-danger', 'Buried'),
            m('.card-body', [
                function() {
                    if (App.vm.jobBuried) {
                        return [
                            App.views.Job(App.vm.jobBuried),
                            App.views.ToolbarJobKick(App.vm.jobBuried)
                        ];
                    } else {
                        return 'No buried jobs.';
                    }
                }()
            ])
        ]),
        m('.card.mb-2', [
            m('.card-header', 'Delayed'),
            m('.card-body', [
                function() {
                    if (App.vm.jobDelayed) {
                        return [
                            App.views.Job(App.vm.jobDelayed),
                            App.views.ToolbarJobKick(App.vm.jobDelayed)
                        ];
                    } else {
                        return 'No delayed jobs.';
                    }
                }()
            ])
        ]),
        m('.card.mb-2', [
            m('.card-header', 'Ready'),
            m('.card-body', [
                function() {
                    if (App.vm.jobReady) {
                        return [
                            App.views.Job(App.vm.jobReady),
                            App.views.ToolbarJob(App.vm.jobReady)
                        ];
                    } else {
                        return 'No ready jobs.';
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
            var stats = App.vm.stats;
            return Object.keys(stats).map(function(key, index) {
                return m('tr', [
                    m('th', key),
                    m('td', stats[key])
                ]);
            });
        }())
    ]);
}

App.views.StatsTube = function() {
    return m('table.table.table-bordered.table-striped', [
        m('tbody', function() {
            var statsTube = App.vm.statsTube;
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
            App.views.PageHeader(),
            function() {
                if (App.vm.isServiceListening) {
                    if (App.vm.showStats) {
                        return [
                            m('.mb-2', [
                                m('button.btn.btn-primary', {
                                    onclick: function() {
                                        App.vm.showStats = false;
                                    }
                                }, 'Close')
                            ]),
                            App.views.Stats()
                        ];
                    } else {
                        return [
                            App.views.TabsTube(),
                            m('.row', [
                                m('.col-sm-8', [
                                    m('h4.heading', 'Peek'),
                                    App.views.PeekJobs(),
                                ]),
                                m('.col-sm-4', [
                                    m('button.btn.btn-outline-primary.btn-block.mb-2', {
                                        onclick: function() {
                                            App.vm.showStats = true;
                                        }
                                    }, 'Server stats'),
                                    m('h4.heading', 'Tube'),
                                    App.views.ButtonsTube(),
                                    App.views.StatsTube(),
                                ])
                            ])
                        ];
                    }
                } else {
                    return m('p', 'Unable to find the beanstalk daemon.');
                }
            }()
        ]),
        function() {
            var views = [];
            if (App.vm.isModalShown) {
                if (App.vm.currentModal == 'stats') {
                    views.push(App.views.ModalStats());
                }
                views.push(m('.modal-backdrop.show', function() {

                }()));
            }
            return views;
        }()
    ];
};

m.mount(document.body, App);
App.vm.updateInfo();

setInterval(function() {
    var seconds = App.vm.secondsUntilRefresh;
    if (seconds == 0) {
        App.vm.updateInfo();
    } else {
        App.vm.secondsUntilRefresh = seconds - 1;
    }
}, 1000);