<?php
require 'vendor/autoload.php';
require 'config.php';

use Respect\Validation\Validator as v;
use Respect\Validation\Exceptions\NestedValidationExceptionInterface;

$app = new \Slim\App();
$container = $app->getContainer();
$pheanstalk = new \Pheanstalk\Pheanstalk($config['beanstalk_server']);

$view = new \Slim\Views\Twig('templates');
$view->addExtension(new Slim\Views\TwigExtension(
    $container->get('router'),
    $container->get('request')->getUri() 
));

$container->register($view);

$app->get('/', function($req, $res) {
    return $this->view->render($res, 'index.html', [
        'currentTube' => 'default'
    ]);
});

$app->get('/api/info', function($req, $res) use($pheanstalk, $config) {
    $tube = $req->getParam('tube', 'default');
                
    try {
        $isServiceListening = $pheanstalk->getConnection()->isServiceListening();

        try {
            $job = $pheanstalk->peekBuried($tube);
            $statsJob = $pheanstalk->statsJob($job);
            $jobBuried = ['data' => $job->getData(), 'stats' => $statsJob];
        } catch (\Pheanstalk\Exception\ServerException $e) {
            $jobBuried = null;
        }
        
        try {
            $job = $pheanstalk->peekDelayed($tube);
            $statsJob = $pheanstalk->statsJob($job);
            $jobDelayed = ['data' => $job->getData(), 'stats' => $statsJob];
        } catch (\Pheanstalk\Exception\ServerException $e) {
            $jobDelayed = null;
        }
        
        try {
            $job = $pheanstalk->peekReady($tube);
            $statsJob = $pheanstalk->statsJob($job);
            $jobReady = ['data' => $job->getData(), 'stats' => $statsJob];
        } catch (\Pheanstalk\Exception\ServerException $e) {
            $jobReady = null;
        }
        
        $statsTube = $pheanstalk->statsTube($tube)->getArrayCopy();
        $stats = $pheanstalk->stats()->getArrayCopy();
        $tubes = $pheanstalk->listTubes();
    } catch (\Pheanstalk\Exception\ConnectionException $e) {
        $isServiceListening = false;
        $jobBuried = null;
        $jobDelayed = null;
        $jobReady = null;
        $statsTube = [];
        $stats = [];
        $tubes = [];
    }
    
    $r = $res->withHeader('Content-Type', 'application/json');
    $r->write(json_encode([
        'isServiceListening' => $isServiceListening,
        'jobBuried' => $jobBuried,
        'jobDelayed' => $jobDelayed,
        'jobReady' => $jobReady,
        'serverAddress' => $config['beanstalk_server'],
        'statsTube' => $statsTube,
        'stats' => $stats,
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