
function Cake(name){
    this.name = name;
    this.components = {};
};



Cake.Components = function(name){
    return {
        subscribe(cb, ctx){
            function subscribeExternal(){
                let component = Cake.Components[name];
                
                if (component){
                    if (cb instanceof Function){
                        let name = cb.name;
                        if (ctx){
                            cb = cb.bind(ctx)
                        }
                        cb.binded = 'external';
                        cb.original = name;
                        cb.listenTo = component.name;
                        component.Subscribe(cb);
                    }
                } else {
                };
            };
            return new Promise((res, rej)=>{

                let lk = setInterval(()=>{
                    if (Cake.Components[name]){
                        
                        subscribeExternal();
                        clearInterval(lk);
                        res();
                    };
                });
            })
        },
    };
};


Cake.Models = {};
Cake.Subscribe = {};
Cake.Handlers = {};
Cake.Attributes = new Attrib();





Cake.Models.$loaded = function(name){
    return new Promise((res, rej)=>{
        let mk = setInterval(()=>{
            if (Cake.Models[name]){
                clearInterval(mk);
                res(Cake.Models[name]);
            };
        });
        setTimeout(()=>{
            if(!Cake.Models[name]){
                clearInterval(mk);
                rej(name);
            }
        }, 10000);
    })
};

Cake.MainMessageChannel = (function(){
    let channel = new MessageChannel();
    return {
        send(data){
            // console.log(data);
            channel.port2.postMessage(data);
        },
        receive(fn){
            channel.port1.onmessage = function(payload){
                let {isTrusted, data} = payload || {isTrusted:false};
                if (isTrusted){
                    fn({status:1, data});
                } else {
                    fn({status:0, err:'not trusted!'});
                };
            };
        },
    };
})();

Cake.Utils = {
    scopeTrap(k){
        return false;
    },
    scopeNotifier(m){
        return m;
    },
};
Cake.create = function(name, template, options){
    let group = new Cake(name, template, options);
    group.create(name, template, options);
};
Cake.plugin = function(){};
Cake.init = function(name){
    return new Cake(name);
};

Cake.Scope = new Scope(Cake, {
    trap(k){
        return Cake.Utils.scopeTrap(k);
    },
});

Cake.Hasher = new Hasher(Cake.Components); 
Cake.Hasher.listen();
//register a notifier;
Cake.Scope.registerNotifier(function(prop, newValue, prevValue){
    return Cake.Attributes.notifier(prop, newValue, prevValue);
});

Cake.Attributes.registerNotifier(function(obj){
    Cake.Scope.notifier(obj);
});

Cake.Persistent = new Persistent;

Cake.Persistent.listen(Cake.Components);

Cake.Cache = new StorageKit({
    name:'cache',
    storage:'session',
    child:'object',
});

Cake.getSubscriber = function(component, handler){
    let subscribe = Cake.Subscribe;
    let obj = {};
    for (let c in subscribe){
        if (subscribe.hasOwnProperty(c)){
            let handlers = subscribe[c];
            // console.log(handlers);
            for (let h in handlers){
                if (handlers.hasOwnProperty(h)){
                    let hs = handlers[h];
                
                    for (let h of hs){
                        let _handler = h;
                        let original = _handler.original;
                        let binded = _handler.binded;
                        let listenTo = _handler.listenTo;

                        if (listenTo == component){
                            // console.log(original, handler, original==handler);
                            if (original == handler){
                                if (!obj[binded]){
                                    obj[binded] = handler;
                                } else {
                                    let v = obj[binded] instanceof Array?obj[binded]:[obj[binded]];
                                    obj[binded] = v.concat(handler);
                                };
                            } else if(!handler) {
                                // console.log(h);
                                if (!obj[binded]){
                                    obj[binded] = original;
                                } else {
                                    let v = obj[binded] instanceof Array?obj[binded]:[obj[binded]];
                                    obj[binded] = v.concat(original);
                                };
                            }
                        };

                    };
                };
            };
        }
    };
    return obj;
};

Cake.Cache.getAll()
    .then(items=>{
        //in every refresh of the app the items in the Keep will be queried and re-watch by the Scope
        if (items instanceof Array){
            for (let i = 0; i < items.length; i++){
                let item = items[i];
                Cake.Scope.watch(item);
            }
        } else if (typeof items == 'string'){
            Cake.Scope.watch(items);
        };
    });
 
Cake.Observer = new Observer(Cake.Subscribe, Cake.Handlers);

Cake.prototype._defineProperty = function(component, prop, get, set){
    Object.defineProperty(component, prop, {
        configurable:true,
        get(){
            return get();
        },
        set(value){
            if (set){
                set(value);
            } else {
                // throw new Error(`unable to set property in (${prop})`);
            }
        },
    });
};

Cake.worker = (function(){
    // let sw = new Worker('/scripts/cake-worker.js');
    // return function(route, data){
    //     let obj  = {route, data};
    //     sw.postMessage(obj);
    //     return new Promise((res, rej)=>{
    //         sw.onmessage = function(e){
    //             res(e.data);
    //         }
    //     });
    // }
})();


Cake.prototype._defineProperty(Component.prototype, '$worker', function(){
    let sw = new Worker('worker.js');
    return function(route, data){
        sw.postMessage({route, data});
        return new Promise((res, rej)=>{
            sw.onmessage = function(e){
                res(e.data);
            }
        });
    }
})

Cake.prototype._defineProperty(Component.prototype, '$observer', function(){
    return Cake.Observer;
});
//scope
Cake.prototype._defineProperty(Component.prototype, '$scope', function(){
    Cake.Scope.install();
    let scope = Cake.$scope;
    Object.defineProperty(scope, 'extend', {
        configurable:true,
        get(){
            return function(target, obj){
                target = Cake.Scope.temp[target];
                if ((target).toString().includes('Object')){
                    Object.assign(target, obj);
                } else {
                    console.error(`${target} is not an intance of Object`);
                };
            };
        }
    });
    return scope;
});
//attributes
Cake.prototype._defineProperty(Component.prototype, '$attrib', function(){
    return Cake.Attributes;
});
//persistent ui using sessionStorage
Cake.prototype._defineProperty(Component.prototype, '$persist', function(){
    return Cake.Persistent;
});
//caching data;
Cake.prototype._defineProperty(Component.prototype, '$cache', function(){
    return Cake.Cache;
});
//hash
Cake.prototype._defineProperty(Component.prototype, '$hash', function(){
    return Cake.Hasher;
});



Cake.prototype.create = function(name, template, options){
    // console.time(name);
    //observer

    console.time(name);
    let component = new Component(name, template, options);
    //after it has been pass to Cakem t ws assumed that the fn are binded to component holder;
  
    component.compile.then(()=>{
        let { subscribe, root, html, handlers, role} = component;
        // console.log(root);
        // console.log(role == 'form');
        role == 'form' && (function(){
            Formy.bind(component)();
            // console.log(component)
        })();

        //subscribe and handlers are binded to its componnt
        Cake.Observer.registerSubscribe(subscribe);
        Cake.Observer.registerHandlers(handlers, component.name);
        this._defineProperty(component, 'root', function(){
            if (component._root){
                return component._root;
            }else {
                let selector = root || '#app';
                let query = document.querySelector(selector);
                if (query){
                    return query;
                }
            };
            throw new Error(`the selector '${selector}' as container of component '${component.name}' is not found!`);
        },function(value){
            Object.assign(component, {_root:value})
        });
        //html getter;
    }).then(()=>{
        component.fire = (function(){
            function fire(name, variable){
                /**
                 * the static fn of fire are those declared in handlers;
                 * fire is also a function that accepts handler fn, that is not declared in handlers;
                 * these are commonly refers to quick functions;
                 * the usage of fire is to manually run the notify, it tells notify what handler has been fired;
                 * so that the notify will make a variable from it, to be feed to subscriber to that;
                 */

                variable = !variable?null:typeof variable == 'function'?variable.bind(component)():(function(){return variable}).bind(component)();

                let o = {
                    [name]:()=>{
                        return variable;
                    }
                };
                fn = o[name].bind(component);
                if (typeof fn == 'function'){
                    fn.name = name;
                    fn.original = name;
                    fn.binded = component.name;
                    Cake.Observer.registerHandlers({[name]: fn}, component.name);
                    // const awaitNotify = Cake.Observer.notify(component.name, name, {});
                    // component.await[name] = awaitNotify;
                    // return awaitNotify;

                    let payload = variable;
                    // console.log(payload);
                    if (variable && (variable.element || variable.root)){
                        payload = {status:0, message:'element cant be cloned'};
                    };

                    Cake.MainMessageChannel.send({component:component.name, event:name, payload});

                    const notify = Cake.Observer.notify(component.name, name, {}).then(()=>{
                        return Cake.Observer.results[component.name][name];
                    });
                    component.await[name] = notify;
                    return component.await[name];
                };
                console.error(`the param in fire is not an instance of function`);
            };
            
            function addStaticMethod(fn, handlers){
                for (let h in handlers){
                    if (handlers.hasOwnProperty(h)){
                        let handler = handlers[h];
                        let event = handler.original;
                        Object.defineProperty(fn, event, {
                            get(){
                                let fn = {
                                    [event]:function (variable, isBroadcast){
                                        
                                        //automatic broadcast if the event is destroy;
                                        if (isBroadcast != undefined){
                                            isBroadcast = isBroadcast;
                                        };
                                        if (isBroadcast == undefined && event == 'destroy'){
                                            //force to broadcast is destroy event;
                                            isBroadcast = true;
                                        };
                                        if (isBroadcast == undefined){
                                            isBroadcast = false;
                                        }

                                        if (isBroadcast){
                                            /**
                                             * async
                                             */
                                            // console.log(component.name)
                                            // if (event == 'destroy'){
                                            //     console.log('start of destroying')
                                            // }
                                            const notify = new Promise((res, rej)=>{
                                                //without setTimeout, there will be a problem;
                                                //i think setTimeout, helps the promise to call resolve;
                                                //as it commands the promise to resolve on the next clock tick;
                                                setTimeout(()=>{
                                                    // let not = Cake.Observer.notify(component.name, event, variable);

                                                    // console.log(variable);
                                                    let payload = variable;
                                                    if (variable && variable.element){
                                                        payload = {status:0, message:'element cant be cloned'};
                                                    };
                                                    // console.log(payload);
                                                    Cake.MainMessageChannel.send({component:component.name, event:name, payload});

                                                    Cake.Observer.notify(component.name, event, variable).then(()=>{

                                                        return Cake.Observer.results[component.name][event];
                                                    }).then(r=>{
                                                        res(r);
                                                    }).catch(err=>{
                                                        console.error(err);
                                                    });
                                                    
                                                });
                                            });
                                            component.await[event] = notify;
                                            return component.await[event];
                                            // console.log(variable, !!isBroadcast, handler);
                                        } else {
                                            return handler(variable);
                                        };
                                    }
                                };
                                fn[event] = fn[event].bind(component);
                                fn[event].originalName = event;
                                fn[event].binded = component.name;

                                return fn[event];
                            },
                        });
                    };
                };
            }
            addStaticMethod(fire, component.handlers);

            return fire;
        })()
    }).then(()=>{

        if (component.type == 'view'){
            // component.observer.register(subscribe);
            // component.observer(Cake.Subscribe);

            //parse attributes;


            // //get watch items
            // //register watch items;
            // //register to scope
            // component._watchBindedItems()//these are the binded data declared in html;

            component.toggler = component.toggler(component);
            //store the component, for cacheing;
            Cake.Components[name] = component;
        };
    }).then(()=>{

        if (component.type == 'model'){
            Cake.Models[name] = component;
        }
        if (component.isStatic && component.type == 'view'){
            // console.log(component.fire)
            // console.time();
            component.render();
            // console.timeEnd();
        } else {
            
        };
    });
    // console.timeEnd(name);
};






