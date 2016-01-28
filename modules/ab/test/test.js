describe("String", function() {

	describe("getJsArrayOrObject()", function() {

		it("Захват объекта или массива из JavaScript в строку и её выполнение в eval()", function() {
			var r1 = sample.js.getJsArrayOrObject(),
				r2 = Function('return ' + r1).apply(null);
			console.log(r1);
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

	});			

});			

mocha.run();
