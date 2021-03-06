import { Server } from 'spirit.io/lib/application';
import { context, run } from 'f-promise';
import { Fixtures as GlobalFixtures } from 'spirit.io/test/fixtures';
import * as sessions from '../../lib';
import { Session } from '../../lib/models/session';
import * as sns from 'seneca';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // Avoids DEPTH_ZERO_SELF_SIGNED_CERT error for self-signed certs

const port = 3000;
const redisPort = process.env.SPIRIT_REDIS_PORT || 6379;
const redisTestDb = 15;


const mocks = {
    users: function () {
        let instance = (<any>sns).test();
        // Define mock messages that the business logic needs
        instance.add('model:User,action:invoke,name:login', function (msg, reply) {
            // As this is a mock, the result is hard-coded
            reply(null, { login: msg.params && msg.params.login })
        });
        return instance;
    }
}

const config = {
    port: port,
    system: {
        exposeStack: true
    },
    store: {
        name: 'redis-store',
        connection: {
            uri: 'redis://localhost:' + redisPort + '/' + redisTestDb,
            options: {}
        }
    },
    sessions: {
        secret: 'SECRET',
        cookieName: 'sio.sid',
        redis: {
            ttl: 12000
        }
    },
    'services-mock': {
        'sio-users': mocks.users
    }


};

export class Fixtures extends GlobalFixtures {

    static setup = (done) => {
        function reset() {
            // remove currentSession from context
            if (context()['request'] && context()['request'].session && context()['request'].session.id) {
                delete context()['request'].session;
            }

            // delete the whole database
            Session.all().forEach((s) => {
                Session.destroy({
                    params: {
                        id: s.id
                    }
                })
            });
        }

        Fixtures.init(config);
        let firstSetup = true;
        if (!context().__server) {
            let server: Server = context().__server = new Server(config);
            run(() => {
                server.init();
            }).catch(err => {
                done(err);
            });
            server.on('initialized', function () {
                run(() => {
                    console.log("========== Server initialized ============\n");
                    sessions.extend(server);
                    server.start(port);
                }).catch(err => {
                    done(err);
                });
            });
            server.on('started', function () {
                run(() => {
                    console.log("========== Server started ============\n");
                    reset();
                    done();
                }).catch(err => {
                    done(err);
                });
            });
        } else {
            run(() => {
                firstSetup = false;
                reset();
                done();
            }).catch(err => {
                done(err);
            });
        }
        //
        return context().__server;
    }
}





