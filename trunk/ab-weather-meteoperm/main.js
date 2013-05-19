/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий температура воздуха с сайта meteo.perm.ru
*/

function main(){
	AnyBalance.setDefaultCharset('UTF-8');
	
	var result = {success: true};
	AnyBalance.trace("Loading meteo.perm.ru");
	var html = AnyBalance.requestGet('http://meteo.perm.ru/current-data');
	
	AnyBalance.trace("Parsing current temperature");
	var regexp = /[\s\S]*<span class="big2"><strong>(.*?) &deg;C<\/strong>[\s\S]*<\//;
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

	result.temperature = parseFloat(html.match(regexp)[1]);
	result.o_temp = parseFloat(html.match(regexp1)[1]);
	result.point_dew = parseFloat(html.match(regexp2)[1]);
	result.atm_davl = parseFloat(html.match(regexp3)[1]);
	result.otn_vl_vozd = parseFloat(html.match(regexp4)[1]);
	result.v_vetra = parseFloat(html.match(regexp5)[1]);
	result.sr_v_vetra_10 = parseFloat(html.match(regexp6)[1]);
	result.sr_v_vetra_1 = parseFloat(html.match(regexp7)[1]);
	result.napr_vetra = String(html.match(regexp8)[1]);
	result.ur_osad_1 = parseFloat(html.match(regexp9)[1]);
	result.ur_osad_tek = parseFloat(html.match(regexp10)[1]);
	result.date_osad = String(html.match(regexp11)[1]);
	result.intens_osad = parseFloat(html.match(regexp12)[1]);
	result.sum_ispar = parseFloat(html.match(regexp13)[1]);
	result.intens_potoka = parseFloat(html.match(regexp14)[1]);
	result.index = parseFloat(html.match(regexp15)[1]);
	result.sut_doza = parseFloat(html.match(regexp16)[1]);
	
	AnyBalance.setResult(result);
}
