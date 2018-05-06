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

$container['pheanstalk'] = new \Pheanstalk\Pheanstalk($config['beanstalk_server']);

function jobToDict($app, $tube, $kind) {
    try {
        if ($kind == 'ready') {
            $job = $app->pheanstalk->peekReady($tube);
        } elseif ($kind == 'delayed') {
            $job = $app->pheanstalk->peekDelayed($tube);
        } elseif ($kind == 'buried') {
            $job = $app->pheanstalk->peekBuried($tube);
        } else {
            return null;
        }
    } catch (\Pheanstalk\Exception\ServerException $e) {
        return null;
    }

    $statsJob = $app->pheanstalk->statsJob($job);
    return ['data' => $job->getData(), 'stats' => $statsJob];
}

function writeServerState($app, $res) {
    $service = [
        'isListening' => $app->pheanstalk->getConnection()->isServiceListening(),
        'stats' => $app->pheanstalk->stats()->getArrayCopy()
    ];

    $tubes = [];
    foreach($app->pheanstalk->listTubes() as $tube) {
        $tubes[$tube]['stats'] = $app->pheanstalk->statsTube($tube);
        $tubes[$tube]['ready'] = jobToDict($app, $tube, 'ready');
        $tubes[$tube]['delayed'] = jobToDict($app, $tube, 'delayed');
        $tubes[$tube]['buried'] = jobToDict($app, $tube, 'buried');
    }

    $r = $res->withHeader('Content-Type', 'application/json');
    $r->write(json_encode([
        'service' => $service,
        'tubes' => $tubes
    ]));

    return $r;
}

$app->get('/', function($req, $res) {
    return $this->view->render($res, 'index.html');
});

$app->get('/api/info', function($req, $res) {
    return writeServerState($this, $res);
});

$app->post('/cmd/delete', function($req, $res) {
    $job_id = $req->getParam('job_id');

    try {
        v::numeric()->setName('job_id')->check($job_id);
    } catch (ValidationExceptionInterface $e) {
        return $res->withStatus(400)->write($e->getMainMessage());
    }

    try {
        $job = new \Pheanstalk\Job($job_id, []);
        $this->pheanstalk->delete($job);
    } catch (\Pheanstalk\Exception\ServerException $e) {
        return $res->withStatus(400)->write($e->getMessage());
    }

    return writeServerState($this, $res);
});

$app->post('/cmd/kick', function($req, $res) {
    $job_id = $req->getParam('job_id');

    try {
        v::numeric()->setName('job_id')->check($job_id);
    } catch (ValidationExceptionInterface $e) {
        return $res->withStatus(400)->write($e->getMainMessage());
    }

    try {
        $job = new \Pheanstalk\Job($job_id, []);
        $this->pheanstalk->kickJob($job);
    } catch (\Pheanstalk\Exception\ServerException $e) {
        return $res->withStatus(400)->write($e->getMessage());
    }

    return writeServerState($this, $res);
});

$app->post('/cmd/pause', function($req, $res) {
    $tube = $req->getParam('tube', 'default');
    $duration = intval($req->getParam('duration', 60));

    $this->pheanstalk->pauseTube($tube, $duration);

    return writeServerState($this, $res);
});

$app->run();
?>
