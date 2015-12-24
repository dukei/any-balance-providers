/**
 * 
 * @type undefined
 */
function AB(str) {
	"use strict";

	var AB = function (str) {
		var _any = str,		//{string|object}  В строке хранится HTML или сериализованный JSON. Объект получается после JSON.parse() или eval()
			_stack = [];	//массив функций для последовательного исполнения (с контекстом объекта AB)


		//Приватные методы

		function executeStack() {
			_stack.forEach(function (fun) {
				fun();
			});
		}

		/**
		 * Детектирует тип содержимого: text/plain, text/html, text/json
		 * 
		 * @param {string|Object} input
		 * @returns {number} TYPE_HTML, TYPE_JSON, TYPE_TEXT
		 */
		function _getConentType(input) {
			AnyBalance.trace('_getConentType');

		};
		
		function _getJSON(str, isGlobal) {
			//http://hjson.org/
			//https://regex101.com/#javascript
			//http://blog.stevenlevithan.com/archives/match-innermost-html-element
			//We use atomic group (trick with lookahead, capturing group and link after) to speed improve, significantly reduce backtracking!
			var OPEN						= /([\{\[])/,
				CLOSE						= /([\}\]])/,
				ANY_WITH_EXCEPTIONS			= /(?= ([^\{\}\[\]"'`\/]+) )\1/,
				STRING_IN_DOUBLE_QUOTES		= /"				(?= ((?:[^"\\\r\n]+|\\.)*)   )\1	"/,
				STRING_IN_SINGLE_QUOTES		= /'				(?= ((?:[^'\\\r\n]+|\\.)*)   )\1	'/,
				STRING_IN_BACKTICK_QUOTES	= /`				(?= ((?:[^`\\]+    |\\.)*)	  )\1	`/,		//ECMA6+
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
				], 'xs' + (isGlobal ? 'g' : ''));

			/*
			//uncomment JS (prettify purpose)
			str = str.replace(ALL, function() {
				return /^\/[\/\*]/.test(arguments[0]) ? '' : arguments[0];
			});
			*/
			return str.matchRecursive(ALL, {open: 1, close: 2, parts: true});
		}
		
		//Публичные методы
		
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

		this.htmlToText = function () {
			AnyBalance.trace('htmlToText');
			return this;
		}
		
		// Функции устанавливающие значение в result
		// https://github.com/dukei/any-balance-providers/wiki/Manifest#counter
		
		this.toText = function () {
			AnyBalance.trace('toText');
			executeStack();
		}

		this.toNumeric = function () {
			AnyBalance.trace('toNumeric');
			executeStack();

			var ret = parseBalance(_any);
			return ret;
		}
	};
	return new AB(str);
}