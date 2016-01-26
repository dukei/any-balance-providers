/**
 Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
 */

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection': 'keep-alive',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
    //для теста http://support.anybalance.ru/scp/tickets.php?id=4648
    //для теста http://bananawars.ru/index.php 

    var result = {success: true};
	//AB.setResult({success: true});
	
	//получаем ошибки: 
    AB(content3)
        //.find("table td:has(img[src$=error.gif]) + td")
		//.find(/\berror\.gif\b[\s\S]*?<td>([\s\S]*?)<\/td>/i, 1)
        .find(XRegExp('<table border=1 >(?<table>.*?)<\/table>', 'si'), 'table')
        .toText() //htmlToText(); htmlEntityDecode(); выполняем trim(); делаем приведение типа данных к строке.

    /*
	AB(html)
        .find("table td:has(img[src$=error.gif]) + td")
        .toText() //htmlToText(); htmlEntityDecode(); выполняем trim(); делаем приведение типа данных к строке.
	*/

    /*
	//счётчики, вариант 1
	
    html = AB(html).find("h3:contains(Характеристики) + table").toText();
    AB(html).find(/Уровень:\s+(\d+)/i).toNumeric("level1")		//получаем последний нумерованный карман (если карманов нет, то получаем всё совпадение); делаем приведение типа данных к целому числу
    AB(html).find(/(Уровень):\s+(\d+)/i, 2).toNumeric('level2')	//получаем и указываем нумерованный карман явно; делаем приведение типа данных к числу с плавающей запятой

    var json = {'k': 'v'};
    AB(json).find('');
	
	result.cards = [];
	var card = {};
	processCard(html, card);
	result.cards.push(card);

    //счётчики, вариант 2
    AB(html).find("span:contains(Уровень) + span").htmlToText().toNumeric(result, 'level');
    AB(html).find("span:contains(Деньги) + span").htmlToText().find(/\$(\d+)/).toNumeric(result, 'money');
	*/

    AnyBalance.setResult(result);
}

function cssSelector(html, rule) {
	//https://github.com/jquery/sizzle/blob/master/src/sizzle.js
	var SELECTORS = '#[a-z]';
}
