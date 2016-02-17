/*
var invalidHtml = {
	//input (broken)				//output (repaired)
	'<p>1<b>2<i>3</b>4</i>5</p>' : '<p>1<b>2<i>3</i></b><i>4</i>5</p>',
	'<b>1<p>2</b>3</p>'			 : '<b>1</b><p><b>2</b>3</p>',
	'<p><i>1<p><i>2<p><i>3'		 : '<p><i>1</i></p>'+'<p><i><i>2</i></i></p>'+'<p><i><i><i>3</i></i></i></p>'
};
*/

/* Автоматические тесты при помощи chai и mocha
 * https://learn.javascript.ru/testing
 */
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
					//console.log([type, node, attrs, offset]);
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

	});

});

mocha.run();
