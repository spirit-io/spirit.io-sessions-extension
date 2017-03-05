import { Request, Response, NextFunction } from "express";
import { IAuthModule } from './interfaces';
import { Service } from 'spirit.io/lib/core';
import * as httpHelper from 'spirit.io/lib/utils/http';

let singleton: Basic;

class Basic implements IAuthModule {
    authenticate(req: Request, res: Response, next: NextFunction): string {

        let credentials = /^basic\s([\w\+\/]+\=*)/i.exec(req.headers['authorization']);
        if (!credentials || credentials.length === 0) throw httpHelper.unauthorized();

        let str = new Buffer(credentials[1], "base64").toString("utf8");
        if (str.indexOf(':') === -1) throw httpHelper.unauthorized();
        let parts = str.split(':');
        var login = parts[0];
        var pwd = parts[1];

        let result: any = Service.act('model:User,action:invoke', {
            name: 'login',
            params: {
                login: login,
                password: pwd
            }
        }, 'sio-users');
        return result.login;
    }
}

module.exports = function () {
    if (singleton) return singleton;
    singleton = new Basic();
    return singleton;
}