/**
 * CSS parser Slick
 * https://github.com/subtleGradient/slick#slick-css-selector-parser
 * http://mootools.net/core/docs/1.6.0/Slick/Slick
 * http://jsfiddle.net/rpflorence/pHLyk/
 * https://davidwalsh.name/css4-preview
 * 
 * https://www.w3.org/TR/css3-selectors/
 * https://drafts.csswg.org/selectors-4/#pseudo-elements
 * 
 * TODO
 * Декодировать автоматически JSON.parse('"\\u041e\\u0448\\u0438\\u0431\\u043a\\u0430"');
 * Предусмотреть вытаскивание информера из атрибута тега
 * Предусмотреть обработку CSS селекторов за 1 проход
 * 
 * @param {string|number|object|null} any  description
 * @link  https://developers.google.com/closure/compiler/docs/js-for-compiler
 */
function AB(any) {
	"use strict";

	//Приватные переменные

	/**
	 * `string` -- хранит какой-либо текст (например, HTML или сериализованный JSON).
	 * `number` -- хранит число (например, результат вычисления)
	 * `object` -- результат выполнения `JSON.parse()` или `eval()`
	 * `null`	-- если в результате выполнения `this.find()` ничего не нашлось или что-то сломалось
	 * 
	 * @type {string|number|object|null}
	 */
	var _any = any;

	/**
	 * Массив функций для последовательного исполнения (с контекстом объекта AB)
	 * 
	 * @type {array}
	 */
	var _stack = [];

		//Приватные методы

	var	/*
		function _htmlEntityDecodeRecursive(any, strict) {
			if ('string' === typeof any) return any.htmlEntityDecode(strict);
			if ('object' === typeof any) for (var prop in any) any[prop] = _htmlEntityDecodeRecursive(any[prop], strict);
			return any;
		}
		*/

		/**
		 * Детектирует и преобразовывает содержимое, при необходимости
		 * 
		 * @param	{string|number|object|null}	any
		 * @param	{bool}						allowTransformType
		 * @returns	{string|number|object|null}
		 */
		_transformContent = function(any, allowTransformType) {
			if ('string' !== typeof any) return any;
			any = any.trim();

			var htmlIndexOf = any.htmlIndexOf();
			if (htmlIndexOf === 0) return any; //это точно HTML, сразу катапультируемся

			//Если HTML не обнаружен и текст (который может быть JSON) оказался в атрибуте тега, необходимо декодировать HTML сущности
			if (htmlIndexOf === -1) any = any.htmlEntityDecode(false);

			if (! allowTransformType) return any;

			//JavaScript array/object detect
			var js = any.getJsArrayOrObject(),
				jsIndexOf = ('string' === typeof js) ? any.indexOf(js) : -1;

			//для корректного сравнения смещений
			if (htmlIndexOf === -1) htmlIndexOf = Infinity;
			if (jsIndexOf   === -1) jsIndexOf	= Infinity;

			if (jsIndexOf < htmlIndexOf) {
				try {
					any = JSON.parse(js);
				} catch (e) {
					try {
						//TODO сделать, как в safeEval(), чтобы небыло доступа к объекту AnyBalance.
						//При use strict код внутри eval/Function по-прежнему сможет читать и менять внешние переменные, однако переменные и функции, объявленные внутри eval, не попадут наружу.
						any = Function('return ' + js).apply(null);
					} catch (e) {
						any = null;
					}
				}
			}
			return any;
		},

		executeStack = function() {
			_stack.forEach(function(func) {
				func();
				console.log(_any);
			});
		};

	return {
		//_any : any,

		//Публичные методы. Задают правила обработки и выстраивают их в цепочку

		/**
		 * Фильтрует содержимое
		 * 
		 * @param	{string|RegExp}	rule	Для строки нужно передать CSS селектор
		 * @param	{object}		options	Для строки нужно передать CSS селектор
		 * @returns	{AB}
		 * @link	http://jsonselect.org/#tryit
		 */
		find: function(rule, options) {
			//AnyBalance.trace('AB::find, input=' + rule);

			//if (typeof rule === 'string' || (typeof rule === 'object' && rule instanceof RegExp)) {
				_stack.push(function (rule, options) {
					_any = _transformContent(_any, typeof rule === 'string');
					if (typeof _any === 'string' && rule instanceof RegExp) {
						if (typeof options === 'object') {
							options.parts = true;
							_any = _any.matchRecursive(rule, options);
							_any = _any ? _any.inner : null;
						}
						else {
							_any = XRegExp.exec(_any, rule);
							if (typeof _any === 'object') {
								if (typeof options === 'number' || typeof options === 'string') {
									if (!(options in _any)) throw Error('Group "' + options + '" does not exist in regexp ' + rule);
									_any = _any[options];
								}
								else _any = _any.pop();
							}
						}
					}
				}.bind(this, rule, options));
				
			//} 
			//else throw TypeError('Unknown type of input');

			return this;
		},
		
		/**
		 * 
		 * @returns	{AB}
		 */
		htmlToText: function() {
			//AnyBalance.trace('htmlToText');
			return this;
		},

		// Публичные методы. Делают обработку (при необходимости) по цепочке правил и возвращают значение.
		// https://github.com/dukei/any-balance-providers/wiki/Manifest#counter

		/**
		 * 
		 * @returns {number}
		 */
		toNumeric: function() {
			//AnyBalance.trace('toNumeric');
			executeStack();

			var ret = parseBalance(_any);
			return ret;
		},

		/**
		 * 
		 * @returns {string}
		 */
		toText: function() {
			//AnyBalance.trace('toText');
			executeStack();
		},

		/**
		 * 
		 * @returns {string}
		 */
		toHtml: function() {
			//AnyBalance.trace('toText');
			executeStack();
		},

		/**
		 * 
		 * @returns {number}
		 */
		toTimeInterval: function() {
			executeStack();
		},

		/**
		 * 
		 * @returns {number}
		 */
		toTime: function() {
			executeStack();
		},

		/**
		 * 
		 * @returns {string}
		 */
		toCurrency: function() {
			executeStack();
		}
		
	}; //return
}