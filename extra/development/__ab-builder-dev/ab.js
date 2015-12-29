/**
 * 
 * @param {string|number|object|null} any  description
 */
function AB(any) {
	"use strict";

	var AB = function (str) {
		
		//Приватные переменные
		
		/**
		 * `string` -- хранит какой-либо текст (например, HTML или сериализованный JSON). 
		 * `object` -- результат выполнения `JSON.parse()` или `eval()`
		 * `null` -- если в результате выполнения `this.find()` ничего не нашлось
		 * 
		 * @type {string|object|null}
		 */
		var _any = str;
		
		/**
		 * Массив функций для последовательного исполнения (с контекстом объекта AB)
		 * 
		 * @type {array}
		 */
		var _stack = [];


		//Приватные методы

		function executeStack() {
			_stack.forEach(function (fun) {
				_any = _transformContent(_any, false);
				console.log(_any);
				fun();
			});
		}
		
		/**
		 * HTML detect
		 * @param {string} str
		 * @returns {number}	result of String.search()
		 */
		function _getHtmlIndexOf(str) {
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
		}
		
		/*
		function _htmlEntityDecodeRecursive(any, strict) {
			if ('string' === typeof any) return any.htmlEntityDecode(strict);
			if ('object' === typeof any) for (var prop in any) any[prop] = _htmlEntityDecodeRecursive(any[prop], strict);
			return any;
		}
		*/

		/**
		 * Детектирует и преобразовывает содержимое
		 * 
		 * @param {string|number|object|null} any
		 * @returns {string|number|object|null}
		 */
		function _transformContent(any, allowTransformType) {
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
		};

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
		function _getJsArrayOrObject(str) {
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
		}
		
		//Публичные методы. Задают правила обработки и выстраивают их в цепочку
		
		/**
		 * Фильтрует содержимое
		 * 
		 * @param {string|RegExp} input Для строки нужно передать CSS селектор
		 * @returns AB
		 * @link http://jsonselect.org/#tryit
		 */
		this.find = function (input) {
			AnyBalance.trace('AB::find, input=' + input);

			_stack.push(function () {
				if(typeof input == 'object' && input instanceof RegExp) {
					AnyBalance.trace('input is RegExp');
				} else if(typeof input == 'string') {
					AnyBalance.trace('input is String');
				} else 
					throw new AnyBalance.Error('Unknown type of input');
				
				AnyBalance.trace('find called from stack (processed): "' + input + '"');
			}.bind(this, input));
			return this;
		}

		/**
		 * 
		 * @returns {AB}
		 */
		this.htmlToText = function () {
			AnyBalance.trace('htmlToText');
			return this;
		}
		
		// Публичные методы. Делают обработку (при необходимости) по цепочке правил и возвращают значение.
		// https://github.com/dukei/any-balance-providers/wiki/Manifest#counter

		/**
		 * 
		 * @returns {number}
		 */
		this.toNumeric = function () {
			AnyBalance.trace('toNumeric');
			executeStack();

			var ret = parseBalance(_any);
			return ret;
		}
		
		/**
		 * 
		 * @returns {string}
		 */
		this.toText = function () {
			AnyBalance.trace('toText');
			executeStack();
		}
		
		/**
		 * 
		 * @returns {string}
		 */
		this.toHtml = function () {
			AnyBalance.trace('toText');
			executeStack();
		}

		/**
		 * 
		 * @returns {number}
		 */
		this.toTimeInterval = function() {
			executeStack();
		}

		/**
		 * 
		 * @returns {number}
		 */
		this.toTime = function() {
			executeStack();
		}
		
		/**
		 * 
		 * @returns {string}
		 */
		this.toCurrency = function() {
			executeStack();
		}
		
	};
	return new AB(any);
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