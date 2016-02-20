/*
var invalidHtml = {
	//input (broken)				//output (repaired)
	'<ul><li>1<li>2</ul>'		 : '<ul><li>1</li><li>2</li></ul>',
	'<p>1<b>2<i>3</b>4</i>5</p>' : '<p>1<b>2<i>3</i></b><i>4</i>5</p>',
	'<b>1<p>2</b>3</p>'			 : '<b>1</b><p><b>2</b>3</p>',
	'<p><i>1<p><i>2<p><i>3'		 : '<p><i>1</i></p>'+'<p><i><i>2</i></i></p>'+'<p><i><i><i>3</i></i></i></p>'
};
*/


/**
	http://www.w3.org/TR/css3-selectors/#selectors
 
 	Pattern					Meaning	
	E						an element of type E	
	E[foo]					an E element with a "foo" attribute	
	E[foo="bar"]			an E element whose "foo" attribute value is exactly equal to "bar"	
	E[foo~="bar"]			an E element whose "foo" attribute value is a list of whitespace-separated values, one of which is exactly equal to "bar"	
	E[foo^="bar"]			an E element whose "foo" attribute value begins exactly with the string "bar"
	E[foo$="bar"]			an E element whose "foo" attribute value ends exactly with the string "bar"	
	E[foo*="bar"]			an E element whose "foo" attribute value contains the substring "bar"	
	E[foo|="en"]			an E element whose "foo" attribute has a hyphen-separated list of values beginning (from the left) with "en"
	E:root					an E element, root of the document	
	E:nth-child(n)			an E element, the n-th child of its parent	
	E:nth-last-child(n)		an E element, the n-th child of its parent, counting from the last one	
	E:nth-of-type(n)		an E element, the n-th sibling of its type	
	E:nth-last-of-type(n)	an E element, the n-th sibling of its type, counting from the last one	
	E:first-child			an E element, first child of its parent	
	E:last-child			an E element, last child of its parent	
	E:first-of-type			an E element, first sibling of its type	
	E:last-of-type			an E element, last sibling of its type	
	E:only-child			an E element, only child of its parent	
	E:only-of-type			an E element, only sibling of its type	
	E:empty					an E element that has no children (including text nodes)	
	E:link
	E:visited				an E element being the source anchor of a hyperlink of which the target is not yet visited (:link) or already visited (:visited)	
	E:active
	E:hover
	E:focus					an E element during certain user actions	
	E:target				an E element being the target of the referring URI	
	E:lang(fr)				an element of type E in language "fr" (the document language specifies how language is determined)	
	E:enabled
	E:disabled				a user interface element E which is enabled or disabled	
	E:checked				a user interface element E which is checked (for instance a radio-button or checkbox)	
	E::first-line			the first formatted line of an E element	
	E::first-letter			the first formatted letter of an E element	
	E::before				generated content before an E element	
	E::after				generated content after an E element	
	E.warning				an E element whose class is "warning" (the document language specifies how class is determined).	
	E#myid					an E element with ID equal to "myid".	
	E:not(s)				an E element that does not match simple selector s	
	E F						an F element descendant of an E element	
	E > F					an F element child of an E element	
	E + F					an F element immediately preceded by an E element	
	E ~ F					an F element preceded by an E element	
**/

/* Автоматические тесты при помощи chai и mocha
 * https://learn.javascript.ru/testing
 */


describe("HTML", function() {

	describe("htmlTraversal()", function() {

		var s = `0000
				<ul ID = "news" title="&#x041D;&#x043E;&#x0432;&#x043E;&#x0441;&#x0442;&#x0438;"> 
					1111111
					<li> &#x041D;&#x043E;&#x0432;&#x043E;&#x0441;&#x0442;&#x0438; </li>
					2222222
				</ul>
				3333`;

		it(s, function() {
			//var r = htmlTraversal(sample.form);
			var r = htmlTraversal(s);
			console.log(JSON.stringify(r, null, 4));
		});
	});

});

describe("Slick.Parser", function() {

	var s = "A B ";
	var s = "#foo:contains('text') !>  bar.baz";

	it(s, function() {
		var r = Slick.parse(s);
		console.log(JSON.stringify(r, null, 4));

	});

});

describe("String", function() {

	describe("htmlAttrParser()", function() {
		
		it("test (form)", function() {
			var r = ` type="checkbox" 
						 xmlns:xalan =  
						class="button_forward" 
						onmouseover="$(this).addClass('button_forward-hover')" 
						Checked
						onmouseout='$(this).removeClass("button_forward-hover")' 
						value=&#1042;&#1086;&#1081;&#1090;&#1080;
						Id = "submitBtnId" 
						style=""`;
			r.htmlAttrParser(
				function(name, value, offset) {
					value = value.htmlEntityDecode(false).normalize().clean();
					console.log([name, value, offset]);
					return true;
				}
			);
		});
		
	});

	describe("htmlParser()", function() {

		it("test (ugly)", function() {
			sample.ugly.htmlParser(
				function(type, node, attrs, offset) {
					if (type === 'text') node = node.htmlEntityDecode(false).normalize().clean();
					//console.log([type, node, attrs, offset]);
					return true;
				}
			);
		});

		it("test (form)", function() {
			sample.form.htmlParser(
				function(type, node, attrs, offset) {
					if (type === 'text') node = node.htmlEntityDecode(false).normalize().clean();
					console.log([type, node, attrs, offset]);
					return true;
				}
			);
		});
		
		it("test (yandex)", function() {
			sample.yandex.htmlParser(
				function(type, node, attrs, offset) {
					if (type === 'text') node = node.htmlEntityDecode(false).normalize().clean();
					//console.log([type, node, attrs, offset]);
					return true;
				}
			);
		});
		
		it("test (mgts)", function() {
			sample.mgts.htmlParser(
				function(type, node, attrs, offset) {
					if (type === 'text') node = node.htmlEntityDecode(false).normalize().clean();
					//console.log([type, node, attrs, offset]);
					return true;
				}
			);
		});
		
		it("test (googledoc)", function() {
			sample.googledoc.htmlParser(
				function(type, node, attrs, offset) {
					if (type === 'text') node = node.htmlEntityDecode(false).normalize().clean();
					//console.log([type, node, attrs, offset]);
					return true;
				}
			);
		});
		
	});
	
	describe("getJsArrayOrObject()", function() {

		it("Захват объекта или массива из JavaScript в строку и её выполнение в JSON.parse()", function() {
			var n = sample.mgts.search(/\bmgts\.data\.widgets\b/);
			console.log('offset = ' + n);
			var r0 = sample.mgts.substring(n);
			console.log('input = ' + r0.length + ' chars');
			var r1 = r0.getJsArrayOrObject();
			console.log('output = ' + r1.length + ' chars');
			console.log(r1);
			var r2 = JSON.parse(r1);
			console.log(r2);
		});

		it("Захват объекта или массива из JavaScript в строку и её выполнение в eval()", function() {
			var r1 = sample.js.getJsArrayOrObject();
			console.log(r1);
			var r2 = Function('return ' + r1).apply(null);
			console.log(r2);
		});

	});			

	describe("htmlEntityDecode()", function() {

		it("Декодирование сущностей в URL", function() {
			var r = '&http://krawlly.com/vacancies/js.html?&amp=1&&#65=2&&#x65=3&amp;test=4'.htmlEntityDecode(false);
			console.log(r);
			assert.equal(r, '&http://krawlly.com/vacancies/js.html?&amp=1&A=2&e=3&test=4');
		});

	});			

	describe("htmlIndexOf()", function() {

		it("Смещение для <img />", function() {
			var r = '12345\n<img />***'.htmlIndexOf();
			console.log(r);
			assert.equal(r, 6);
		});

		it("Смещение для <!DOCTYPE>", function() {
			var r = sample.ugly.htmlIndexOf();
			console.log(r);
			assert.equal(r, 0);
		});

	});			

	describe("htmlToText()", function() {

		it("Вырезание всех тегов (yandex)", function() {
			var r = sample.yandex.htmlToText().clean();
			console.log(r);
			assert.equal(r, 'Яндекс\n\nСделать стартовой\n\nВойти в почту');
		});

		it("Вырезание всех тегов (ugly)", function() {
			var r = sample.ugly.htmlToText().clean();
			console.log(r);
			assert.equal(r, 'Личный кабинет провайдера\n\n"текущий тариф"\n\n(изменится с 01 числа следующего месяца)\n\n"текущий тариф"\n\n299 Promo\n\n"текущий баланс"\n\n−100.33 руб.\n\n"обещаный платёж"\n\n100 руб.\n\n"бонусных баллов"\n\n(бонусы не начисляются, если баланс<100!)\n\n77');
		});

		it("Вырезание всех тегов (form)", function() {
			var r = sample.form.htmlToText().clean();
			console.log(r);
			assert.equal(r, 'Для определения региона введите Ваш номер телефона.\n\nДля входа в систему включите JavaScript.\n\nНомер телефона:\n\nНапример, 9261110505');
		});

		it("Вырезание всех тегов (googledoc)", function() {
			var r = sample.googledoc.htmlToText().clean();
			console.log(r);
		});

		it("Вырезание всех тегов (mgts)", function() {
			var r = sample.mgts.htmlToText().clean();
			console.log(r);
		});

		it("Вырезание всех тегов (cat_svg)", function() {
			var r = sample.cat_svg.htmlToText().clean();
			console.log(r);
			assert.equal(r, '');
		});

	});

});

mocha.run();
