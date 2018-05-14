/** usage **
ROUTER.init({callback: function(addr){alert(addr)} });
ROUTER.init({
    mode: 'history',
    bindAnchors: true,
    callback: function(path){ document.querySelector('#msg').innerHTML += path+'<br>' }
});
/**/
var ROUTER = {
    mode: 'hash', // history
    activated: false,
    bindAnchors: false,
    initCallback: true,
    path: '',
    root: null,
    callback: function(path){ console.log(path) },
    init: function(settings){

        //reinit
        if(!this.activated) this.activated = true;
        else{
            this.path = '';
            this.check();
            return false;
        }

        //settings override
        if(settings) for(var i in settings){ this[i] = settings[i] }

        this.mode = this.mode == 'history' && !!(history.pushState) ? 'history' : 'hash';
        if(this.mode == 'history'){

            this.root = location.pathname;
            this.root = this.root != '/' ? '/' + this.clearSlashes(location.pathname) + '/' : '/';

            if(this.bindAnchors){
                var self = this,
                    fn = function(event){
                        var a = event.target;
                        if (a.tagName.toLowerCase() === 'a') {
                            var href = a.getAttribute("href");
                            if(href && /^(?!http).*/.test(href)){
                                self.goto(href);
                                event.preventDefault();
                                return false;
                            }
                        }
                    };
                if(window.addEventListener) document.addEventListener('click', fn, false);
                else if(window.attachEvent) document.attachEvent('click', fn);            
            }
        }
        this.listen();
        if(this.initCallback && this.path == '') this.callback(this.path);
    },
    check: function(){
        //console.log('checking...');
        if(this.path !== this.getFragment()) {
            this.path = this.getFragment();
            this.callback(this.path);
        }
    },
/*
    listen_old: function(){
        var self = this;
        clearInterval(this.interval);
        this.interval = setInterval(function(){ self.check() }, 50);
    },
*/
    listen: function(){
        var self = this;
        switch(this.mode){

            case 'history':
                (function(history){
                    var pushState = history.pushState;
                    history.pushState = function(state) {
                        if (typeof history.onpushstate == "function") {
                            history.onpushstate({state: state});
                        }
                        return pushState.apply(history, arguments);
                    }
                })(window.history);

                window.onpopstate = history.onpushstate = function(){ setTimeout(function(){ self.check() }, 10) };
                this.check();
                break;

            case 'hash':
                if(!('onhashchange' in window)) {
                    clearInterval(this.interval);
                    this.interval = setInterval(function(){ self.check() }, 100);
                }else{
                    if(window.addEventListener) window.addEventListener('hashchange', function(){ self.check() }, false);
                    else if(window.attachEvent) window.attachEvent('onhashchange', function(){ self.check() });
                    this.check();
                }
        }
    },
    goto: function(path){
        path = path || '';
        if(this.mode === 'history') {
            if(history.state !== path) history.pushState(path, null, this.root + path);
        } else {
            window.location.href = window.location.href.replace(/#(.*)$/, '') +'#'+ path;
        }
    },
    getFragment: function() {
        var fragment = '';
        if(this.mode === 'history') {
            fragment = this.clearSlashes(decodeURI(location.pathname));
            fragment = fragment.replace(this.clearSlashes(this.root), '');
            fragment = this.clearSlashes(fragment);
            //fragment = fragment.replace(/\?(.*)$/, '');
        } else {
            var match = window.location.href.match(/#(.*)$/);
            fragment = match ? match[1] : '';
        }
        return fragment;
    },
    clearSlashes: function(path) {
        return path.toString().replace(/\/$/, '').replace(/^\//, '');
    }
};

