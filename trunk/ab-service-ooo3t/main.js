/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

var g_manifestIds = {
	'Алгебра': 'algebra',
	'Биология': 'biology',
	'География': 'geography',
	'Геометрия': 'geometry',
	'Изобразительное искусство': 'izo',
	'Иностранный язык': 'foreign',
	'Информатика': 'informatics',
	'История': 'history',
	'Классный час': 'class',
	'Литература': 'literature',
	'Музыка': 'music',
	'Обществознание': 'social_science',
	'Русский язык': 'russian',
	'Технология': 'tech',    
	'Физика': 'physics',    
	'Физическая культура': 'sport',
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://ooo3t.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	if(!prefs.login)
		throw new AnyBalance.Error('Введите логин!');
	if(!prefs.password)
		throw new AnyBalance.Error('Введите пароль!');
	
	var html = AnyBalance.requestPost(baseurl + 'webjournal/ed.php', {
		ServerSalt:'+^ооо3Т&',
		Password1:hex_md5(hex_orig_md5(utf8_decode(prefs.password))+'+^ооо3Т&'),
		Password2:hex_md5(hex_md5(prefs.password)+'+^ооо3Т&'),
		Login:prefs.login,
		TypedPassword:'',
		Week:'0',
		Task:'Book',
		Submit:'Войти',
    }, addHeaders({Referer: baseurl + 'webjournal/ed.php'}));
	
	if(!/"Relogin"/i.test(html)) {
		var error = getParam(html, null, null, /Ошибка авторизации:([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		if(error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    
    var period = prefs.period;
    
    html = AnyBalance.requestPost(baseurl + 'webjournal/ed.php', {
		'Week': '0',
        'Task': 'YearMarks'
    }, addHeaders({Referer: baseurl + 'webjournal/ed.php'}));
    
	var table = getParam(html, null, null, /(Оценки учащегося[\s\S]*?<\/table>)/i);
      
	
	var trs = sumParam(table, null, null, /(<tr[\s\S]*?<\/tr>)/ig);
    
    var result = {success: true};
    
    var subjects = [];
    var subjects = Object.keys(g_manifestIds);
    
    console.log(subjects.length);
    
    for(var i = 0; i < subjects.length; i++) {
        var current = subjects[i].toUpperCase();
        var markTr = getParam(trs[i], null, null, new RegExp('<tr[^]*' + current + '[\\s\\S]*?<\/tr>', 'i'));
        
        AnyBalance.trace('Текущий предмет: ' + current);
       
       
            // getParam(markTr, result, 'gg', /<td[\s\S]*?>([\s\S]*?){2}<\/td>/ig, replaceTagsAndSpaces, html_entity_decode); 
        
	}
    
    
    
	// var out = '';
	// for(i = 0; i < trs.length; i++) {
		// var curr = trs[i];
		// var day = getParam(curr, null, null, /<td[^>]*align="center"[^>]*rowspan[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
		
		// var lesson = getParam(curr, null, null, /(?:<td[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		// //var tema = getParam(curr, null, null, /(?:<td[^>]*>[\s\S]*?){2}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, html_entity_decode);
		// //var dz = getParam(curr, null, null, /(?:<td[^>]*>[\s\S]*?){3}([\s\S]*?)<\/td/i, replaceTagsAndSpaces, html_entity_decode);
		// var ocenka = getParam(curr, null, null, /(?:<td[^>]*>[\s\S]*?){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
		// if(day && day != '' || lesson && lesson != '')
			// out += (day ? '\n'+day : '') + lesson + (ocenka ? ': '+ocenka : (day ? '' : ': нет оценок') )+ '\n';
			
		// //out += (day ? day+'\n' : '') + lesson + tema + dz+'\n';
	// }
	
    // var result = {success: true, all:out.replace(/^\s+|\s+$/g, '')};
    AnyBalance.setResult(result);
}