[![Build Status](https://travis-ci.org/spirit-io/spirit.io-sessions-extension.svg?branch=master)](https://travis-ci.org/spirit-io/spirit.io-sessions-extension)
[![Coverage Status](https://coveralls.io/repos/github/spirit-io/spirit.io-sessions-extension/badge.svg?branch=master)](https://coveralls.io/github/spirit-io/spirit.io-sessions-extension?branch=master)

# spirit.io extension for Sessions management
spirit.io extension that allows to manage express sessions with Redis store.

It requires [spirit.io-users-service](https://github.com/spirit-io/spirit.io-users-service) micro service installed and available in the network.

# How to use

```js
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

```

# Features

## Check authentication with REST api endpoints

## Sessions management
### With Server class static methods
### With Seneca services calls
### With REST api