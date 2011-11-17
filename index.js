var http = require('http');
var fs = require('fs');
var url = require('url');
var spawn = require('child_process').spawn;

var server = http.createServer(function (req, res) {
    function cache () {
        res.setHeader('expires', 'Fri, 01 Jan 1980 00:00:00 GMT');
        res.setHeader('pragma', 'no-cache');
        res.setHeader('cache-control', 'no-cache, max-age=0, must-revalidate');
    }
    
    console.dir(req.method + ' ' + req.url);
    if (req.method === 'GET'
    && req.url === '/bouncy/info/refs?service=git-receive-pack') {
        res.setHeader('content-type',
            'application/x-git-receive-pack-advertisement'
        );
        cache();
        
        function pack (s) {
            var n = (4 + s.length).toString(16);
            return Array(4 - n.length + 1).join('0') + n + s;
        }
        res.write(pack('# service=git-receive-pack\n'));
        res.write('0000');
        
        var ps = spawn('git-receive-pack', [
            '--stateless-rpc',
            '--advertise-refs',
            'bouncy_repo',
        ]);
        ps.stdout.pipe(res);
        ps.stderr.pipe(process.stderr, { end : false });
    }
    else if (req.method === 'GET' && req.url === '/bouncy/HEAD') {
        fs.createReadStream(__dirname + '/bouncy_repo/.git/HEAD').pipe(res);
    }
    else if (req.method === 'POST' && req.url === '/bouncy/git-receive-pack') {
        res.setHeader('content-type', 'application/x-git-receive-pack-result');
        cache();
        
        var ps = spawn('git-receive-pack', [
            '--stateless-rpc',
            'bouncy_repo',
        ]);
        ps.stdout.pipe(res);
        req.pipe(ps.stdin);
        ps.stderr.pipe(process.stderr, { end : false });
    }
});

server.listen(7000);
