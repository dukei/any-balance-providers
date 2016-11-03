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

var MAX_TRAINS_COUNTERS = 5;
var g_baseurl = 'https://rasp.yandex.ru/';

function main () {
	var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.station_from, 'Введите станцию отправления!');
	checkEmpty(prefs.station_to, 'Введите станцию назначения!');

	AnyBalance.setDefaultCharset("utf-8");
	
	var html = AnyBalance.requestGet(g_baseurl, g_headers);
	
	var href = g_baseurl + 'search/' + "?fromName=" + 
	encodeURIComponent(prefs.station_from) + "&toName=" + 
	encodeURIComponent(prefs.station_to);
	
	if(/^\w+\d+$/.test(prefs.station_from))
		href += '&fromId=' + prefs.station_from;
	
	if(/^\w+\d+$/.test(prefs.station_to))
		href += '&toId=' + prefs.station_to;
	
	html = AnyBalance.requestGet(href, addHeaders({'Referer': g_baseurl}));
	var json = getJsonObject(html, /window.INITIAL_STATE\s*=\s*/);
	var dests = {
		to: 'Станция назначения',
		from: 'Станция отправления',
		point_not_found: 'Станция не найдена. Проверьте правильность написания или выберите другой город.'
	};

	if(!json.searchForm.from.key || !json.searchForm.to.key){
		if(json.searchForm.ambiguous && (json.searchForm.ambiguous.to || json.searchForm.ambiguous.from)){
			var ambs = {};
			for(var st in json.searchForm.ambiguous){
				var arr = [];
				for(var i=0; i<json.searchForm.ambiguous[st].length; ++i){
					var amb = json.searchForm.ambiguous[st][i];
					for(var j=0; j<amb.ambiguousTitle.title.length; ++j){
						arr.push('(' + amb.ambiguousTitle.title[j].key + ') ' + amb.ambiguousTitle.title[j].name + ', ' + amb.ambiguousTitle.additionalTitle);
					}
				}
				AnyBalance.trace('Для ' + dests[st] + ' найдены варианты:\n' + arr.join('\n'));
			}
			throw new AnyBalance.Error('Не удалось однозначно определить станцию для ' + json.searchForm[st].title + '. Укажите в настройках код станции вместо названия:\n' + arr.join('\n'), null, true);
		}
		if(json.searchForm.errors && json.searchForm.errors.length){
			AnyBalance.trace(JSON.stringify(json.searchForm.errors));
			for(var i=0; i<json.searchForm.errors.length; ++i){
				var error = json.searchForm.errors[i];
				var srcs = [];
				for(var j=0; j<error.fields.length; ++j){
					srcs.push(dests[error.fields[j]]);
				}
				var strText = 'Ошибка для ' + srcs.join(', ') + ': ' + (dests[error.type] || error.type);
				throw new AnyBalance.Error(strText, null, true);
			}
		}
		if(!json.searchForm.from.key)
			throw new AnyBalance.Error('Пункт отправления ' + json.searchForm.from.title + ' не найден. Проверьте правильность написания или выберите другой город.');
		if(!json.searchForm.to.key)
			throw new AnyBalance.Error('Пункт отправления ' + json.searchForm.to.title + ' не найден. Проверьте правильность написания или выберите другой город.');
	}

	if(!prefs.trains && !prefs.buses && !prefs.suburbans)
		prefs.suburbans = true; //По-умолчанию электрички включены

	var types = {
		bus: prefs.buses,
		suburban: prefs.suburbans,
		train: prefs.trains
	}

	var result = {success: true};

	var idx = 0;
	for(var i=0; i<json.search.segments.length; ++i){
		var segment = json.search.segments[i];
		var departure = new Date(parseDateISO(segment.departure));
		var time = n2(departure.getHours()) + ':' + n2(departure.getMinutes());
		var name = segment.transport.title + ' ' + segment.title + ' ' + time;

		if(!types[segment.transport.code]){
			AnyBalance.trace(name + ' не подходит под фильтр');
			continue;
		}
		if(segment.isGone){
			AnyBalance.trace(name + ' уже ушёл');
			continue;
		}
		
		AnyBalance.trace(name + ' подходит (' + (idx+1) + ')');

		var ftime = time;
		if(segment.transport.code == 'bus')
			ftime += ' (А)'; 
		if(segment.transport.code == 'train')
			ftime += ' (П)'; 

		getParam(ftime, result, 'train' + idx++);

		if(idx >= MAX_TRAINS_COUNTERS)
			break;
	}
	
	getParam(json.searchForm.from.title + ' - ' + json.searchForm.to.title + ', ' + json.searchForm.when.formatted, result, '__tariff');
	getParam(json.searchForm.from.title, result, 'start');
	getParam(json.searchForm.to.title, result, 'finish');
	
    AnyBalance.setResult(result);
}

