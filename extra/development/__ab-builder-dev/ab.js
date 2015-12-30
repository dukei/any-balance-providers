/**
 * 
 * @param {string|number|object|null} any  description
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

	var	/**
		 * HTML detect
		 * @param {string} str
		 * @returns {number}	result of String.search()
		 */
		_getHtmlIndexOf = function(str) {
			/*
			Fast and short implementation.
			No needs to check closed tags, because they don't exist without opened tags
			No needs to check HTML entities, because it is ambiguous
			We use atomic group (trick with lookahead, capturing group and link after) to speed improve, significantly reduce backtracking!
			*/
			var ANY_WITH_EXCEPTIONS	= /(?= ([^>"']+) )\1/,
				IN_DOUBLE_QUOTES	= /" (?= ([^"]*) )\1 "/,
				IN_SINGLE_QUOTES	= /' (?= ([^']*) )\1 '/,
				OPENED_OR_DOCTYPE	= RegExp('<!?[a-zA-Z](?:' + XRegExp.union([ANY_WITH_EXCEPTIONS, IN_DOUBLE_QUOTES, IN_SINGLE_QUOTES], 'xs').source + ')*>'),
				CDATA	= /<!\[CDATA\[ .*? \]\]>/,
				COMMENT = /<!-- .*? -->/,
				ALL = XRegExp.union([OPENED_OR_DOCTYPE, CDATA, COMMENT], 'xs');
			return str.search(ALL);
		},

		/*
		function _htmlEntityDecodeRecursive(any, strict) {
			if ('string' === typeof any) return any.htmlEntityDecode(strict);
			if ('object' === typeof any) for (var prop in any) any[prop] = _htmlEntityDecodeRecursive(any[prop], strict);
			return any;
		}
		*/

		/**
		 * Детектирует и преобразовывает содержимое, при необходимости
		 * 
		 * @param {string|number|object|null} any
		 * @returns {string|number|object|null}
		 */
		_transformContent = function(any, allowTransformType) {
			if ('string' !== typeof any) return any;
			any = any.trim();

			var htmlIndexOf = _getHtmlIndexOf(any);
			if (htmlIndexOf === 0) return any; //это точно HTML, сразу катапультируемся

			//Если HTML не обнаружен и текст (который может быть JSON) оказался в атрибуте тега, необходимо декодировать HTML сущности
			if (htmlIndexOf === -1) any = any.htmlEntityDecode(false);

			if (! allowTransformType) return any;

			//JavaScript array/object detect
			var js = _getJsArrayOrObject(any),
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

		/**
		 * Ищет в коде JavaScript первый массив или объект и возвращет его.
		 * Или, другими словами, возвращает текст от первой скобки `[{` до последней `]}` с учётом вложенности.
		 * Может быть использован для поиска JSON, но это это частный случай.
		 * Скобки `()` внутри JS допускаются, т.к. могут использоваться именованные или анонимные функции, например: 
		 * `o = {f : (function(a, b){return someFunc(a+b)})}`
		 * 
		 * @param {string} str
		 * @returns {string|null}	Возвращает строку или `null`, если ничего не найдено
		 */
		_getJsArrayOrObject = function(str) {
			//http://hjson.org/
			//https://regex101.com/#javascript
			//http://blog.stevenlevithan.com/archives/match-innermost-html-element
			//We use atomic group (trick with lookahead, capturing group and link after) to speed improve, significantly reduce backtracking!
			var OPEN						= /([\{\[])/,	//group $1
				CLOSE						= /([\}\]])/,	//group $2
				ANY_WITH_EXCEPTIONS			= /(?= ([^\{\}\[\]"'`\/]+) )\1/,
				STRING_IN_DOUBLE_QUOTES		= /"				(?= ((?:[^"\\\r\n]+|\\.)*) )\1	"/,
				STRING_IN_SINGLE_QUOTES		= /'				(?= ((?:[^'\\\r\n]+|\\.)*) )\1	'/,
				STRING_IN_BACKTICK_QUOTES	= /`				(?= ((?:[^`\\]+    |\\.)*) )\1	`/,		//ECMA6+
				REGEXP_INLINE				= /\/	(?![\*\/])	(?= ((?:[^\/\\\r\n]+|\\[^\r\n])+) )\1	\/[gimy]{0,4}/,
				COMMENT_MULTILINE			= /\/\*				.*?								\*\//,
				COMMENT_SINGLELINE			= /\/\/				(?= ([^\r\n]*) )\1						/,
				ALL = XRegExp.union([
					OPEN,
					CLOSE,
					ANY_WITH_EXCEPTIONS,
					STRING_IN_DOUBLE_QUOTES,
					STRING_IN_SINGLE_QUOTES,
					STRING_IN_BACKTICK_QUOTES,
					REGEXP_INLINE,
					COMMENT_MULTILINE,
					COMMENT_SINGLELINE
				], 'xs');

			try {
				return str.matchRecursive(ALL, {open: 1, close: 2, parts: false});
			} catch(e) {
				return null;
			}			
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
		 * @param {string|RegExp} rule Для строки нужно передать CSS селектор
		 * @param {object} options Для строки нужно передать CSS селектор
		 * @returns AB
		 * @link http://jsonselect.org/#tryit
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
									if (!(options in _any)) throw Error('Group ' + options + ' does not exist in regexp ' + rule);
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
		 * @returns {AB}
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

/*
function AB(){
	var any;
	
	function find() {
		return AB(any);
	}
	
	return {
		any: any,
		
	};
}
*/