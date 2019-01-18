import {get, isEmpty} from 'lodash'
import {kraxFetch, kraxFetchOptions} from './krax-fetch';
import {actions, subscribe, getState} from './store'
import {ActionOptions, KraxResponse, ActionType} from './types'
import toastMessage from './message'

const initialValue:ActionType = {
    loading: true,
    error: '',
    payload: null,
    name: null,
    headers: null,
    ok: false,
    statusCode: null
};

export function krax<T>(options: ActionOptions<T>): Promise<KraxResponse<T>> & Promise<any> {
    const {request, payload} = options;

    const run = async () => {
        actions.set({
            ...initialValue,
            name: options.name
        });


        if (options.confirm && !isEmpty(options.confirm)) {
            await toastMessage({
                message:'',
                confirmMessage: options.confirm,
                overlayClose: false,
                close: false,
                theme: options.confirm.theme,
                messageType: options.confirm.theme,
                timeout: 10000000000
            });
        }

        if (request) {
            return kraxFetch<T>(kraxFetchOptions(request)).then((data) => {
                if (data.ok) {
                    // onSuccess
                    actions.set<ActionType>({
                        name: options.name,
                        loading: false,
                        payload: data.data,
                        headers: data.headers,
                        ok: true,
                        statusCode: data.statusCode
                    }, (ok: any) => {
                        if (ok) {
                            subs(options.name, options, true);
                        }
                    });

                } else {
                    // onError
                    actions.set({
                        name: options.name,
                        loading: false,
                        payload: null,
                        headers: data.headers,
                        ok: false,
                        error: data.error || '',
                        statusCode: data.statusCode
                    }, (ok: any) => {
                        if (!ok) {
                            subs(options.name, options, false);
                        }
                    });
                }
                return data;
            })
        }

        if (payload) {
            return new Promise((resolve) => {
                try {
                    actions.set({
                        name: options.name,
                        loading: false,
                        payload,
                        ok: true,
                    }, (ok: any) => {
                        if (ok) {
                            subs(options.name, options, true);
                        }
                    });
                } catch (e) {
                    actions.set({
                        name: options.name,
                        loading: false,
                        payload: null,
                        ok: false,
                        error: 'Houston! We have a problem',
                    }, (ok: any) => {
                        if (!ok) {
                            subs(options.name, options, false);
                        }
                    });
                }
                resolve(payload);
            })

        }

        console.warn("Houston! We have a problem")

        return new Promise((resolve) => {
            resolve(true);
        })
    };

    const checkOnBefore = async (onBeforeReturn) => {

        if (onBeforeReturn && onBeforeReturn['then']) {
            await onBeforeReturn;
            return true;
        }
        return false;
    };

    // onBefore
    if (options.onBefore) {
        const after = options.onBefore(getState());

        checkOnBefore(after);
    }


    return run();
}

function subs(name: string, options, status) {
    subscribe((_, state) => {
        if (get(state, name) && status) {
            if (options.onSuccess) {
                options.onSuccess(state)
            }
        }

        if (get(state, name) && !status) {
            if (options.onError) {
                options.onError(state, get(state, name).error)
            }
        }
    });
}

