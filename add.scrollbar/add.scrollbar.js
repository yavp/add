'use strict';

(async () => {
	const res = await fetch('add.scrollbar.html');
	const template = await res.text();

	// Parse and select the template tag here instead 
	// of adding it using innerHTML to avoid repeated parsing
	// and searching whenever a new instance of the component is added.
	const HTMLTemplate = new DOMParser().parseFromString(template, 'text/html').querySelector('template[id="add-scrollbar"]');

	customElements.define('add-scrollbar', 	class AddScrollbar extends HTMLElement {

		constructor() {
			super();

			const self = this;
			const shadowRoot = this.attachShadow({ mode: 'open' });
			// Clone the template and the cloned node to the shadowDOM's root.
			const instance = HTMLTemplate.content.cloneNode(true);
			shadowRoot.appendChild(instance);

			this.panel = shadowRoot.querySelector('.panel');
			this.scroll = shadowRoot.querySelector('.panel > .scroll');
			this.content = shadowRoot.querySelector('.panel > .scroll > .content');
			this.slider = shadowRoot.querySelector('.panel > .bar.V > .slider');

			let fix = this.scroll.offsetHeight - this.panel.offsetHeight - this._getNativeScrollerWidth();
			this.content.style.margin = '0 '+fix+'px '+fix+'px 0';

			this.scroll.onscroll = function() {
				if(!self.memo) self._analyze();//TODO: some analisys on first scroll to check if there are changes in state
				self.slider.style.top = ~~(self.scroll.scrollTop*self.memo.coef +.5) + 'px';
			};

		}

		connectedCallback() {

			console.log(this._getNativeScrollerWidth())
			//const userId = this.getAttribute('user-id');
			//...
		}

		disconnectedCallback() {

		}

		// privates
		_getNativeScrollerWidth() {
			if(!document._native_bar_width) {
				let _test = UTILS.OBJ('div', {
					innerHTML: '<div style="position:absolute; top:0px; left:0px; width:100%; height:100%; overflow:scroll;"></div>',
					style:{
						position: 'absolute',
						top: '-100px',
						left: '-100px',
						width: '70px',
						height: '70px'
					}
				}, document.body);

				document._native_bar_width = _test.offsetWidth - _test.firstChild.scrollWidth;
				document.body.removeChild(_test, document.body);

				/*UTILS.event.create(window, 'resize', function() {
					let scrollbars = document.getElementsByTagName('DIV');
					for(let i = scrollbars.length; i--;){
						if(/scrollbar/i.test(scrollbars[i].className)){
							scrollbars[i]._parent.Format();
						}
					}
				});*/
			}
			return document._native_bar_width;
		};

		_analyze() {
			if(!this.memo || this.memo.content_h != this.content.offsetHeight || this.memo.panel_h != this.panel.offsetHeight){
				this.memo = {
					content_h: this.content.offsetHeight,
					panel_h: this.panel.offsetHeight
				}
				this.memo.scroll_h =  this.memo.panel_h - this.slider.offsetHeight;
				this.memo.coef = this.memo.scroll_h / (this.memo.content_h - this.memo.panel_h);

			}
			this.memo.scroll_t = this.scroll.scrollTop;
			this.memo.slider_t = this.slider.offsetTop;
		};



		// public
		Format() {
			this._analyze();
			this.slider.style = {
				top: ~~(this.scroll.scrollTop*this.memo.coef +.5) + 'px',
				visibility: this.memo.content_h > this.memo.panel_h ? '' : 'hidden'
			};
			//this.checkStream();
		};

		Append(arg) {

			if(typeof(arg) == 'string') self.content.innerHTML = arg + (self.content_bottom ? '<div class="s_bottom"></div>' : '<div></div>'); 
			else self.content.insertBefore(arg, self.bottom);

	//		if(self.Stream){
	//			// TODO.. insert html before 'bottom' and after current html :) !!!
	//			// now overrites the existing html !!!
	//			if(typeof(arg) == 'string') self.content.innerHTML = arg + '<div class="s_bottom"></div>'; 
	//			else self.content.insertBefore(arg, self.bottom);
	//		}else{
	//			if(typeof(arg) == 'string') self.content.innerHTML += arg;
	//			else self.content.appendChild(arg);
	//		}

			self.Format();
			self.stream_running = false;
		};

		Clear() {
			self.content.scrollTop = 0;
			self.stream_ended = false;

	//		self.content.innerHTML = self.Stream ? '<div class="s_bottom"><div><span></span></div></div>' : '';
	//		if(self.Stream){
	//			self.bottom = self.content.lastChild;
	//			self.bottom.loader = new LOADER(self.bottom.firstChild.firstChild);
	//		}
			self.content.innerHTML = self.content_bottom ? '<div class="s_bottom"><div><span></span></div></div>' : '<div></div>';
			self.bottom = self.content.lastChild;
			if(self.content_bottom) self.bottom.loader = new LOADER(self.bottom.firstChild.firstChild);

			self.Format();
		};
	});

})();










































/*

var SCROLLBAR = function(trg, override_default_settings){
	
	var self = this;

	self.target = (typeof(trg) == 'string') ? document.getElementById(trg) : trg;
	if(!self.target){
		debug('SCROLLBAR: target not found!');
		return false;
	}
	self.target._parent = this;
	self.target.className = self.target.className ? self.target.className+' scrollbar' : 'scrollbar';

	// default settings
	self.scroll_margin = 1; //px
	self.content_dragging = true;
	self.content_bottom = true;
	self.Stream = false; // infinite scroll callback function ex: Stream = function(){ ajax request };

	// override default settings
	for(var s in override_default_settings){ self[s] = override_default_settings[s] }

	// private
	self.stream_running;
	self.stream_ended;
	self.checkStream = function(){

		if(self.Stream && !self.stream_ended && !self.stream_running && self.memo.content_h - self.memo.target_h - 155 < self.bar.scrollTop){
			//debug((self.memo.content_h - self.memo.target_h - 10) +' < '+  self.memo.scroll_t)
			self.stream_running = true;
			//self.bottom.loader.Play();
			self.Stream();
		}
	};
	self.getNativeScrollerWidth = function(){
		if(!document._native_bar_width){
			var _test = document.createElement('div');
			with(_test.style){
				position = 'absolute';
				top = left = '-100px';
				width = height = '70px';
			}
			_test.innerHTML = '<div style="position:absolute; top:0px; left:0px; width:100%; height:100%; overflow:scroll;"></div>';
			document.body.appendChild(_test);
			document._native_bar_width = _test.offsetWidth - _test.firstChild.scrollWidth;
			document.body.removeChild(_test, document.body);
			delete _test;

			EVENT.create('resize', function(){
				var scrollbars = document.getElementsByTagName('DIV');
				for(var i=scrollbars.length; i--;){
					if(/scrollbar/i.test(scrollbars[i].className)){
						scrollbars[i]._parent.Format();
					}
				}
			}, window);
		}
		return document._native_bar_width;
	};


	// dom
	DJ(self, {
		"wrapper": document.createElement('div'),
		className: 's_wrapper'
	});	
	DJ(self, {
		"content": document.createElement('div'),
		className: 's_content'
	});
	DJ(self, {
		"bar": document.createElement('div'),
		className: 's_native',
		style: { right: '-'+(40 + self.getNativeScrollerWidth())+'px' },
		onscroll: function(){
			var inst = this._parent;
			if(!inst.memo) inst.Analize();//TODO: some analisys on first scroll to check if there are changes in state
			inst.slider.style.top = ~~(this.scrollTop*inst.memo.coef +.5) + 'px';
			inst.checkStream();
		},
		onmouseup: MOUSE.Off
	});
	DJ(self, {
		"slider": document.createElement('div'),
		className: 's_slider',
		innerHTML: '<div></div>',
		style: {visibility: 'hidden'},
		onmousedown: function(){
			var inst = this._parent;
			inst.Analize();
			MOUSE.On({
				target: this.firstChild,
				mark_drag: true,
				cursor: 'move_vertical',
				vertical: {
					move: function(ev){
						inst.bar.scrollTop = ~~((inst.memo.slider_t - MOUSE.change_y)/inst.memo.coef +.5);
					}
				}
			});
		},
		onmouseup: MOUSE.Off
	});

	self.target.appendChild(self.wrapper);
	self.wrapper.appendChild(self.bar);
	self.bar.appendChild(self.content);
	self.wrapper.appendChild(self.slider);

	// make visible the hidden content part in the native scrollbar 
	self.content.style.right = (self.slider.firstChild.offsetWidth + self.scroll_margin + 40) + 'px';

//	 additional events
//	 if(self.content_dragging || CLIENT.mobile2){
//		self.bar.onmousedown = function(){
//			var inst = this._parent;
//			inst.Analize();
//			MOUSE.On({
//				cursor: 'grab',
//				vertical: {
//					move: function(ev){
//						inst.bar.scrollTop = inst.memo.scroll_t + MOUSE.change_y;
//					},
//					release: function(){
//						//TODO: some speed fading eventually
//					}
//				}
//			});
//		};
//	}

	// mobile - touch
	if(CLIENT.mobile2){
		simulateTouchEvents(self.bar);
		simulateTouchEvents(self.slider);
	}

	// public methods
	this.Analize = function(){
		if(!self.memo || self.memo.content_h != self.content.offsetHeight || self.memo.target_h != self.target.offsetHeight){
			self.memo = {
				content_h: self.content.offsetHeight,
				target_h: self.target.offsetHeight
			}
			self.memo.scroll_h =  self.memo.target_h - self.slider.offsetHeight;
			self.memo.coef = self.memo.scroll_h / (self.memo.content_h - self.memo.target_h);

		}
		self.memo.scroll_t = self.bar.scrollTop;
		self.memo.slider_t = self.slider.offsetTop;
	};
	this.Format = function(){
		self.Analize();
		with(self.slider.style){
			top = ~~(self.bar.scrollTop*self.memo.coef +.5) + 'px';
			visibility = self.memo.content_h > self.memo.target_h ? '' : 'hidden';
		}
		self.checkStream();
	};
	this.Append = function(arg){

		if(typeof(arg) == 'string') self.content.innerHTML = arg + (self.content_bottom ? '<div class="s_bottom"></div>' : '<div></div>'); 
		else self.content.insertBefore(arg, self.bottom);

//		if(self.Stream){
//			// TODO.. insert html before 'bottom' and after current html :) !!!
//			// now overrites the existing html !!!
//			if(typeof(arg) == 'string') self.content.innerHTML = arg + '<div class="s_bottom"></div>'; 
//			else self.content.insertBefore(arg, self.bottom);
//		}else{
//			if(typeof(arg) == 'string') self.content.innerHTML += arg;
//			else self.content.appendChild(arg);
//		}
		self.Format();
		self.stream_running = false;
	};
	this.Clear = function(){
		self.content.scrollTop = 0;
		self.stream_ended = false;

//		self.content.innerHTML = self.Stream ? '<div class="s_bottom"><div><span></span></div></div>' : '';
//		if(self.Stream){
//			self.bottom = self.content.lastChild;
//			self.bottom.loader = new LOADER(self.bottom.firstChild.firstChild);
//		}
		self.content.innerHTML = self.content_bottom ? '<div class="s_bottom"><div><span></span></div></div>' : '<div></div>';
		self.bottom = self.content.lastChild;
		if(self.content_bottom) self.bottom.loader = new LOADER(self.bottom.firstChild.firstChild);

		self.Format();
	};
	self.Clear();
};
*/