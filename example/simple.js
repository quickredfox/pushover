var pushover = require('pushover');
var repos = pushover(__dirname + '/repos');

repos.create('beep');
repos.on('push', function (repo) {
    console.log('received a push to ' + repo);
});

repos.listen(7000);
