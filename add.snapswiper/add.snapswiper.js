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
 * Horizontal Snap Swiper with optimized momentum exponential decay animation. Must be in a wrapper!
 *
 * @param {Object} prop - Customizable default settings.
 * @param {string} prop.scrollSelector - Unique scroller selector for one instance. If nodeList first match only works.
 * @param {string} prop.slidesSelector - Optional or all children become slides.
 * @param {number} prop.bottomBounceLimit [100] - px bottom left/right max bounce range.
 * @param {Object} prop.speed - Fine tuning.
 * @param {number} prop.speed.interval [16] - ~60fps animation.
 * @param {number} prop.speed.min [.6] - ppf pixels per frame-milliseconds
 * @param {number} prop.speed.influence [.5] - % (0-1) downsample stat.speed.
 * @param {number} prop.speed.sensitivity [.33] - % (0-1) downsample view.averageSpacing.
 * @param {number} prop.speed.maxframes [100] - max frames of momentum decay animation duration
 * @param {Object} prop.callbacks - All supported callbacks.
 * @param {Object} prop.callbacks.onPress
 * @param {Object} prop.callbacks.onRelease
 * @param {Object} prop.callbacks.onSwipeEnd
 *
 * @param {Object} depend - Dependencies
 * @param {Object} depend.recursiveOverride.
 * @param {Object} depend.timeline.
 */
var AddSnapSwiper = function(prop, depend) {
    var self = this;
    // Defaults
    this.prop = { // Customizable through @param prop
        scrollSelector: null,
        slidesSelector: null,
        bottomBounceLimit: 100,
        speed: {
            interval: 16,
            min: .6,
            influence: .15,
            sensitivity: .33,
            maxframes: 100
        },
        callbacks: {
            onPress: null,
            onRelease: null,
            onSwipeEnd: null,
            onResize: null
        }
    };
    this.depend = depend || { // Hard override through @param: depend
        recursiveOverride: recursiveOverride
    };

    // Override defaults
    this.depend.recursiveOverride(this.prop, prop || {});

    // DOM elements
    this.$scroll = $(this.prop.scrollSelector);
    if (!this.$scroll.length) {
        console.log('%csnapSwiper: ' + this.prop.scrollSelector + ' - not found', 'color:red');
        return false;
    }
    this.$slides = this.prop.slidesSelector ? $(this.prop.slidesSelector) : $(this.$scroll).children();
    if (!this.$slides.length) {
        console.log('%csnapSwiper: ' + this.prop.slidesSelector + ' - not found', 'color:orange');
        return false;
    }
    this.$wrapper = this.$scroll.parent().addClass('swipe-wrapper');
    this.$defence = $('<div class="swipe-defence"></div>').appendTo(this.$wrapper).hide();
    this.$scroll.addClass('swipe-scroll');

    // Public
    this.init = function() {
        if (!this.initiated) {
            this.initiated = true;
            this.view.reset(true);
            this.view.observe();
        } else {
            console.log('%csnapSwiper: already initiated', 'color:yellow');
        }
    };
    this.getPosition = function() {
        return ~~(this.$scroll[0].scrollLeft + 1);
    };

    // Private

    // analysis
    this.view = {
        snapPoints: [], // <- all slides x coordinates
        averageSpacing: null, // <- average spacing grid
        activated: false,
        reset: function(full) {
            this.wscroll = self.$scroll[0].scrollWidth; // <- current scroll inner width
            this.wscreen = self.$scroll[0].offsetWidth; // <- current scroll screen width
            this.maxscroll = this.wscroll - this.wscreen; // <- maximum scrollLeft value
            if (this.maxscroll == 0) {
                // turn OFF events
                this.toggle(false);
                return false;
            }
            if (full || !$(self.$slides[0]).hasClass('swipe-slide')) {
                // TODO: extend for lazy loading here.. view needs full reset
                for (var i = 0; i < self.$slides.length; i++) {
                    $(self.$slides[i]).not('.swipe-slide').addClass('swipe-slide');
                    this.snapPoints.push(Math.max(0, self.$slides[i].offsetLeft - 1));
                }
            }
            this.averageSpacing = ~~(this.wscroll / self.$slides.length + .5);

            // check snap point and force adjustment
            var scrpos = self.getPosition();
            if (scrpos < this.maxscroll - 1) {
                self.$scroll[0].scrollLeft = self.closest(scrpos, this.snapPoints);
            }
            
            // turn ON events
            this.toggle(true);
        },
        toggle: function(enable) {
            if ((enable && !this.activated) || (!enable && this.activated)) {
                var act = enable ? 'on' : 'off';
                self.$wrapper[act]('mousedown', self.onTouchStart);
                self.$scroll[act]('touchstart', self.onTouchStart);
                self.$scroll[act]('touchmove', self.onTouchMove);
                self.$scroll[act]('touchend', self.onTouchEnd);
                this.activated = enable || false;
            }
        },
        observe: function() {
            $(window).on('resize', function() {
                if (self.postpone) {
                    clearTimeout(self.postpone);
                }
                self.postpone = setTimeout(function() {
                    self.view.reset();
                    typeof self.prop.callbacks.onResize == 'function' && self.prop.callbacks.onResize();
                }, 30);
            });
        }
    };
    this.stat = {
        reset: function() {
            this.xscroll = 0; // <- initial scroll position onPress
            this.bounce = 0; // <- bottom left/right bounce relative pointer
            this.tstart = []; // <- time each touch started
            this.xtouch = []; // <- initial x position of each touch
            this.ytouch = []; // <- initial y position of each touch

            this.speed = 0; // <- calculated onRelease
            this.direction = 0; // <- calculated onRelease
            this.delta = 0; // <- calculated onRelease
            this.snapto = 0; // <- target scroll position - accessible onRelease but reached after animation ends
        }
    };

    // utils
    this.now = Date.now || function() {
        return new Date().getTime();
    };
    this.closest = function(num, arr) {
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
    };
    this.toggleMouseEvents = function(enable) {
        var act = enable ? 'on' : 'off';
        $(document)[act]('mousemove', self.onTouchMove);
        $(document)[act]('mouseup', self.onTouchEnd);
    };

    // generic touch events
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
        self.stat.xscroll = ~~(self.$scroll[0].scrollLeft + .5);

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

        // moved across Y axis - skip for now
        if (!self.isHorizontal && ydelta && Math.abs(ydelta) > Math.abs(xdelta)) {
            
            if (!self.isTouch) self.toggleMouseEvents(false);
            return true;
        }

        // moved across X axis
        if (xdelta) {
            if (!self.isHorizontal) {
                self.isHorizontal = true;
                if (!self.isTouch) self.$defence.show();
            }
            var scrollPos = self.stat.xscroll + xdelta;
            switch (true) {
                case scrollPos > self.view.maxscroll:
                    self.stat.bounce = Math.max(self.view.maxscroll - scrollPos, -self.prop.bottomBounceLimit);
                    self.$scroll[0].scrollLeft = self.view.maxscroll;
                    self.$scroll.css({'transform': 'translate3d(' + self.stat.bounce + 'px, 0, 0)'});
                    break;
                case scrollPos < 0:
                    self.stat.bounce = Math.min(-scrollPos, self.prop.bottomBounceLimit);
                    self.$scroll[0].scrollLeft = 0;
                    self.$scroll.css({'transform': 'translate3d(' + self.stat.bounce + 'px, 0, 0)'});
                    break;
                default:
                    self.stat.bounce = 0;
                    self.$scroll.css({'transform': ''});
                    self.$scroll[0].scrollLeft = scrollPos;
            }
        }
        event.preventDefault();
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
        if (self.stat.direction == 0) {
            return true;
        }

        self.decay.compose();
        self.decay.play();
        typeof self.prop.callbacks.onRelease == 'function' && self.prop.callbacks.onRelease();

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

    // momentum exponential decay animation
    this.decay = {
        frames: [],
        interval: null,
        playing: false,
        compose: function() {
            this.stop();
            this.frames = [];
            var targetPoint,
                sourcePoint = ~~(self.$scroll[0].scrollLeft + .5);
            
            switch (true) {
                // speed too slow
                case self.stat.speed < self.prop.speed.min:

                // displacement too small
                case self.stat.delta < self.view.averageSpacing * self.prop.speed.sensitivity:
                    targetPoint = self.stat.snapto = sourcePoint == self.view.maxscroll ?
                                    self.view.maxscroll :
                                        self.closest(sourcePoint, self.view.snapPoints);
                    break;

                // bottom right reached
                case sourcePoint == self.view.maxscroll && self.stat.direction == 1:
                    self.stat.snapto = self.view.maxscroll;
                    break;

                // bottom left reached
                case sourcePoint == 0 && self.stat.direction == -1:
                    self.stat.snapto = 0;
                    break;

                default:
                    var guessPoint = sourcePoint + self.view.averageSpacing * self.stat.speed * self.stat.direction * self.prop.speed.influence;
                    for (var i = 0; i < self.view.snapPoints.length; i++) {
                        if (self.view.snapPoints[i] > guessPoint) {
                            targetPoint = self.view.snapPoints[self.stat.direction == 1 ? i : i - 1];
                            break;
                        }
                    }
                    self.stat.snapto = Math.min(targetPoint, self.view.maxscroll);
            }

            if (self.stat.bounce) {
                targetPoint = 0;
            }
            var elapsed = 0,
                framesCount = self.prop.speed.maxframes,
                amplitude = self.stat.bounce ? self.stat.bounce : targetPoint - sourcePoint,
                position,
                anim;

            for (var i=0; i<framesCount; i++) {
                elapsed += self.prop.speed.interval;
                position = ~~(targetPoint - amplitude * Math.exp(-elapsed / framesCount) + .5);
                anim = self.stat.bounce ?
                    {
                        style: {transform: 'translate3d(' + -position + 'px, 0, 0)'}
                    } : {
                        scrollLeft: targetPoint == position ? targetPoint : position
                    };

                // add frame
                this.frames.push(anim);

                // end of animation
                if (targetPoint == position) {
                    break;
                }
            }
        },
        play: function() {
            this.stop();
            this.playing = true;
            this.interval = setInterval(function(){
                var frame = self.decay.frames.shift();
                requestAnimationFrame(function() {
                    for (var f in frame) {
                        if (f == 'style') {
                            for (var s in frame[f]) {
                                self.$scroll[0][f][s] = frame[f][s];
                            }
                        } else {
                            self.$scroll[0][f] = frame[f];
                        }
                    }
                });
                if (!self.decay.frames.length) {
                    self.decay.stop();
                    typeof self.prop.callbacks.onSwipeEnd == 'function' && self.prop.callbacks.onSwipeEnd();
                }
            }, self.prop.speed.interval);
        },
        stop: function() {
            if (this.interval) clearInterval(this.interval);
            this.playing = false;
        }
    };

    // auto init
    this.init();
};
