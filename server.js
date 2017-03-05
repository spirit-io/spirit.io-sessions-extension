"use strict";

const fpromise = require('f-promise');
const Server = require('spirit.io/lib/application').Server;
const sessions = require('./lib');
const config = require('./config').config;

let app = new Server(config);

app.on('initialized', function () {
    fpromise.run(() => {
        console.log("========== Server initialized ============\n");
        // here we extend the standard express http server in spirit.io framework
        sessions.extend(app);
        //
        app.start();
    }).catch(err => {
        console.error(err);
    });
});

app.on('started', function () {
    fpromise.run(() => {
        console.log("========== Server started ============\n");
    }).catch(err => {
        console.error(err);
    });
});

fpromise.run(() => {
    app.init();
}).catch(err => {
    console.error("An error occured on initialization: ", err.stack);
});
