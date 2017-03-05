import { Application, Request, Response, NextFunction } from 'express';
import { Server } from 'spirit.io/lib/application';
import { Compiler, Service } from 'spirit.io/lib/core';
import { context, run, wait } from 'f-promise';
import * as httpHelper from 'spirit.io/lib/utils/http';
import * as path from 'path';
import * as session from 'express-session';
import * as connectRedis from 'connect-redis';
import * as cookieParser from 'cookie-parser';
import * as debug from 'debug';
import * as bluebird from "bluebird";

const RedisStore = connectRedis(session);
bluebird.promisifyAll(RedisStore.prototype);

const trace = debug('sio:sessions');

function ensureAuthenticated(req: Request, res: Response, next?: NextFunction) {

    // provide the data that was used to authenticate the request; if this is 
    // not set then no attempt to authenticate is registered. 
    //    req['challenge'] = req.get('Authorization');
    trace("============================================================");
    trace("Session: ", (req.session && req.session.id) + ': ' + JSON.stringify(req.session, null, 2));

    if (req.session['user']) {
        req['authenticated'] = req.session['user'];
        trace(`User '${req.session['user']}' reused session ${req.session.id}`);

    }

    // If the authorization header is correct, mark the request as being authenticated
    else if (req.headers['authorization']) {
        let authMethod = req.headers['authorization'].split(' ')[0].toLowerCase();
        trace(`New session created with authentication ${authMethod}`);
        let authModule = getAuthModule(authMethod);
        req['authenticated'] = authModule.authenticate(req, res);
        if (req['authenticated']) {
            trace(`Authentication succeeded for user ${req['authenticated']}`);
            req.session['user'] = req['authenticated'];
        }
    }
    next && next();
}

function initSessionStore(app: Application, config: any) {
    // Session middleware is registered first
    if (config.sessions) {
        let options = config.sessions.redis = config.sessions.redis || {};
        options.logErrors = config.sessions.redis.logErrors != null ? config.sessions.redis.logErrors : true;
        options.prefix = "Session:";
        let entity: any = Service.instance.make(`Session`);
        entity.native$ = bluebird.promisify(entity.native$, { context: entity });
        options.client = wait(entity.native$());

        options.serializer = {
            stringify: function (session: any) {
                if (!session._createdAt) session._createdAt = new Date();
                session._updatedAt = new Date();
                return JSON.stringify(session);
            },
            parse: function (session) {
                return JSON.parse(session);
            }
        }
        context()['sessionStore'] = new RedisStore(options);

        let maxAge = config.sessions.redis.ttl * 1000 || 60000;
        let sessionMiddleware = session({
            store: context()['sessionStore'],
            secret: config.sessions.secret || 'secret',
            resave: true,
            saveUninitialized: false,
            name: config.sessions.cookieName || 'spirit.io.admin.sid',
            cookie: {
                path: '/',
                httpOnly: true,
                secure: false,
                maxAge: maxAge
            }
        });
        app.use(sessionMiddleware);
        app.use(function (req: Request, res: Response, next: NextFunction) {
            run(() => {
                var tries = 3

                function lookupSession(error?: Error) {
                    if (error) {
                        throw error;
                    }

                    tries -= 1

                    if (req.session !== undefined) {
                        return;
                    }

                    if (tries < 0) {
                        throw new Error('Sessions handler not available');
                    }

                    sessionMiddleware(req, res, lookupSession)
                }

                lookupSession();
                next();
            }).catch(e => {
                next(e);
            });
        })
    } else {
        throw new Error("Redis session store is not configured. Please check your configuration file.");
    }
}

function getAuthModule(name) {
    let mod = require('./auth/' + name);
    if (!mod) throw httpHelper.badAuthMethod(name);
    return mod();
};




export function extend(server: Server) {

    server.contract.registerModelsByPath(path.resolve(path.join(__dirname, './models')));
    Compiler.registerModels(server.contract);

    server.app.set('trust proxy', 1)
    server.app.use(cookieParser());
    // Create session store
    initSessionStore(server.app, server.config);

    // Set auth middleware for authentication
    server.middleware.authMiddleware = ensureAuthenticated;

    // Register login route
    server.app.use('/login', (req: Request, res: Response, next: NextFunction) => {
        run(() => {
            ensureAuthenticated(req, res);
            let usr = req['authenticated'];
            if (usr) {
                res.json({
                    $diagnoses: [{
                        $severity: 'info',
                        $message: `User '${usr}' logged in successfully`
                    }]
                });
            } else {
                res.setHeader("WWW-Authenticate", "Basic");
                throw httpHelper.unauthorized();
            }
            next();
        }).catch(e => {
            e.status = 401;
            next(e);
        });
    });

    // Register logout route
    server.app.get('/logout', (req: Request, res: Response, next: NextFunction) => {
        run(() => {
            let usr = req.session['user'];
            if (!usr) {
                res.json({
                    $diagnoses: [{
                        $severity: 'error',
                        $message: `Logout failed. No session found.`
                    }]
                });
            } else {
                req.session.destroy(e => {
                    if (e) throw e;
                    res.json({
                        $diagnoses: [{
                            $severity: 'info',
                            $message: `User '${usr}' logged out successfully`
                        }]
                    });
                });
            }
        }).catch(e => {
            next(e);
        });
    });

}