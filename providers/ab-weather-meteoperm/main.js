/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий температура воздуха с сайта meteo.perm.ru
*/

function main(){
	AnyBalance.setDefaultCharset('UTF-8');
	
	var result = {success: true};
	AnyBalance.trace("Loading meteo.perm.ru");
	var html = AnyBalance.requestGet('http://meteo.perm.ru/current-data');

        if(!/<span class="big2">/i.test(html))
            throw new AnyBalance.Error('Не удаётся найти текущую температуру. Сайт изменен?');

	AnyBalance.trace("Parsing current temperature");
	var regexp = /[\s\S]*<span class="big2">([\s\S]*?)<\/span>/;
	var regexp1 = /[\s\S]*Ощущаемая температура[\s\S]*4">(.*?) &deg;C[\s\S]*Точка росы[\s\S]*<\//;
	var regexp2 = /[\s\S]*Точка росы[\s\S]*4">(.*?) &deg;C[\s\S]*Атмосферное давление[\s\S]*<\//;
	var regexp3 = /[\s\S]*Атмосферное давление[\s\S]*4">(.*?) мм рт[\s\S]*Относительная влажность воздуха[\s\S]*<\//;
	var regexp4 = /[\s\S]*Относительная влажность воздуха[\s\S]*4">(.*?) %[\s\S]*Скорость ветра[\s\S]*<\//;
	var regexp5 = /[\s\S]*Скорость ветра[\s\S]*4">(.*?) м\/с[\s\S]*Средняя скорость ветра за 10 минут[\s\S]*<\//;
	var regexp6 = /[\s\S]*Средняя скорость ветра за 10 минут[\s\S]*4">(.*?) м\/с[\s\S]*Скорость ветра в порывах за последний час[\s\S]*<\//;
	var regexp7 = /[\s\S]*Скорость ветра в порывах за последний час[\s\S]*4">(.*?) м\/с[\s\S]*Направление ветра[\s\S]*<\//;
	var regexp8 = /[\s\S]*Направление ветра[\s\S]*4">(.*?) <img width=15[\s\S]*Уровень осадков за день[\s\S]*<\//;
	var regexp9 = /[\s\S]*Уровень осадков за день[\s\S]*4">(.*?) мм[\s\S]*Уровень осадков за текущий дождь \(снегопад\)[\s\S]*<\//;
	var regexp10 = /[\s\S]*Уровень осадков за текущий дождь \(снегопад\)[\s\S]*4">(.*?) мм[\s\S]*Дата начала дождя \(снегопада\)[\s\S]*<\//;
	var regexp11 = /[\s\S]*Дата начала дождя \(снегопада\)[\s\S]*4">(.*?)<\/td>[\s\S]*Интенсивность осадков[\s\S]*<\//;
	var regexp12 = /[\s\S]*Интенсивность осадков[\s\S]*4">(.*?) мм\/час[\s\S]*Суммарная испаряемость за день[\s\S]*<\//;
	var regexp13 = /[\s\S]*Суммарная испаряемость за день[\s\S]*4">(.*?) мм[\s\S]*Интенсивность потока солнечного излучения[\s\S]*<\//;
	var regexp14 = /[\s\S]*Интенсивность потока солнечного излучения[\s\S]*4">(.*?) Вт\/м[\s\S]*Индекс ультрафиолетового излучения[\s\S]*<\//;
	var regexp15 = /[\s\S]*Индекс ультрафиолетового излучения[\s\S]*4">(.*?)<\/td>[\s\S]*Суточная доза ультрафиолетового излучения[\s\S]*<\//;
	var regexp16 = /[\s\S]*Суточная доза ультрафиолетового излучения[\s\S]*4">(.*?) МЭД[\s\S]*Дизайн[\s\S]*<\//;

        getParam(html, result, 'temperature', regexp, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'o_temp', regexp1, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'point_dew', regexp2, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'atm_davl', regexp3, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'otn_vl_vozd', regexp4, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'v_vetra', regexp5, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'sr_v_vetra_10', regexp6, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'sr_v_vetra_1', regexp7, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'napr_vetra', regexp8, replaceTagsAndSpaces);
	getParam(html, result, 'ur_osad_1', regexp9, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'ur_osad_tek', regexp10, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'date_osad', regexp11, replaceTagsAndSpaces);
	getParam(html, result, 'intens_osad', regexp12, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'sum_ispar', regexp13, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'intens_potoka', regexp14, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'index', regexp15, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'sut_doza', regexp16, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}
