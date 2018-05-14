'use strict';

function recursiveOverride(source, merge) {
    for (var i in merge) {
        switch (true) {
            case merge[i] && merge[i].constructor === Object:
                if (!source[i]) source[i] = {};
                recursiveOverride(source[i], merge[i]);
                break;
            case merge[i] && merge[i].constructor === Array:
                source[i] = merge[i].slice();
                break;
            default:
                source[i] = merge[i];
        }
    }
}
function debug() {
    var z = [],
        dbg = $('div.debugerr');
        dbg.on('click', function(){$(this).html('').hide()});

    if (!dbg.length) {
        return false;
    } else {
        dbg = dbg[0];
        dbg.style.display = 'block';
    }

    for (var i=0; i<arguments.length; i++) {
        z.push(arguments[i])
    }
    z = z.join(', ');

    if (dbg.offsetHeight > $(window).height()) {
        dbg.innerHTML = '<span>'+z+'</span>';
    } else {
        dbg.innerHTML += '<span>'+z+'</span>';
    }
}

/**
 * Horizontal Snap swiper. Must be in a wrapper.
 *
 * @param {Object} prop - Customizable default settings.
 * @param {string} prop.swiperSelector - Unique scroller selector for one instance. If nodeList first match only works.
 * @param {string} prop.slidesSelector - Optional or all children become slides.
 * @param {Object} prop.speed - Fine tuning.
 * @param {number} prop.speed.interval [16] - ~60fps animation.
 * @param {number} prop.speed.min [.6] - ppf pixels per frame-milliseconds
 * @param {number} prop.speed.influence [.5] - % (0-1) downsample stat.speed.
 * @param {number} prop.speed.sensitivity [.33] - % (0-1) downsample view.averageSpacing.
 * @param {Object} prop.callbacks - All supported callbacks.
 * @param {Object} prop.callbacks.onInit
 * @param {Object} prop.callbacks.onLoad
 * @param {Object} prop.callbacks.onPress
 * @param {Object} prop.callbacks.onRelease
 *
 * @param {Object} depend - Dependencies
 * @param {Object} depend.recursiveOverride.
 * @param {Object} depend.timeline.
 */
var AddSnapSwiper = function(prop, depend) {
    var self = this;
    // Defaults
    this.prop = { // Customizable through @param prop
        swiperSelector: null,
        slidesSelector: null,
        startSlideIndex: 0,
        speed: {
            interval: 16, // <- ~60(fps)
            min: .6, // <- (ppf) pixels per frame (milliseconds)
            //max: 5, // <- (ppf)
            influence: .15, // <- %(0 - 1) downsample @param stat.speed
            sensitivity: .33, // <- %(0 - 1) downsample @param view.averageSpacing
            duration: 100 // frames
        },
        callbacks: {
            onPress: null,
            onRelease: null,
            onInit: null,
            onLoad: null
        }
    };
    this.depend = depend || { // Hard override through @param: depend
        recursiveOverride: UTILS.recursiveOverride,
        timeline: UIutils.timeline
    };

    // Override defaults
    this.depend.recursiveOverride(this.prop, prop || {});

    // DOM elements
    this.$swiper = $(this.prop.swiperSelector);
    if (!this.$swiper.length) {
        console.log('%csnapSwiper: ' + this.prop.swiperSelector + ' - not found', 'color:red');
        return false;
    }
    this.$slides = this.prop.slidesSelector ? $(this.prop.slidesSelector) : $(this.$swiper).children();
    if (!this.$slides.length) {
        console.log('%csnapSwiper: slides - not found', 'color:orange');
        return false;
    }
    this.$wrapper = this.$swiper.parent().addClass('swipe-wrapper');
    this.$defence = $('<div class="swipe-defence"></div>').appendTo(this.$wrapper).hide();
    this.$swiper.addClass('swipe-active');

    // Public
    this.init = function() {

        this.view.reset(true);

        this.view.observe();

    };

    // Private

    // Analysis
    this.view = {
        snapPoints: [], // <- all slides x coordinates
        averageSpacing: null, // <- average spacing grid
        activated: false,
        reset: function(full) {
            this.wscroll = self.$swiper[0].scrollWidth; // <- current scroll inner width
            this.wscreen = self.$swiper[0].offsetWidth; // <- current scroll screen width
            this.maxscroll = this.wscroll - this.wscreen; // <- maximum scrollLeft value
            if (this.maxscroll == 0) {

                // turn OFF events
                this.toggle(false);
                debug('no - scroll')
                return false;
            }
            if (full) {
                // TODO: extend for lazy loading here.. view needs full reset
                for (var i = 0; i < self.$slides.length; i++) {
                    $(self.$slides[i]).not('.swipe-slide').addClass('swipe-slide');
                    this.snapPoints.push(Math.max(0, self.$slides[i].offsetLeft - 1));
                }
            }
            this.averageSpacing = ~~(this.wscroll / self.$slides.length + .5);
            
            // turn ON events
            this.toggle(true);
            debug('yes - scroll')
        },
        toggle: function(enable) {
            if ((enable && !this.activated) || (!enable && this.activated)) {
                var act = enable ? 'on' : 'off';
                self.$wrapper[act]('mousedown', self.onTouchStart);
                self.$swiper[act]('touchstart', self.onTouchStart);
                self.$swiper[act]('touchmove', self.onTouchMove);
                self.$swiper[act]('touchend', self.onTouchEnd);
                this.activated = enable || false;
            }
        },
        observe: function() {
            $(window).on('resize', function() {
                self.view.reset();
            });
        }
    };
    this.stat = {
        reset: function() {
            this.xscroll = 0; // <- initial scroll position onPress
            this.tstart = []; // <- time each touch started
            this.xtouch = []; // <- initial x position of each touch
            this.ytouch = []; // <- initial y position of each touch
            this.speed = 0; // <- calculated onRelease
            this.direction = 0; // <- calculated onRelease
            this.delta = 0; // <- calculated onRelease
        }
    };

    // Utils
    this.now = Date.now || function() {
        return new Date().getTime();
    };
    this.toggleMouseEvents = function(enable) {
        var act = enable ? 'on' : 'off';
        $(document)[act]('mousemove', self.onTouchMove);
        $(document)[act]('mouseup', self.onTouchEnd);
    };

    // Generic touch events
    this.onTouchStart = function(event) {

        self.decay.stop();
        self.stat.reset();
        self.isTouch = !/^mouse/.test(event.type);

        var t = self.now();
        switch (self.isTouch) {
            case true:
                self.eachTouchEvent(event, function(i, e) {
                    self.stat.tstart[i] = t;
                    self.stat.xtouch[i] = e.clientX;
                    self.stat.ytouch[i] = e.clientY;
                });
                break;
            default:
                self.stat.tstart[0] = t;
                self.stat.xtouch[0] = event.clientX;
                self.stat.ytouch[0] = event.clientY;
                self.toggleMouseEvents(true);
                event.preventDefault();
        }
        
        typeof self.prop.callbacks.onPress == 'function' && self.prop.callbacks.onPress();
        self.stat.xscroll = ~~(self.$swiper[0].scrollLeft + .5);

        debug('started');
        return true;
    };
    this.onTouchMove = function(event) {
        var xdelta, ydelta;
        switch (self.isTouch) {
            case true:
                self.eachTouchEvent(event, function(i, e) {
                    xdelta = self.stat.xtouch[i] - e.clientX;
                    ydelta = self.stat.ytouch[i] - e.clientY;
                });
                break;
            default:
                xdelta = self.stat.xtouch[0] - event.clientX;
                ydelta = self.stat.ytouch[0] - event.clientY;
        }

        if (!self.isHorizontal && ydelta && Math.abs(ydelta) > Math.abs(xdelta)) {

            if (!self.isTouch) self.toggleMouseEvents(false);
            debug('Y MOVE !!!');
            return true;
        }
        if (xdelta) {
            if (!self.isHorizontal) {
                self.isHorizontal = true;
                if (!self.isTouch) self.$defence.show();
            }
            self.$swiper[0].scrollLeft = Math.max(0, self.stat.xscroll + xdelta);
        }
        event.preventDefault();

        debug('moving');
        return false;
    };
    this.onTouchEnd = function(event) {
        var tdelta, xmoved;
        switch (self.isTouch) {
            case true:
                self.eachTouchEvent(event, function(i, e) {
                    tdelta = self.now() - self.stat.tstart[i];
                    xmoved = self.stat.xtouch[i] - e.clientX;
                });
                break;
            default:
                tdelta = self.now() - self.stat.tstart[0];
                xmoved = self.stat.xtouch[0] - event.clientX;
                self.toggleMouseEvents(false);
                self.$defence.hide();
        }

        self.isHorizontal = false;
        self.stat.speed = Math.abs(xmoved) / tdelta;
        self.stat.direction = xmoved ? (xmoved < 0 ? -1 : 1) : 0;
        self.stat.delta = Math.abs(xmoved);

        self.decay.compose();

        typeof self.prop.callbacks.onRelease == 'function' && self.prop.callbacks.onRelease();

        self.decay.play();

        //console.log('ended',self.stat.speed,self.stat.direction);
        return true;
    };
    this.eachTouchEvent = function(event, callback) {
        var i = -1, 
            touched = event.originalEvent || event,
            changed = touched.changedTouches || [];
        while (++i < changed.length) {
            callback(i, changed[i]);
        }    
    }
    this.decay = {
        frames: [],
        interval: null,
        compose: function() {

            function closest (num, arr) {
                var curr = arr[0];
                var diff = Math.abs (num - curr);
                for (var val = 0; val < arr.length; val++) {
                    var newdiff = Math.abs (num - arr[val]);
                    if (newdiff < diff) {
                        diff = newdiff;
                        curr = arr[val];
                    }
                }
                return curr;
            }

            //console.log(self.stat.speed, self.stat.direction, self.view.averageSpacing);

            this.frames = [];
            var targetPoint,
                sourcePoint = ~~(self.$swiper[0].scrollLeft + .5);
            
            switch (true) {
                case (
                        sourcePoint != self.view.maxscroll && (
                            self.stat.delta < self.view.averageSpacing * self.prop.speed.sensitivity || 
                            self.stat.speed < self.prop.speed.min
                        )
                    ):
                    targetPoint = closest(sourcePoint, self.view.snapPoints);
                    break;

                case (
                        sourcePoint == self.view.maxscroll &&
                        self.stat.direction == 1
                    ):
                    self.stat.targetPoint = self.view.maxscroll;
                    debug('RIGHT-BOTTOM !');
                    return false;

                case (
                        sourcePoint == 0 &&
                        self.stat.direction == -1
                    ):
                    self.stat.targetPoint = 0;
                    debug('LEFT-BOTTOM !');
                    return false;

                default:
                    var guessPoint = ~~(self.$swiper[0].scrollLeft + self.view.averageSpacing * self.stat.speed * self.stat.direction * self.prop.speed.influence + .5);
                    for (var i = 0; i < self.view.snapPoints.length; i++) {
                        if (self.view.snapPoints[i] > guessPoint) {
                            targetPoint = self.view.snapPoints[self.stat.direction == 1 ? i : i - 1];
                            break;
                        }
                    } 
            }


            debug(self.stat.direction + '|' + self.stat.speed, targetPoint, self.$swiper[0].scrollLeft);


            var elapsed = 0,
                framesCount = self.prop.speed.duration,
                amplitude = targetPoint - sourcePoint;
            for (var i=0; i<framesCount; i++) {
                elapsed += self.prop.speed.interval;

                this.frames.push({
                    scrollLeft: i == framesCount - 1 ?
                        targetPoint :
                            ~~(targetPoint - amplitude * Math.exp(-elapsed / framesCount) + .5)
                });
            }

            self.stat.targetPoint = targetPoint;

            //self.$swiper[0].scrollLeft = targetPoint;
            //console.log(this.frames)
        },
        play: function() {
            this.stop();
            this.interval = setInterval(function(){
                var frame = self.decay.frames.shift();
                requestAnimationFrame(function() {
                    for (var f in frame) {
                        if (f == 'style') {
                            for (var s in frame[f]) {
                                self.$swiper[0][f][s] = frame[f][s];
                            }
                        } else {
                            self.$swiper[0][f] = frame[f];
                        }
                    }
                });
                if (!self.decay.frames.length) {
                    self.decay.stop();
                }
            }, self.prop.speed.interval);
        },
        stop: function() {
            if (this.interval) clearInterval(this.interval);
        }
    };

    // INIT
    this.init();

};
