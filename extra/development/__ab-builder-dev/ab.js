/**
 * 
 * @type undefined
 */
function AB(str) {
	"use strict";

	var AB = function (str) {
		
		//Приватные переменные
		
		/**
		 * `string` -- хранит какой-либо текст (например, HTML или сериализованный JSON). 
		 * `object` -- результат выполнения JSON.parse() или eval()
		 * `null` -- если в результате выполнения this.find() ничего не нашлось
		 * 
		 * @type {string|object|null}
		 */
		var _any = str;		//  
		
		/**
		 * Массив функций для последовательного исполнения (с контекстом объекта AB)
		 * 
		 * @type {array}
		 */
		var _stack = [];


		//Приватные методы

		function executeStack() {
			_stack.forEach(function (fun) {
				fun();
			});
		}

		/**
		 * Детектирует тип содержимого: text/html, text/json, text/plain
		 * 
		 * @param {string|Object} input
		 * @returns {number} TYPE_HTML, TYPE_JSON, TYPE_TEXT
		 */
		function _getConentType(input) {
			AnyBalance.trace('_getConentType');
			
		};

		/**
		 * Ищет в коде JavaScript массив или объект и возвращет его.
		 * Или, другими словами, возвращает текст от первой скобки `[{` до последней `]}` с учётом вложенности.
		 * Может быть использован для поиска JSON, но это это частный случай.
		 * 
		 * @param {string} str
		 * @returns {string|null}	Возвращает строку или `null`, если ничего не найдено
		 */
		function _getJsArrayOrObject(str) {
			//http://hjson.org/
			//https://regex101.com/#javascript
			//http://blog.stevenlevithan.com/archives/match-innermost-html-element
			//We use atomic group (trick with lookahead, capturing group and link after) to speed improve, significantly reduce backtracking!
			var OPEN						= /([\{\[])/,	//карман $1
				CLOSE						= /([\}\]])/,	//карман $2
				ANY_WITH_EXCEPTIONS			= /(?= ([^\{\}\[\]"'`\/]+) )\1/,
				STRING_IN_DOUBLE_QUOTES		= /"				(?= ((?:[^"\\\r\n]+|\\.)*)   )\1	"/,
				STRING_IN_SINGLE_QUOTES		= /'				(?= ((?:[^'\\\r\n]+|\\.)*)   )\1	'/,
				STRING_IN_BACKTICK_QUOTES	= /`				(?= ((?:[^`\\]+    |\\.)*)	 )\1	`/,		//ECMA6+
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
		 * @param {string|RegExp} Для строки нужно передать CSS селектор
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
	return new AB(str);
}