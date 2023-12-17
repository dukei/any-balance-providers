var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

function main(){
	var baseurl = 'http://meteoclub.kz/';
	AnyBalance.setDefaultCharset('windows-1251');
	
    AnyBalance.trace('Подключаемся к http://meteoclub.kz/index.php...');
	
	var html = AnyBalance.requestGet(baseurl + 'index.php', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	}
    
    var result = {success: true};
	
	getParam(html, result, 'temperature', /Температура:([\s\S]*?)<\/TD>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'pressure', /Атмосферное давление:([\s\S]*?)<\/TD>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'wind', /Скорость ветра:([\s\S]*?)<\/TD>/i, replaceTagsAndSpaces, parseBalance);
	
	if(AnyBalance.isAvailable('time')) {
	    getParam(html, result, 'time', /измерение:([\s\S]*?)<\/TD>/i, [replaceTagsAndSpaces, /^(\d+:\d+)\s+(\d{1,2})\s+(\S+)\s+(\d{4})\s+(.*)/, '$2-$3-$4 $1', 
	    'января', '01', 'февраля', '02', 'марта', '03', 'апреля', '04', 'мая', '05', 'июня', '06', 
	    'июля', '07', 'августа', '08', 'сентября', '09', 'октября', '10', 'ноября', '11', 'декабря', '12'], parseDate);
	}
	
	result.__tariff = 'Караганда';
	
    AnyBalance.setResult(result);
}
