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
    else if (req.method === 'GET' && req.url === '/bouncy/HEAD') {
        fs.createReadStream(__dirname + '/bouncy_repo/.git/HEAD').pipe(res);
    }
    else if (req.method === 'POST' && req.url === '/bouncy/git-receive-pack') {
        res.setHeader('content-type', 'application/x-git-receive-pack-result');
        noCache();
        
        var ps = spawn('git-receive-pack', [
            '--stateless-rpc',
            'bouncy_repo',
        ]);
        ps.stdout.pipe(res);
        req.pipe(ps.stdin);
        ps.stderr.pipe(process.stderr, { end : false });
    }
    else {
        res.statusCode = 404;
        res.end('not found');
    }
}).listen(7000);
