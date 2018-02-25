<?php
require 'vendor/autoload.php';
require 'config.php';

use Respect\Validation\Validator as v;
use Respect\Validation\Exceptions\NestedValidationExceptionInterface;

$app = new \Slim\App([
    'settings' => [
        'displayErrorDetails' => true
    ]
]);

$container = $app->getContainer();

$container['view'] = function($c) {
    $view = new \Slim\Views\Twig('templates/');

    $basePath = rtrim(str_ireplace('index.php', '', $c['request']->getUri()->getBasePath()), '/');
    $view->addExtension(new \Slim\Views\TwigExtension($c['router'], $basePath));

    return $view;
};

$pheanstalk = new \Pheanstalk\Pheanstalk($config['beanstalk_server']);

function jobToDict($tube, $kind) {
    global $pheanstalk;

    try {
        if ($kind == 'ready') {
            $job = $pheanstalk->peekReady($tube);
        } elseif ($kind == 'delayed') {
            $job = $pheanstalk->peekDelayed($tube);
        } elseif ($kind == 'buried') {
            $job = $pheanstalk->peekBuried($tube);
        } else {
            return null;
        }
    } catch (\Pheanstalk\Exception\ServerException $e) {
        return null;
    }

    $statsJob = $pheanstalk->statsJob($job);
    return ['data' => $job->getData(), 'stats' => $statsJob];
}

$app->get('/', function($req, $res) {
    return $this->view->render($res, 'index.html', [
        'currentTube' => 'default'
    ]);
});

$app->get('/api/info', function($req, $res) use($pheanstalk, $config) {
    $isServiceListening = $pheanstalk->getConnection()->isServiceListening();

    $service = [
        'isListening' => $pheanstalk->getConnection()->isServiceListening(),
        'stats' => $pheanstalk->stats()->getArrayCopy()
    ];

    $tubes = [];
    foreach($pheanstalk->listTubes() as $tube) {
        $tubes[$tube]['stats'] = $pheanstalk->statsTube($tube);
        $tubes[$tube]['ready'] = jobToDict($tube, 'ready');
        $tubes[$tube]['delayed'] = jobToDict($tube, 'delayed');
        $tubes[$tube]['buried'] = jobToDict($tube, 'buried');
    }

    $r = $res->withHeader('Content-Type', 'application/json');
    $r->write(json_encode([
        'service' => $service,
        'tubes' => $tubes
    ]));
    return $r;
});

$app->post('/cmd/delete', function($req, $res) use($pheanstalk) {
    $job_id = $req->getParam('job_id');

    try {
        v::numeric()->setName('job_id')->check($job_id);
    } catch (ValidationExceptionInterface $e) {
        return $res->withStatus(400)->write($e->getMainMessage());
    }

    try {
        $job = new \Pheanstalk\Job($job_id, []);
        $pheanstalk->delete($job);
    } catch (\Pheanstalk\Exception\ServerException $e) {
        return $res->withStatus(400)->write($e->getMessage());
    }
});

$app->post('/cmd/kick', function($req, $res) use($pheanstalk) {
    $job_id = $req->getParam('job_id');

    try {
        v::numeric()->setName('job_id')->check($job_id);
    } catch (ValidationExceptionInterface $e) {
        return $res->withStatus(400)->write($e->getMainMessage());
    }

    try {
        $job = new \Pheanstalk\Job($job_id, []);
        $pheanstalk->kickJob($job);
    } catch (\Pheanstalk\Exception\ServerException $e) {
        return $res->withStatus(400)->write($e->getMessage());
    }
});

$app->post('/cmd/pause', function($req, $res) use($pheanstalk) {
    $tube = $req->getParam('tube', 'default');
    $duration = intval($req->getParam('duration', 60));

    $pheanstalk->pauseTube($tube, $duration);
});

$app->run();
?>