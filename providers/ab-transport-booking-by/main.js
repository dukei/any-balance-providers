/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
 */

var g_headers = {
	'Accept': '*/*',
	'Accept-Charset': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
	'Connection': 'keep-alive',
	'Host': 'pass.rw.by',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://rasp.rw.by';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.station_from, 'Введите пункт отправления!');
	checkEmpty(prefs.station_to, 'Введите пункт назначения!');
	checkEmpty(!prefs.date_trip || /^(\d\d\D\d\d\D\d\d\d\d)$/.test(prefs.date_trip), 'Введите дату в формате DD.MM.YYYY!');

	AnyBalance.restoreCookies();

	if (!prefs.date_trip) {
			dt = new Date();
	} else {
			var parts = prefs.date_trip.split(".");
			var dt = new Date(parseInt(parts[2], 10),
							parseInt(parts[1], 10) - 1,
							parseInt(parts[0], 10));
	}
	var curDate = new Date();
	var time = '00:00';
	if (getFormattedDate('YYYY-MM-DD', dt) == getFormattedDate('YYYY-MM-DD', curDate))
			time = getFormattedDate('HH:NN', curDate)
					if (prefs.station_from && prefs.station_to) {
							html = AnyBalance.requestGet(baseurl + '/m/ru/route/?path=ru%2Froute%2F&from=' + prefs.station_from + '&from_exp=0&from_esr=0&to=' + prefs.station_to + '&to_exp=&to_esr=&date=' + getFormattedDate('YYYY-MM-DD', dt) + '&s=mobile', {}, addHeaders({'Referer': baseurl }));
					}
					if (!html || AnyBalance.getLastStatusCode() > 400) {
							throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
					}
					checkEmpty(R98(html, '<div class="list_items">', '<div class="hidden train_details"'), 'Не удалось найти Список Поездов, сайт изменен?', true);
					var data = R98(html, '<div class="list_items">', '<div class="hidden train_details"');

	

	var res = data.split('class="list_item">');
	AnyBalance.trace(res.length);
	var result = {
			success: true
	};
	result.contakt = 105;
	var chec_end = 'Все поезда на дату:' + getFormattedDate('YYYY-MM-DD', dt) + '<br /><br />';
	for (var i = 1; i < res.length; i++) {
			item_text = R98(res[i], '<div class="list_text">', '</div>').replace('&nbsp;&mdash;', '');
			item_start = R98(res[i], '<div class="list_start">', '</div>');
			item_status = R98(res[i], '<span class="list_text_small">', '</span>');
			item_end = R98(res[i], '<div class="list_end">', '</div>').replace('<br />', '_');

			chec_end += "<br />Поезд: " + item_text + '<br />Дни курсирования: ' + item_status + '<br />Отпр. в: ' + item_start + '<br />Приб. в: ' + item_end + '<br /><br />';
	}
	result.other_trains = chec_end; //Записываем все поезда на Выбранную дату
	var tRain = prefs.train;
	//var tRain = '731Б';

			checkEmpty(R98(html, '<div class="hidden train_details" id="item_details_0">', '<script>'), 'Не удалось найти Список Поездов cо  свободными местами, сайт изменен?', true);
			var data_train = R98(html, '<div class="hidden train_details" id="item_details_0">', '<script>');
	var type_sv = 0,
	type_plats = 0,
	type_kupe = 0,
	type_sit = 0,
	type_common = 0,
	type_soft = 0,
	price_sv = '',
	price_plats = '',
	price_kupe = '',
	price_sit = '',
	price_soft = '',
	price_common = '',
	depart_station = '',
	arrival_station = '',
	tRain_id = ''; ;
	var res_train = data_train.split('<div class="b-about">');
	
	if (!tRain || data_train.indexOf(tRain) < 0) { //если поезд не выбран берем первый из списка
		AnyBalance.trace('Неудолось выбрать поезд с номером:'+tRain);
		result.train_id =  'В ведите в настройках № поезда: ['+R98(res_train[1], '<small class="train_id">', '</small>')+'] \nИ появиться дополнительные счетчики с остановками по пути следования  и количество свободных мест со стоимостью!!!';
			var depart = R98(res_train[1], '<div class="route_title">', '</div>').replace(/<\/?[^>]+>/g, '').trim();
			var depart_time = R98(res_train[1], '<div class="route_time">', '</div>').replace(/<\/?[^>]+>/g, '').trim();
			var arrivals = R98(res_train[1], '<div class="route_end">', '<div class="b-places">');
			var arrival = R98(arrivals, '<div class="route_title">', '</div>').replace(/<\/?[^>]+>/g, '').trim();
			var arrival_time = R98(arrivals, '<div class="route_time">', '</div>').replace(/<\/?[^>]+>/g, '').trim();
			result.depart_station = depart + ' ' + depart_time;
			result.arrival_station = arrival + ' ' + arrival_time;
			
			result.type_train = R98(res_train[1], '<div class="train_type">', '</div>').replace(/<\/?[^>]+>/g, '').trim();
		 
	} else {
			for (var k = 1; k < res_train.length; k++) {
								tRain_id = R98(res_train[k], '<small class="train_id">', '</small>');
				
					if (tRain_id == tRain) {//проверяем совпадения
						AnyBalance.trace('Поезд с номером: '+tRain+' Совподает с номером'+tRain_id);

							result.type_train = R98(res_train[k], '<div class="train_type">', '</div>').replace(/<\/?[^>]+>/g, '').trim();
							result.train_id =tRain_id;
							var depart = R98(res_train[k], '<div class="route_title">', '</div>').replace(/<\/?[^>]+>/g, '').trim();
							var depart_time = R98(res_train[k], '<div class="route_time">', '</div>').replace(/<\/?[^>]+>/g, '').trim();
							var arrivals = R98(res_train[k], '<div class="route_end">', '<div class="b-places">');
							var arrival = R98(arrivals, '<div class="route_title">', '</div>').replace(/<\/?[^>]+>/g, '').trim();
							var arrival_time = R98(arrivals, '<div class="route_time">', '</div>').replace(/<\/?[^>]+>/g, '').trim();
							result.depart_station = depart + ' ' + depart_time;
							result.arrival_station = arrival + ' ' + arrival_time;
							
							checkEmpty(R98(res_train[k], '<table class="places_table">', '</table>'), 'Не удалось найти Список свободных мест, сайт изменен?', true);
							var plases = R98(res_train[k], '<table class="places_table">', '</table>');
							var res_plases = plases.split('places_name');
							for (var j = 1; j < res_plases.length; j++) {
									places_name = R98(res_plases[j], '">', '</td>');
									switch (places_name) { //перебираем типы билетов
									case ("Общий"):
											result.type_common = R98(res_plases[j], '<td class="places_qty">', '</td>').replace(/<\/?[^>]+>/g, '').trim();
											result.price_common = R98(res_plases[j], '<td class="places_price">', '</td>').replace(/(<\/?[^>]+>|&nbsp;)/gm, '').trim();
											break;
									case ("Плацкартный"):
											result.type_plats = R98(res_plases[j], '<td class="places_qty">', '</td>').replace(/<\/?[^>]+>/g, '').trim();
											result.price_plats = R98(res_plases[j], '<td class="places_price">', '</td>').replace(/(<\/?[^>]+>|&nbsp;)/gm, '').trim();
											break;
									case ("Купе"):
											result.type_kupe = R98(res_plases[j], '<td class="places_qty">', '</td>').replace(/<\/?[^>]+>/g, '').trim();
											result.price_kupe = R98(res_plases[j], '<td class="places_price">', '</td>').replace(/(<\/?[^>]+>|&nbsp;)/gm, '').trim();
											break;
									case ("СВ"):
											result.type_sv = R98(res_plases[j], '<td class="places_qty">', '</td>').replace(/<\/?[^>]+>/g, '').trim();
											result.price_sv = R98(res_plases[j], '<td class="places_price">', '</td>').replace(/(<\/?[^>]+>|&nbsp;)/gm, '').trim();
											break;
									case ("Сидячий"):
											result.type_sit = R98(res_plases[j], '<td class="places_qty">', '</td>').replace(/<\/?[^>]+>/g, '').trim();
											result.price_sit = R98(res_plases[j], '<td class="places_price">', '</td>').replace(/(<\/?[^>]+>|&nbsp;)/gm, '').trim();
											break;
									case ("Мягкий"):
											result.type_soft = R98(res_plases[j], '<td class="places_qty">', '</td>').replace(/<\/?[^>]+>/g, '').trim();
											result.price_soft = R98(res_plases[j], '<td class="places_price">', '</td>').replace(/(<\/?[^>]+>|&nbsp;)/gm, '').trim();
											break;
									}
							}
							url_stops = R98(res_train[k], '<a href="', '" class="list_item">').replace(/<\/?[^>]+>/g, '').trim();
							html_stops = AnyBalance.requestGet(baseurl + url_stops, {}, addHeaders({
													'Referer': baseurl
											}));
						
							if (html_stops) {

									data_stops = R98(html_stops, '<ul class="list_items">', '</ul>');
									stops_res = data_stops.split('<li class="list_item">');
									var chec_stops = '';
									chec_stops =  "Станция : " +R98(stops_res[1], '<div class="list_text">', '</div>').replace(/<\/?[^>]+>/g, '').trim() + " Отпр. в: " + R98(stops_res[1], '<div class="list_end">', '</div>').replace(/<\/?[^>]+>/g, '').trim() + '<br /><br />';
									for (var b = 2; b < stops_res.length; b++) {
											stop_item = R98(stops_res[b], '<div class="list_text">', '</div>').replace(/<\/?[^>]+>/g, '').trim();
											stop_item_start = R98(stops_res[b], '<div class="list_start">', '</div>').replace(/(<\/?[^>]+>|&nbsp;)/gm, '').trim();
											stop_item_stop = R98(stops_res[b], '<div class="list_stop">', '</div>').replace(/<\/?[^>]+>/g, '').trim();
											stop_item_end = R98(stops_res[b], '<div class="list_end">', '</div>').replace(/<\/?[^>]+>/g, '').trim();
											chec_stops += "Станция: " +stop_item + "<br />Приб. в: " + stop_item_start + '<br /> Стоянка: ' + stop_item_stop + '<br /> Отпр. в: ' + stop_item_end + ',<br /><br />';
									}
									result.stops_train = chec_stops;
							}
					} else {
							continue;
						}
			}
	}
	AnyBalance.saveCookies();
	AnyBalance.saveData();
	AnyBalance.setResult(result);
}
function R98(s, l, r) {
	var i = s['indexOf'](l);
	if (i > -1) {
			s = s['substr'](i + l['length']);
			if (r) {
					i = s['indexOf'](r);
					if (i > -1) {
							s = s['substr'](0, i)
					}
			}
	} else {
			s = ''
	}
	return s
};
