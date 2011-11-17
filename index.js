var http = require('http');
var fs = require('fs');
var url = require('url');
var qs = require('qs');
var path = require('path');
var spawn = require('child_process').spawn;

var config = {
    repos : __dirname + '/repos',
    services : [ 'upload-pack', 'receive-pack' ]
};

http.createServer(function (req, res) {
    var u = url.parse(req.url);
    var params = qs.parse(u.query);
    
    function noCache () {
        res.setHeader('expires', 'Fri, 01 Jan 1980 00:00:00 GMT');
        res.setHeader('pragma', 'no-cache');
        res.setHeader('cache-control', 'no-cache, max-age=0, must-revalidate');
    }
    
    console.dir(req.method + ' ' + req.url);
    
    var m;
    if (req.method === 'GET' && (m = req.url.match('/([^\/]+)/info/refs'))) {
        var repo = m[1];
        
        if (!params.service) {
            res.statusCode = 400;
            res.end('service parameter required');
            return;
        }
        
        var service = params.service.replace(/^git-/, '');
        if (config.services.indexOf(service) < 0) {
            res.statusCode = 405;
            res.end('service not available');
            return;
        }
        
        res.setHeader('content-type',
            'application/x-git-' + service + '-advertisement'
        );
        noCache();
        
        function pack (s) {
            var n = (4 + s.length).toString(16);
            return Array(4 - n.length + 1).join('0') + n + s;
        }
        res.write(pack('# service=git-' + service + '\n'));
        res.write('0000');
        
        var ps = spawn('git-' + service, [
            '--stateless-rpc',
            '--advertise-refs',
            path.join(config.repos, repo),
        ]);
        ps.stdout.pipe(res);
        ps.stderr.pipe(process.stderr, { end : false });
    }
    else if (req.method === 'GET'
    && (m = req.url.match(/^\/([^\/]+)\/HEAD$/))) {
        var repo = m[1];
        var file = path.join(config.repos, repo, '.git', 'HEAD');
        path.exists(file, function (ex) {
            if (ex) fs.createReadStream(file).pipe(res)
            else {
                res.statusCode = 404;
                res.end('not found');
            }
        });
    }
    else if (req.method === 'POST'
    && (m = req.url.match(/\/([^\/]+)\/git-(.+)/))) {
        var repo = m[1], service = m[2];
        
        if (config.services.indexOf(service) < 0) {
            res.statusCode = 405;
            res.end('service not available');
            return;
        }
        
        res.setHeader('content-type',
            'application/x-git-' + service + '-result'
        );
        noCache();
        
        var ps = spawn('git-' + service, [
            '--stateless-rpc',
            path.join(config.repo, repo),
        ]);
        ps.stdout.pipe(res);
        req.pipe(ps.stdin);
        ps.stderr.pipe(process.stderr, { end : false });
    }
    else if (req.method !== 'GET' && req.method !== 'POST') {
        res.statusCode = 405;
        res.end('method not supported');
    }
    else {
        res.statusCode = 404;
        res.end('not found');
    }
}).listen(7000);
