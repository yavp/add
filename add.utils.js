
var UTILS = (function(){

	// object assembler - the first in the list
	this.OBJ = function(){
		/*** USAGE:
			var obj = {};
			UTILS.OBJ(obj, {
				domelm: document.createElement('div'),
				className:'some-class',
				innerHTML:'<b>hello</b>',
				style:{border:'1px solid #000'}	
			}, document.body);
			//document.body.appendChild(obj.domelm);

				<<<<< OR >>>>>

			var domelm = UTILS.OBJ('div',{
				className:'some-class',
				innerHTML:'<b>hello</b>',
				style:{border:'1px solid #000'}
			});//selector optional also!
			document.body.appendChild(domelm);
		***/
		var a = arguments[0], // tagname or parent-object
			b = arguments[1], // json - properties, methods & events
			c = arguments[2], // place to append to
			d = (typeof(a) == 'string'),
			e = d,
			j = d ? document.createElement(a) : a;
		if(j&&b){
			for(var i in b){
				switch(i){
					case 'style': if(b[i] instanceof Object) for(var ii in b[i]){ j[i][ii] = b[i][ii] } break;
					case 'className': j._class = b[i];
					default: j[i] = b[i];
				}
				if(!e){// only when 'a' is object first loop must create the child with the given name; the loops after are its properties, methods & events
					e = true;
					j = j[i];
					j._parent = a;
				}
			}
		}
		if(c) c.appendChild(j);
		if(d) return j;
	};

	// events
	this.event = {
		trigger: function(element, type){
			if(!element) element = document;
			if(document.createEventObject){
				// IE
				var evt = document.createEventObject();
				return element.fireEvent('on'+type, evt);
			}else{
				// Firefox + others
				var evt = document.createEvent("HTMLEvents");
				// mozilla mousewheel
				if(type == "mousewheel") evt.initEvent("DOMMouseScroll", true, true );
				evt.initEvent(type, true, true );//event (type,bubbling,cancelable)
				return !element.dispatchEvent(evt);
			}
		},
		observe: function(e){
			if(!e){e=window.event}
			var targ = e.target || e.srcElement;
			if(targ&&targ.nodeType==3) targ = targ.parentNode;
			return {target:targ, event:e, type:e.type};
		},
		create: function(element, type, listener){
			var targ = !element ? document : element,
				adEvt = targ.addEventListener || targ.attachEvent,
				typ = targ.addEventListener ? type : 'on' + type;

			// mozilla mousewheel
			if(type == "mousewheel" && targ.addEventListener) adEvt("DOMMouseScroll", listener);
			adEvt(typ, listener);
		},
		delete: function(element, type, listener){
			var targ = !element ? document : element,
				rmEvt = targ.removeEventListener || targ.detachEvent,
				typ = targ.removeEventListener ? type : 'on' + type;

			// mozilla mousewheel
			if(type == "mousewheel" && targ.removeEventListener) rmEvt("DOMMouseScroll", listener);
			rmEvt(typ, listener);
		}
	};

	// old-school-json manipulations
	this.json = {
		_parent: this,
		_depend: {
			'form': this.form
		},
		_str_encode: true,
		merge: function(obj, tuner){
			/*** NOTE:
				obj (object or array)
					- contains full structure
				tuner (identical to obj)
					- can contain partial structure (only the parts to update)
					- optional (no argument = copy of obj)
			***/
			var _obj;
			if(obj.constructor === Array){
				_obj = [];
				for(var i=0; i<obj.length; i++){
					switch(true){
						// NULL => skip node *** array key-nodes CAN NOT be deleted! NULL is used to ignore minor indexes. ex. [null, null, null, 'third index to override']
						case typeof(obj[i])!='object'&&typeof(obj[i])!='array':
							// STRING, NUMBER, BOOLEAN => end node
							_obj[i] = tuner && tuner[i] != null ? tuner[i] : obj[i];
							break;
						default:
							// ARRAY, OBJECT => go deeper
							_obj[i] = this.merge(obj[i], tuner && tuner[i] ? tuner[i] : null);

					}
				}
			}else if(obj.constructor === Object && !obj.parentNode/*skip dom elements*/){
				_obj = {};
				for(var e in obj){
					if(!obj[e].firstChild/*skip dom elements*/){
						if(tuner && tuner[e] === null){
							// NULL => delete node *** all nodes CAN be deleted!. ex. {node_to_delete: null, node_to_keep: boolean|string|object|array }
							// TODO: only must be able to add new! (in one more loop trough tuner after this OR more elegant? )
						}else{
							switch(true){
								case typeof(obj[e])!='object'&&typeof(obj[e])!='array':
									// STRING, NUMBER, BOOLEAN => end node
									_obj[e] = tuner && tuner[e] != null ? tuner[e] : obj[e];
									break;
								default:
									// ARRAY, OBJECT => go deeper
									_obj[e] = this.merge(obj[e], tuner && tuner[e] ? tuner[e] : null);
							}
						}
					}
				}
			}
			return _obj;
		},
		parse: function(str_json){

			//TODO: try - catch !?!
			
			return eval('('+str_json+')');
		},
		stringify: function(obj_json, encode_true_false/* resets globally how to process string encoding */){
			if(encode_true_false != null) this._str_encode = encode_true_false;
			var str="";
			if(obj_json&&obj_json.length){
				str+="[";
				for(var i=0; i<obj_json.length; i++){
					var inf;
					if(typeof(obj_json[i])!='object'&&typeof(obj_json[i])!='array'){
						inf=(typeof(obj_json[i])=='string') ? "'"+ (this._str_encode ? this._depend.form.value_to_html(obj_json[i]) : obj_json[i]) +"'":obj_json[i];
					}else{
						inf=this.stringify(obj_json[i]);
					}
					str+=(i==0)?inf:","+inf;
				}
				str+="]";
			}else if(obj_json&&!obj_json.parentNode){
				str+="{";
				var count=0;
				for(var e in obj_json){
					if(!obj_json[e].firstChild){
						var inf;
						if(typeof(obj_json[e])!='object'&&typeof(obj_json[e])!='array'){
							inf=(typeof(obj_json[e])=='string') ? "'"+ (this._str_encode ? this._depend.form.value_to_html(obj_json[e]) : obj_json[e]) +"'":obj_json[e];
						}else{
							inf=this.stringify(obj_json[e]);
						}
						str+=(count==0)?e+":"+inf:","+e+":"+inf;
						count++;
					}
				}
				str+="}";
			}
			return str;
		}
	};

	this.form = {
		_parent: this,
		get_fields: function(trg){
			/*** NOTE:
				skips inputs & textareas WITHOUT name attribute
				returns {'name_of_filed': <dom filed elm>, 'name_of_filed': <dom field elm>, ...}
			***/
			var _output = {},
				inpObj = [
					trg.getElementsByTagName('input'),
					trg.getElementsByTagName('textarea')
				];
			for(var i=inpObj.length; i--;) {
				for(var ii=inpObj[i].length; ii--;){
					var inp = inpObj[i][ii];
					if(inp.name) _output[inp.name] = inp;
				}
			}
			return _output;
		},
		html_to_value: function(str){
			str = str || '';
			str = str.replace(/<br>/gi,'\n');
			str = str.replace(/&#43;/gi,'+');
			str = str.replace(/&#39;/g,'\'');
			str = str.replace(/&#34;/g,'"');
			return str;
		},
		value_to_html: function(str){
			str = str || '';
			str = str.replace(/\n/gi, '<br>');
			str = str.replace(/\'/g, '&#39;');
			str = str.replace(/\"/g, '&#34;');
			str = str.replace(/\+/gi, '&#43;');
			str = str.replace(/\&/gi, escape('&')); // ready to send request
			return str;
		},
		json_to_value: function(str){
			str = str || '';
			str = str.replace(/&#39;/g, '\\\'');
			return str;
		},
		value_to_json: function(str){
			str = str || '';
			str = str.replace(/\n/gi, '');
			str = str.replace(/\\\'/g, '&#39;');
			str = str.replace(/\"/g, '&#34;');
			str = str.replace(/\+/gi, '&#43;');
			//console.log(str)
			str = str.replace(/\&/gi, escape('&'));
			return str;
		}
	};

	this.cookie = {
		/*** USAGE:

			// set
			UTILS.cookie.set({
				name: '_n',
				value: 'alabala',
				seconds: 5
			});

			// delete
			UTILS.cookie.set({name: '_n'});

			// get
			UTILS.cookie.get('_n');
		***/
		set: function(prop){
			if(!prop || !prop.name){
				console.log('%cERR: UTILS > cookie > name', 'color:red');
				return false;
			}
			var nam = prop.name,
				val = prop.value ? escape(prop.value) : "",
				exp = new Date(),
				calc;
			switch(true){
				case !!prop.milliseconds: calc = prop.milliseconds; break;
				case !!prop.seconds: calc = 1000*prop.seconds; break;
				case !!prop.minutes: calc = 1000*60*prop.minutes; break;
				case !!prop.hours: calc = 1000*60*60*prop.hours; break;
				case !!prop.days: calc = 1000*60*60*24*prop.days; break;
			}

			if(calc){
				exp.setTime(exp.getTime() + calc);
				exp.toUTCString();
			}else{
				exp = "Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0;";
				val = "";
			}

			document.cookie = nam +"="+ val +
				";domain="+ window.location.hostname +
				";path=/"+
				";expires="+ exp;

		},
		get: function(name){
			var cook = "" + document.cookie,
				ind = cook.indexOf(name),
				iind;
			
			if(ind == -1 || cook == "") return "";
			iind = cook.indexOf(';', ind);
			if(iind == -1) iind = cook.length;
			return unescape(cook.substring(ind + cook.length + 1, iind));
		}
	};

	// base64 encode/decode
	this.base64 = {
		encode: function (input){
			var output = new this.StringBuffer();
			var enumerator = new this.Utf8EncodeEnumerator(input);
			while (enumerator.moveNext()){
				var chr1 = enumerator.current;
				enumerator.moveNext();
				var chr2 = enumerator.current;
				enumerator.moveNext();
				var chr3 = enumerator.current;
				var enc1 = chr1 >> 2;
				var enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
				var enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
				var enc4 = chr3 & 63;
				if (isNaN(chr2)){
					enc3 = enc4 = 64;
				}else if (isNaN(chr3)){
					enc4 = 64;
				}
				output.append(this.codex.charAt(enc1) + this.codex.charAt(enc2) + this.codex.charAt(enc3) + this.codex.charAt(enc4));
			}
			return output.toString();
		},
		decode: function (input){
			var output = new this.StringBuffer();
			var enumerator = new this.Base64DecodeEnumerator(input, this.codex);
			while (enumerator.moveNext()){
				var charCode = enumerator.current;
				if (charCode < 128){
					output.append(String.fromCharCode(charCode));
				}else if ((charCode > 191) && (charCode < 224)){
					enumerator.moveNext();
					var charCode2 = enumerator.current;
					output.append(String.fromCharCode(((charCode & 31) << 6) | (charCode2 & 63)));
				}else{
					enumerator.moveNext();
					var charCode2 = enumerator.current;
					enumerator.moveNext();
					var charCode3 = enumerator.current;
					output.append(String.fromCharCode(((charCode & 15) << 12) | ((charCode2 & 63) << 6) | (charCode3 & 63)));
				}
			}
			return output.toString();
		},
		// private
		codex: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
		StringBuffer: function(){
			this.buffer = [];
			this.append = function(string){
				this.buffer.push(string); 
				return this;
			};
			this.toString = function(){
				return this.buffer.join("");
			};
		},
		Utf8EncodeEnumerator: function(input){
			this._input = input;
			this._index = -1;
			this._buffer = [];
			this.current = Number.NaN;
			this.moveNext = function(){
				if (this._buffer.length > 0){
					this.current = this._buffer.shift();
					return true;
				}else if (this._index >= (this._input.length - 1)){
					this.current = Number.NaN;
					return false;
				}else{
					var charCode = this._input.charCodeAt(++this._index);
					// "\r\n" -> "\n"
					if ((charCode == 13) && (this._input.charCodeAt(this._index + 1) == 10)){
						charCode = 10;
						this._index += 2;
					}
					if (charCode < 128){
						this.current = charCode;
					}else if ((charCode > 127) && (charCode < 2048)){
						this.current = (charCode >> 6) | 192;
						this._buffer.push((charCode & 63) | 128);
					}else{
						this.current = (charCode >> 12) | 224;
						this._buffer.push(((charCode >> 6) & 63) | 128);
						this._buffer.push((charCode & 63) | 128);
					}
					return true;
				}
			};
		},
		Base64DecodeEnumerator: function(input, codex){
			this.codex = codex;
			this._input = input;
			this._index = -1;
			this._buffer = [];
			this.current = 64;
			this.moveNext = function(){
				if (this._buffer.length > 0){
					this.current = this._buffer.shift();
					return true;
				}else if (this._index >= (this._input.length - 1)){
					this.current = 64;
					return false;
				}else{
					var enc1 = this.codex.indexOf(this._input.charAt(++this._index));
					var enc2 = this.codex.indexOf(this._input.charAt(++this._index));
					var enc3 = this.codex.indexOf(this._input.charAt(++this._index));
					var enc4 = this.codex.indexOf(this._input.charAt(++this._index));
					var chr1 = (enc1 << 2) | (enc2 >> 4);
					var chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
					var chr3 = ((enc3 & 3) << 6) | enc4;
					this.current = chr1;
					if (enc3 != 64) this._buffer.push(chr2);
					if (enc4 != 64) this._buffer.push(chr3);
					return true;
				}
			}
		}
	};

	// Robert Penner's easing funks
	this.fisics = {
		/*** NOTE:
			t Current time.
			c Change.
			d Duration.
			b Begin.
		***/
		normal:function(t,c,d,b){
			if(!b){b=0}
			if ((t/=d)==1){return b+c;}
			return t*c/d;
		},
		elasticEaseOut:function(t,c,d,b,a,p){
			if(!b){b=0}
			if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
			if (!a || a < Math.abs(c)) { a=c; var s=p/4; }
			else var s = p/(2*Math.PI) * Math.asin (c/a);
			return (a*Math.pow(2,-10*t) * Math.sin( (t*d-s)*(2*Math.PI)/p ) + c + b);
		},
		elasticEaseIn:function(t,c,d,b,a,p){
			if(!b){b=0}
			if (t==0) return b;  
			if ((t/=d)==1) return b+c;  
			if (!p) p=d*.3;
			if (!a || a < Math.abs(c)) {
				a=c; var s=p/4;
			}else{
				var s = p/(2*Math.PI) * Math.asin (c/a);
			}
			return -(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
		},
		elasticEaseInOut:function (t,c,d,b,a,p){
			if(!b){b=0}
			if (t==0) return b;
			if ((t/=d/2)==2) return b+c;
			if (!p) p=d*(.3*1.5);
			if (!a || a < Math.abs(c)) {var a=c; var s=p/4; }
			else var s = p/(2*Math.PI) * Math.asin (c/a);
			if (t < 1) return -.5*(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
			return a*Math.pow(2,-10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )*.5 + c + b;
		},
		regularEaseOut:function(t,c,d,b){
			if(!b){b=0}
			return -c *(t/=d)*(t-2) + b;
		},
		regularEaseIn:function(t,c,d,b){
			if(!b){b=0}
			return c*(t/=d)*t + b;
		},
		regularEaseInOut:function(t,c,d,b){
			if(!b){b=0}
			if ((t/=d/2) < 1) return c/2*t*t + b;
			return -c/2 * ((--t)*(t-2) - 1) + b;
		},
		bounceEaseOut:function(t,c,d,b){
			if(!b){b=0}
			if ((t/=d) < (1/2.75)) {
				return c*(7.5625*t*t) + b;
			} else if (t < (2/2.75)) {
				return c*(7.5625*(t-=(1.5/2.75))*t + .75) + b;
			} else if (t < (2.5/2.75)) {
				return c*(7.5625*(t-=(2.25/2.75))*t + .9375) + b;
			} else {
				return c*(7.5625*(t-=(2.625/2.75))*t + .984375) + b;
			}
		},
		bounceEaseIn:function(t,c,d,b){
			if(!b){b=0}
			return c - this.bounceEaseOut (d-t, 0, c, d) + b;
		},
		bounceEaseInOut:function(t,c,d,b){
			if(!b){b=0}
			if (t < d/2) return this.bounceEaseIn (t*2, 0, c, d) * .5 + b;
			else return this.bounceEaseOut (t*2-d, 0, c, d) * .5 + c*.5 + b;
		},
		strongEaseOut:function(t,c,d,b){
			if(!b){b=0}
			return c*((t=t/d-1)*t*t*t*t + 1) + b;
		},
		strongEaseIn:function(t,c,d,b){
			if(!b){b=0}
			return c*(t/=d)*t*t*t*t + b;
		},
		strongEaseInOut:function(t,c,d,b){
			if(!b){b=0}
			if ((t/=d/2) < 1) return c/2*t*t*t*t*t + b;
			return c/2*((t-=2)*t*t*t*t + 2) + b;
		},
		backEaseOut:function(t,c,d,b,a,p){
			if(!b){b=0}
			if (s == undefined) var s = 1.70158;
			return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b;
		},
		backEaseIn:function(t,c,d,b,a,p){
			if(!b){b=0}
			if (s == undefined) var s = 1.70158;
			return c*(t/=d)*t*((s+1)*t - s) + b;
		},
		backEaseInOut:function(t,c,d,b,a,p){
			if(!b){b=0}
			if (s == undefined) var s = 1.70158; 
			if ((t/=d/2) < 1) return c/2*(t*t*(((s*=(1.525))+1)*t - s)) + b;
			return c/2*((t-=2)*t*(((s*=(1.525))+1)*t + s) + 2) + b;
		}
	};

	// keyboard most-common-keys handle
	this.keyboard = {
		/*** USAGE:
			var keyboardObject = {
				keys: {
					entr: function(){alert(1)}, // ENTER
					esc: function(){alert(2)} // ESCAPE
				}
			};
			UTILS.keyboard.focus(keyboardObject); //activate key-usage for <keyboardObject>
					<<<<< OR >>>>>
			UTILS.keyboard.focus({keys:{space: function(){alert(3)}, back: function(){alert(4)}}});
					==============
			UTILS.keyboard.blur(keyboardObject); //deactivate key-usage for <keyboardObject>
					<<<<< OR >>>>>
			UTILS.keyboard.blur(); //removes last active keyboardObject if any
			UTILS.keyboard.blur(true); //empty & reset keyboardObject

		***/
		_parent: this,
		_depend: {
			'event': this.event
		},
		// Pushes a keyboard-object to the focus queue activating its assigned key functionalities.
		focus: function(obj){
			this.observeKeys();
			if(this.queue.length && this.queue[this.queue.length-1] == obj ) return false;
			this.queue.push(obj);
		},
		// When removing a keyboard-object from the queue the last one that remains is automatically focused.
		blur: function(obj){
			if(this.queue.length){
				switch(true){
					case obj: //reset
						this.queue = [];
						break;
					case !!obj: //remove k-obj
						for(var i = this.queue.length; i--;){
							if(this.queue[i] == obj){
								this.queue.splice(i, 1);
								break;
							}
						}
						break;
					default: //remove last k-obj (recommended usage)
						this.queue.pop();
				}
				if(!this.queue.length) this.destroy();
			}
		},
		// clean all own traces
		destroy: function(){
			this.queue = [];
			var self = this;
			this._depend.event.delete(document, 'keydown', function(e){
				self.checkKeys(e);
			});
			this._keysOn = false;
		},
		// private
		queue: [],
		observeKeys: function(){
			if(this._keysOn) return false;
			this._keysOn = true;
			var self = this;
			this._depend.event.create(document, 'keydown', function(e){
				self.checkKeys(e);
			});
		},
		mapKeys: function(e){
			var keycode;
			e = e || window.event;
			keycode = e.keyCode || e.which;
			//character=String.fromCharCode(keycode);
			return keycode; // character
		},

		checkKeys: function(e){
			if(this.queue.length>0){
				var f = this.queue[this.queue.length-1]; // only last queued is focused
				if(!f.keys) return;
				switch (true){
					case f.keys.esc && this.mapKeys(e) == 27: e.preventDefault(); f.keys.esc(); break;	// ESC
					case f.keys.entr && this.mapKeys(e) == 13: f.keys.entr(); break;					// ENTER
					case f.keys.space && this.mapKeys(e) == 32: f.keys.space(); break;					// SPACEBAR
					case f.keys.back && this.mapKeys(e) == 8: f.keys.back(); break;						// BACKSPACE
					case f.keys.next && this.mapKeys(e) == 39: f.keys.next(); break;					// RIGHT
					case f.keys.prev && this.mapKeys(e) == 37: f.keys.prev(); break;					// LEFT
					case f.keys.up && this.mapKeys(e) == 38: f.keys.up(); break;						// UP
					case f.keys.down && this.mapKeys(e) == 40: f.keys.down(); break;					// DOWN
				}
				//
				if(f.keys.anykey) f.keys.anykey();														// any-key-press callback
				return;
			}
		}
	};

	this.window = {
		size: function(){
			var h = 0, w = 0;
			switch (true){
				case typeof(window.innerWidth) == 'number':
					w = window.innerWidth;
					h = window.innerHeight;
					break;
				case document.documentElement && (document.documentElement.clientWidth || document.documentElement.clientHeight):
					w = document.documentElement.clientWidth;
					h = document.documentElement.clientHeight;
					break;
				case document.body && (document.body.clientWidth || document.body.clientHeight):
					w = document.body.clientWidth;
					h = document.body.clientHeight;
					break;
			}
			return {width: w, height: h};
		}
	};

	this.number = {
		no_exponents: function(n){
			/*	USAGE:
				var num = 9.3984724281935E-310;
				alert(UTILS.number.no_exponents(num));
			*/
			var data = String(n).split(/[eE]/);
			if (data.length == 1) return data[0]; 

			var  z = '', sign = n < 0 ? '-' : '',
				str = data[0].replace('.', ''),
				mag = Number(data[1])+ 1;

			if (mag < 0){
				z = sign + '0.';
				while (mag++) z += '0';
				return z + str.replace(/^\-/,'');
			}
			mag -= str.length;  
			while (mag--) z += '0';
			return str + z;
		},
		nearest: function(n, v, small_big_auto){
			/*	USAGE:
				UTILS.number.nearest(22.5, 15, 'big'); -> 30
			*/
			n = n / v;
			var nn;
			switch (small_big_auto){
				case 'small':
					nn = ~~(n);
					break;
				case 'big':
					nn = ~~(n + 1);
					break;
				default:
					nn = ~~(n + .5);
			}
			n = nn * v;
			return n;
		}
	};

	this.detect = {
		transition_end: function(){
			var i,
				undefined,
				el = document.createElement('div'),
				transitions = {
					'transition' :'transitionend',
					'OTransition' :'otransitionend',
					'MozTransition' :'transitionend',
					'WebkitTransition': 'webkitTransitionEnd'
				};

			for (i in transitions){
				if (transitions.hasOwnProperty(i) && el.style[i] !== undefined){
					return transitions[i];
				}
			}
			return false;
		},
		animation_end: function(){
			var i,
				undefined,
				el = document.createElement('div'),
				animations = {
					'animation': 'animationend',
					'OAnimation': 'oAnimationEnd',
					'MozAnimation': 'animationend',
					'WebkitAnimation': 'webkitAnimationEnd'
				};

			for (i in animations){
				if (animations.hasOwnProperty(i) && el.style[i] !== undefined){
					return animations[i];
				}
			}
			return false;
		}
	};

	this.timeline = {
		// Settings
		speed: 16, //ms -> 60fps
		movies: [],
		// Privates
		interval: null,
		safeCPU: true,
		// Public methods
		add: function(movie) {
			if (!movie.target || !movie.frames || !movie.frames.length) return false;
			if (this.safeCPU) this.protectCPU();
			if (!movie.count) movie.count = 0;
			if (!movie.loop) movie.loop = false;
			if (!movie.started) movie.started = true;
			else return false;

			this.movies.push(movie);
			this.resume();
		},
		remove: function(target) {
			for(var i = this.movies.length; i--;){
				if (this.movies[i].target == target){
					if (this.movies[i].started) this.movies[i].started = false;
					else return false;
					return this.movies.splice(i, 1);
				}
			}
			return false;
		},
		// Private methods
		nextFrame: function() {
			if (!this.movies.length) this.hold();
			else {
				var excluder = [];
				for (var i = 0; i < this.movies.length; i++) {
					var frames = this.movies[i].frames,
						count = this.movies[i].count;
					for (var e in frames[count]) {
						switch(e){
							case 'action':
								frames[count].action(this.movies[i].target);
							default:
								this.movies[i].target.style[e] = frames[count][e];
						}
					}

					this.movies[i].count++;
					if (this.movies[i].count == frames.length){
						if (this.movies[i].loop) this.movies[i].count = 1;
						else excluder.push(this.movies[i]);
					}
				}
				if (excluder.length > 0) {
					for (var i = excluder.length; i--;) {
						typeof excluder[i].onFinish == 'function' && excluder[i].onFinish();
						this.remove(excluder[i].target);
					}
					if(this.movies.length == 0){
						this.hold();
					}
				}
			}
		},
		hold: function() {
			if (this.interval){
				clearInterval(this.interval);
				this.interval = null;
			}
		},
		resume: function() {
			if (!this.interval && this.movies.length) {
				this.interval = setInterval(this.nextFrame, this.speed);
			}
		},
		protectCPU: function() {
			this.safeCPU = false;
			window.addEventListener('blur', this.hold, false);
			window.addEventListener('focus', this.resume, false);
		}
	};

	return this;

})();
