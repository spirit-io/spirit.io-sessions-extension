import { model, route } from 'spirit.io/lib/decorators';
import { IActionParameters } from 'spirit.io/lib/interfaces';
import { ModelBase } from 'spirit.io/lib/base';
import { HttpError } from 'spirit.io/lib/utils';
import { context, wait } from 'f-promise';

@model({ persistent: false })
export class Session extends ModelBase {
    cookie: Object;
    user: string;
    data: Object;

    @route('get', '')
    static all(): any {
        return wait(context()['sessionStore'].allAsync());
    }

    @route('get', '/:id')
    static get(params: IActionParameters): any {
        return wait(context()['sessionStore'].getAsync(params.params.id));
    }

    @route('delete', '/:id')
    static destroy(params: IActionParameters): any {
        let currentSid = context()['request'] && context()['request'].session && context()['request'].session.id
        if (currentSid === params.params.id) throw new HttpError(500, "Current session can't be destroyed");

        let result = wait(context()['sessionStore'].destroyAsync(params.params.id));
        if (result === 0) throw new HttpError(500, "Session id not found. No session destroyed");
        params.res$ && params.res$.status(204);
        return {
            $diagnoses: [{
                $severity: "success",
                $message: "Session destroyed successfully"
            }]
        };
    }
}